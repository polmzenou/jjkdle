import "server-only";
import { prisma } from "@/lib/prisma";
import { getRoster } from "@/lib/content/queries";
import { areFriends } from "@/lib/social/friends";
import type { SpareCard, TradeLine, TradeView } from "@/lib/social/types";
import {
  addCopies,
  getOwnedCounts,
  removeSpareCopies,
  toCardView,
} from "./store";
import {
  MAX_PENDING_TRADES,
  normalizeTradeMessage,
  validateTradeLines,
  type TradeLineInput,
} from "./trade";

/**
 * Couche d'accès aux OFFRES D'ÉCHANGE. Les règles pures vivent dans
 * `./trade.ts` ; ici on les applique à l'état en base — à la création ET à
 * l'acceptation, car les compteurs ont pu bouger entre les deux.
 */

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** Levée dans la transaction d'acceptation pour forcer le rollback. */
class StaleTradeError extends Error {}

/** Doublons échangeables d'un joueur dans un univers, du plus rare au plus commun. */
export async function getSpareCards(
  userId: string,
  universeId: string,
): Promise<SpareCard[]> {
  const [roster, counts] = await Promise.all([
    getRoster(universeId),
    getOwnedCounts(userId, universeId),
  ]);
  return roster
    .filter((c) => (counts.get(c.id) ?? 0) > 1)
    .map((c) => ({ ...toCardView(c), spare: counts.get(c.id)! - 1 }));
}

/** Doublons d'un AMI (refusé si les deux comptes ne sont pas amis). */
export async function getFriendSpareCards(
  me: string,
  friendId: string,
  universeId: string,
): Promise<SpareCard[] | null> {
  if (!(await areFriends(me, friendId))) return null;
  return getSpareCards(friendId, universeId);
}

/** Crée une offre : je donne `give`, je demande `take` à `toUserId`. */
export async function createTrade(
  me: string,
  toUserId: string,
  universeId: string,
  give: TradeLineInput[],
  take: TradeLineInput[],
  rawMessage: unknown,
): Promise<Result<{ id: string }>> {
  if (!(await areFriends(me, toUserId))) {
    return { ok: false, error: "Tu ne peux échanger qu'avec tes amis." };
  }

  const [roster, myCounts, theirCounts, pendingSent, other] = await Promise.all([
    getRoster(universeId),
    getOwnedCounts(me, universeId),
    getOwnedCounts(toUserId, universeId),
    prisma.tradeOffer.count({ where: { fromUserId: me, status: "PENDING" } }),
    prisma.user.findUnique({ where: { id: toUserId }, select: { username: true } }),
  ]);
  if (pendingSent >= MAX_PENDING_TRADES) {
    return { ok: false, error: `Tu as déjà ${MAX_PENDING_TRADES} offres en attente.` };
  }

  const ids = new Set(roster.map((c) => c.id));
  const giveCheck = validateTradeLines(give, myCounts, ids, "Tu");
  if (!giveCheck.ok) return giveCheck;
  const takeCheck = validateTradeLines(take, theirCounts, ids, other?.username ?? "Ton ami");
  if (!takeCheck.ok) return takeCheck;

  const row = await prisma.tradeOffer.create({
    data: {
      fromUserId: me,
      toUserId,
      universeId,
      message: normalizeTradeMessage(rawMessage),
      items: {
        create: [
          ...[...giveCheck.lines].map(([characterId, quantity]) => ({
            side: "GIVE" as const,
            characterId,
            quantity,
          })),
          ...[...takeCheck.lines].map(([characterId, quantity]) => ({
            side: "TAKE" as const,
            characterId,
            quantity,
          })),
        ],
      },
    },
    select: { id: true },
  });
  return { ok: true, id: row.id };
}

/**
 * Accepte une offre REÇUE.
 *
 * Tout se passe dans UNE transaction : réclamation de l'offre (`PENDING →
 * ACCEPTED`, gardée — un double clic ne l'exécute qu'une fois), retrait gardé
 * des doublons des deux côtés, puis ajout croisé. Si un doublon a disparu
 * entre-temps (vendu, fusionné, échangé ailleurs), tout est annulé et l'offre
 * passe en FAILED.
 */
