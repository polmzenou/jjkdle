"use server";

import { getCurrentUser } from "@/lib/auth/session";
import {
  getCurrentUniverse,
  revalidateUniversePath,
} from "@/lib/universes/current";
import { prisma } from "@/lib/prisma";
import { DECK_SIZE, sanitizeDeck } from "@/lib/cards/deck";
import {
  getOwnedCharacterIds,
  openBooster,
  sellCard,
} from "@/lib/cards/store";
import type { OpenedBooster } from "@/lib/cards/types";

/**
 * Server actions du joueur sur ses CARTES (ouverture de booster, deck, revente).
 *
 * Mêmes garanties que `./actions.ts` : rien n'est cru sur parole côté client.
 * Chaque écriture re-vérifie la possession réelle et l'appartenance à l'univers
 * courant, puis revalide `/account/deck` ET le profil public (le deck y est
 * exposé comme les badges).
 */

export type ActionResult = { ok: boolean; error?: string };

/** Revalide les deux pages où le deck est visible. */
async function revalidateDeck(username: string): Promise<void> {
  await revalidateUniversePath("/account/deck");
  await revalidateUniversePath(`/u/${encodeURIComponent(username)}`);
}

/**
 * Ouvre un booster en attente et distribue son contenu.
 *
 * L'idempotence est garantie en base (`openBooster` réclame la ligne via un
 * `updateMany` conditionné à `openedAt: null`) : un double clic renvoie une
 * erreur explicite plutôt que de tirer deux fois les cartes.
 */
export async function openBoosterAction(
  boosterId: string,
): Promise<ActionResult & { result?: OpenedBooster }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Connecte-toi pour ouvrir un booster." };
  if (typeof boosterId !== "string" || !boosterId) {
    return { ok: false, error: "Booster inconnu." };
  }

  const result = await openBooster(user.id, boosterId);
  if (!result) {
    return { ok: false, error: "Ce booster a déjà été ouvert." };
  }

  await revalidateDeck(user.username);
  return { ok: true, result };
}

/**
 * Équipe une carte dans le deck de l'univers courant.
 *
 * Le deck est relu, nettoyé (`sanitizeDeck` retire les ids devenus fantômes)
 * puis complété : on ne fait jamais confiance au tableau stocké, ce qui évite
 * qu'une carte vendue entre-temps continue d'occuper un slot.
 */
export async function equipCardAction(
  characterId: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Connecte-toi pour équiper une carte." };

  const universe = await getCurrentUniverse();
  const owned = await getOwnedCharacterIds(user.id, universe.id);

  // Possession ET appartenance à l'univers sont vérifiées d'un coup :
  // `getOwnedCharacterIds` filtre déjà sur `character.universeId`.
  if (!owned.has(characterId)) {
    return { ok: false, error: "Tu ne possèdes pas cette carte." };
  }

  const profile = await prisma.userUniverseProfile.findUnique({
    where: { userId_universeId: { userId: user.id, universeId: universe.id } },
    select: { deckCharacterIds: true },
  });
  const current = sanitizeDeck(profile?.deckCharacterIds ?? [], owned);

  if (current.includes(characterId)) return { ok: true };
  if (current.length >= DECK_SIZE) {
    return {
      ok: false,
      error: `Ton deck est plein (${DECK_SIZE} cartes). Retires-en une d'abord.`,
    };
  }

  await prisma.userUniverseProfile.upsert({
    where: { userId_universeId: { userId: user.id, universeId: universe.id } },
    create: {
      userId: user.id,
      universeId: universe.id,
      deckCharacterIds: [characterId],
    },
    update: { deckCharacterIds: [...current, characterId] },
  });

  await revalidateDeck(user.username);
  return { ok: true };
}

/** Retire une carte du deck de l'univers courant (la carte reste possédée). */
export async function unequipCardAction(
  characterId: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Connecte-toi pour modifier ton deck." };

  const universe = await getCurrentUniverse();
  const profile = await prisma.userUniverseProfile.findUnique({
    where: { userId_universeId: { userId: user.id, universeId: universe.id } },
    select: { deckCharacterIds: true },
  });
  if (!profile) return { ok: true };

  await prisma.userUniverseProfile.update({
    where: { userId_universeId: { userId: user.id, universeId: universe.id } },
    data: {
      deckCharacterIds: profile.deckCharacterIds.filter(
        (id) => id !== characterId,
      ),
    },
  });

  await revalidateDeck(user.username);
  return { ok: true };
}

/**
 * Revend une carte contre les coins de sa rareté. La carte est PERDUE, même si
 * elle n'était pas en doublon — et retirée du deck au passage (`sellCard`).
 */
export async function sellCardAction(
  characterId: string,
): Promise<ActionResult & { coins?: number }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Connecte-toi pour vendre une carte." };

  const universe = await getCurrentUniverse();
  const res = await sellCard(user.id, characterId, universe.id);
  if (!res.ok) return { ok: false, ...(res.error ? { error: res.error } : {}) };

  await revalidateDeck(user.username);
  return { ok: true, coins: res.coins };
}
