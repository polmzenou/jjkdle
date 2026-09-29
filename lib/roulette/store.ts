import "server-only";
import { prisma } from "@/lib/prisma";
import { creditCoins, debitCoins } from "@/lib/coins";
import { getRoster } from "@/lib/content/queries";
import { createBooster, grantCard, toCardView } from "@/lib/cards/store";
import {
  FREE_SPIN_COOLDOWN_MS,
  PAID_SPIN_PRICE,
  ROULETTE_SLOTS,
  msUntilFreeSpin,
  pickSlot,
  type RouletteSlot,
} from "./prizes";
import type { RouletteState, SpinOutcome } from "./types";

/**
 * Couche d'accès de la ROULETTE. Module server-only.
 *
 * Le client ne décide de rien : il demande « un tour (gratuit|payant) », le
 * serveur vérifie le droit, tire la case, livre le lot, et renvoie l'index sur
 * lequel la roue doit s'arrêter. L'animation n'est qu'une mise en scène d'un
 * résultat déjà acquis — fermer l'onglet pendant qu'elle tourne ne perd rien.
 */

export type SpinResult =
  | { ok: true; outcome: SpinOutcome }
  | { ok: false; error: string };

// ──────────────────────────────────────────────────────────────────────────
// Lecture
// ──────────────────────────────────────────────────────────────────────────