export async function acceptTrade(
  me: string,
  offerId: string,
): Promise<Result<{ fromUserId: string }>> {
  const offer = await prisma.tradeOffer.findFirst({
    where: { id: offerId, toUserId: me, status: "PENDING" },
    select: { fromUserId: true, items: true },
  });
  if (!offer) return { ok: false, error: "Cette offre n'est plus disponible." };
  if (!(await areFriends(me, offer.fromUserId))) {
    return { ok: false, error: "Vous n'êtes plus amis." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.tradeOffer.updateMany({
        where: { id: offerId, toUserId: me, status: "PENDING" },
        data: { status: "ACCEPTED", resolvedAt: new Date() },
      });
      if (claimed.count !== 1) throw new StaleTradeError("claimed");

      for (const item of offer.items) {
        const owner = item.side === "GIVE" ? offer.fromUserId : me;
        if (!(await removeSpareCopies(tx, owner, item.characterId, item.quantity))) {
          throw new StaleTradeError("copies");
        }
      }
      for (const item of offer.items) {
        const receiver = item.side === "GIVE" ? me : offer.fromUserId;
        await addCopies(tx, receiver, item.characterId, item.quantity);
      }
    });
  } catch (err) {
    if (!(err instanceof StaleTradeError)) throw err;
    if (err.message === "claimed") {
      return { ok: false, error: "Cette offre n'est plus disponible." };
    }
    await prisma.tradeOffer.updateMany({
      where: { id: offerId, status: "PENDING" },
      data: { status: "FAILED", resolvedAt: new Date() },
    });
    return {
      ok: false,
      error: "L'offre n'est plus valide : un des doublons n'est plus disponible.",
    };
  }

  return { ok: true, fromUserId: offer.fromUserId };
}

/** Refuse une offre reçue. */
export async function declineTrade(
  me: string,
  offerId: string,
): Promise<Result<{ fromUserId: string }>> {
  const offer = await prisma.tradeOffer.findFirst({
    where: { id: offerId, toUserId: me },
    select: { fromUserId: true },
  });
  const res = await prisma.tradeOffer.updateMany({
    where: { id: offerId, toUserId: me, status: "PENDING" },
    data: { status: "DECLINED", resolvedAt: new Date() },
  });
  return res.count === 1 && offer
    ? { ok: true, fromUserId: offer.fromUserId }
    : { ok: false, error: "Cette offre n'est plus disponible." };
}

/** Annule une offre envoyée. */
export async function cancelTrade(
  me: string,
  offerId: string,
): Promise<Result<{ toUserId: string }>> {
  const offer = await prisma.tradeOffer.findFirst({
    where: { id: offerId, fromUserId: me },
    select: { toUserId: true },
  });
  const res = await prisma.tradeOffer.updateMany({
    where: { id: offerId, fromUserId: me, status: "PENDING" },
    data: { status: "CANCELLED", resolvedAt: new Date() },
  });
  return res.count === 1 && offer
    ? { ok: true, toUserId: offer.toUserId }
    : { ok: false, error: "Cette offre n'est plus disponible." };
}

/** Offres en attente + les 20 dernières résolues, du point de vue de `me`. */
export async function listTrades(me: string): Promise<TradeView[]> {
  const select = {
    id: true,
    fromUserId: true,
    toUserId: true,
    universeId: true,
    status: true,
    message: true,
    createdAt: true,
    resolvedAt: true,
    items: { select: { side: true, characterId: true, quantity: true } },
    fromUser: { select: { username: true } },
    toUser: { select: { username: true } },
  } as const;
  const mine = { OR: [{ fromUserId: me }, { toUserId: me }] };

  const [pending, history] = await Promise.all([
    prisma.tradeOffer.findMany({
      where: { ...mine, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select,
    }),
    prisma.tradeOffer.findMany({
      where: { ...mine, status: { not: "PENDING" } },
      orderBy: { resolvedAt: "desc" },
      take: 20,
      select,
    }),
  ]);
  const rows = [...pending, ...history];

  const universeIds = [...new Set(rows.map((r) => r.universeId))];
  const [universes, rosters] = await Promise.all([
    prisma.universe.findMany({
      where: { id: { in: universeIds } },
      select: { id: true, name: true },
    }),
    Promise.all(universeIds.map((id) => getRoster(id))),
  ]);
  const nameById = new Map(universes.map((u) => [u.id, u.name]));
  const characters = new Map(rosters.flat().map((c) => [c.id, c]));

  return rows.map((r) => {
    const outgoing = r.fromUserId === me;
    const lines = (side: "GIVE" | "TAKE"): TradeLine[] =>
      r.items.flatMap((item) => {
        const character = characters.get(item.characterId);
        return item.side === side && character
          ? [{ ...toCardView(character), quantity: item.quantity }]
          : [];
      });
    // GIVE = de l'auteur vers le destinataire : c'est ce que JE donne si je suis l'auteur.
    return {
      id: r.id,
      outgoing,
      otherId: outgoing ? r.toUserId : r.fromUserId,
      otherUsername: outgoing ? r.toUser.username : r.fromUser.username,
      status: r.status,
      universeId: r.universeId,
      universeName: nameById.get(r.universeId) ?? "",
      message: r.message,
      give: lines(outgoing ? "GIVE" : "TAKE"),
      receive: lines(outgoing ? "TAKE" : "GIVE"),
      createdAt: r.createdAt.toISOString(),
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
    };
  });
}