export async function getRouletteState(
  userId: string,
  universeId: string,
): Promise<RouletteState> {
  const [profile, last] = await Promise.all([
    prisma.userUniverseProfile.findUnique({
      where: { userId_universeId: { userId, universeId } },
      select: { lastFreeSpinAt: true },
    }),
    prisma.rouletteSpin.findFirst({
      where: { userId, universeId },
      orderBy: { createdAt: "desc" },
      select: {
        slotId: true,
        coinsWon: true,
        characterId: true,
        paid: true,
        createdAt: true,
      },
    }),
  ]);

  const cardName = last?.characterId
    ? ((
        await prisma.character.findUnique({
          where: { id: last.characterId },
          select: { name: true },
        })
      )?.name ?? null)
    : null;

  return {
    msUntilFree: msUntilFreeSpin(profile?.lastFreeSpinAt),
    lastWin: last
      ? {
          slotId: last.slotId,
          coinsWon: last.coinsWon,
          cardName,
          paid: last.paid,
          createdAt: last.createdAt.toISOString(),
        }
      : null,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Tour
// ──────────────────────────────────────────────────────────────────────────

/**
 * Réserve le tour GRATUIT de l'univers. Le `updateMany` conditionné à la date
 * est la garde d'idempotence (même motif que `openBooster`) : deux requêtes
 * simultanées ne peuvent pas passer toutes les deux, la seconde ne matche plus.
 *
 * @returns la date posée (pour pouvoir annuler le claim), ou null si refusé.
 */
async function claimFreeSpin(
  userId: string,
  universeId: string,
): Promise<Date | null> {
  // La ligne de profil peut ne pas exister (joueur qui n'a jamais rien équipé).
  await prisma.userUniverseProfile.upsert({
    where: { userId_universeId: { userId, universeId } },
    create: { userId, universeId },
    update: {},
  });

  const now = new Date();
  const res = await prisma.userUniverseProfile.updateMany({
    where: {
      userId,
      universeId,
      OR: [
        { lastFreeSpinAt: null },
        { lastFreeSpinAt: { lte: new Date(now.getTime() - FREE_SPIN_COOLDOWN_MS) } },
      ],
    },
    data: { lastFreeSpinAt: now },
  });
  return res.count === 1 ? now : null;
}

/** Livre le lot d'une case. Lève si la base est indisponible. */
async function deliver(
  userId: string,
  universeId: string,
  slot: RouletteSlot,
): Promise<Pick<SpinOutcome, "coinsWon" | "boosterId" | "card">> {
  switch (slot.kind) {
    case "coins":
      await creditCoins(userId, slot.amount);
      return { coinsWon: slot.amount };

    case "booster": {
      const booster = await createBooster(userId, universeId, slot.booster, "roulette");
      return { coinsWon: 0, boosterId: booster.id };
    }

    case "card": {
      // N'IMPORTE quelle carte de l'univers, possédée ou non, toutes raretés
      // confondues à probabilité égale. Doublon → valeur de revente, comme un
      // booster.
      const roster = await getRoster(universeId);
      if (roster.length === 0) {
        // Roster vide : on ne laisse pas le joueur sans rien.
        await creditCoins(userId, PAID_SPIN_PRICE);
        return { coinsWon: PAID_SPIN_PRICE };
      }
      const character = roster[Math.floor(Math.random() * roster.length)]!;
      const view = toCardView(character);
      const { created } = await grantCard(userId, character.id);
      const coins = created ? 0 : view.sellValue;
      if (coins > 0) await creditCoins(userId, coins);
      return { coinsWon: coins, card: { ...view, duplicate: !created } };
    }
  }
}

/**
 * Un tour de roue.
 *
 * - gratuit : refusé tant que les 5 h ne sont pas écoulées dans CET univers ;
 * - payant : refusé si le tour gratuit est disponible (on ne fait pas payer ce
 *   qui est offert), sinon débit ATOMIQUE de 100 coins d'abord.
 *
 * Si la livraison échoue, la contrepartie est rendue (coins remboursés, ou
 * tour gratuit re-disponible) : on ne prend rien sans livrer.
 */
export async function spinRoulette(
  userId: string,
  universeId: string,
  paid: boolean,
): Promise<SpinResult> {
  let claimedAt: Date | null = null;

  if (paid) {
    const profile = await prisma.userUniverseProfile.findUnique({
      where: { userId_universeId: { userId, universeId } },
      select: { lastFreeSpinAt: true },
    });
    if (msUntilFreeSpin(profile?.lastFreeSpinAt) === 0) {
      return { ok: false, error: "Ton tour gratuit est disponible : utilise-le d'abord." };
    }
    if (!(await debitCoins(userId, PAID_SPIN_PRICE))) {
      return { ok: false, error: "Tu n'as pas assez de coins." };
    }
  } else {
    claimedAt = await claimFreeSpin(userId, universeId);
    if (!claimedAt) {
      return { ok: false, error: "Ton tour gratuit n'est pas encore rechargé." };
    }
  }

  const index = pickSlot();
  const slot = ROULETTE_SLOTS[index]!;

  let delivered: Awaited<ReturnType<typeof deliver>>;
  try {
    delivered = await deliver(userId, universeId, slot);
  } catch {
    if (paid) await creditCoins(userId, PAID_SPIN_PRICE);
    else if (claimedAt) {
      // Ne rend le tour que si personne ne l'a re-réservé entre-temps.
      await prisma.userUniverseProfile.updateMany({
        where: { userId, universeId, lastFreeSpinAt: claimedAt },
        data: { lastFreeSpinAt: null },
      });
    }
    return { ok: false, error: "La roue s'est bloquée. Rien n'a été perdu, réessaie." };
  }

  // Journal : un échec d'écriture ici ne doit pas annuler un lot déjà livré.
  await prisma.rouletteSpin
    .create({
      data: {
        userId,
        universeId,
        slotId: slot.id,
        paid,
        coinsWon: delivered.coinsWon,
        boosterId: delivered.boosterId ?? null,
        characterId: delivered.card?.characterId ?? null,
      },
    })
    .catch(() => undefined);

  const profile = await prisma.userUniverseProfile.findUnique({
    where: { userId_universeId: { userId, universeId } },
    select: { lastFreeSpinAt: true },
  });

  return {
    ok: true,
    outcome: {
      slotIndex: index,
      slotId: slot.id,
      paid,
      ...delivered,
      msUntilFree: msUntilFreeSpin(profile?.lastFreeSpinAt),
    },
  };
}
