import "server-only";
import { prisma } from "@/lib/prisma";
import { userDecor, userDecorSelect } from "@/lib/leaderboard/store";
import type { FriendRequestView, FriendView } from "./types";

/**
 * Système d'AMIS. Les amitiés sont GLOBALES (comme le compte) : un ami l'est
 * dans tous les univers. Une seule ligne `Friendship` par paire, dans le sens
 * de la demande ; refuser ou retirer un ami supprime la ligne.
 *
 * Le contrôle d'accès (`getCurrentUser`) est fait en amont par les server
 * actions ; ici `me` est toujours l'utilisateur authentifié.
 */

export const MAX_FRIENDS = 100;
export const MAX_PENDING_SENT = 20;

type Result = { ok: true; message: string } | { ok: false; error: string };
type AcceptResult =
  | { ok: true; message: string; requesterId?: string }
  | { ok: false; error: string };

/** La ligne liant deux comptes, quel que soit le sens de la demande. */
function findLink(a: string, b: string) {
  return prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
  });
}

export async function areFriends(a: string, b: string): Promise<boolean> {
  if (a === b) return false;
  const link = await findLink(a, b);
  return link?.status === "ACCEPTED";
}

function countFriends(userId: string) {
  return prisma.friendship.count({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
  });
}

/**
 * Envoie une demande d'ami par pseudo (insensible à la casse). Si l'autre
 * joueur nous avait déjà envoyé une demande, on l'accepte directement.
 */
export async function sendFriendRequest(
  me: string,
  username: string,
): Promise<Result & { targetId?: string; accepted?: boolean }> {
  const name = username.trim();
  if (!name) return { ok: false, error: "Indique un pseudo." };

  const target = await prisma.user.findFirst({
    where: { username: { equals: name, mode: "insensitive" } },
    select: { id: true, username: true },
  });
  if (!target) return { ok: false, error: "Aucun joueur avec ce pseudo." };
  if (target.id === me) return { ok: false, error: "Tu ne peux pas t'ajouter toi-même." };

  const link = await findLink(me, target.id);
  if (link?.status === "ACCEPTED") {
    return { ok: false, error: `${target.username} est déjà ton ami.` };
  }
  if (link && link.requesterId === me) {
    return { ok: false, error: "Demande déjà envoyée." };
  }
  if (link) {
    // Demande croisée : l'autre nous avait déjà demandé → on accepte.
    const res = await respondToRequest(me, link.id, true);
    return res.ok ? { ...res, targetId: target.id, accepted: true } : res;
  }

  const [friends, pendingSent] = await Promise.all([
    countFriends(me),
    prisma.friendship.count({ where: { requesterId: me, status: "PENDING" } }),
  ]);
  if (friends >= MAX_FRIENDS) {
    return { ok: false, error: `Limite de ${MAX_FRIENDS} amis atteinte.` };
  }
  if (pendingSent >= MAX_PENDING_SENT) {
    return { ok: false, error: "Trop de demandes en attente." };
  }

  // L'unicité (requesterId, addresseeId) arbitre une éventuelle course.
  await prisma.friendship.createMany({
    data: [{ requesterId: me, addresseeId: target.id }],
    skipDuplicates: true,
  });
  return { ok: true, message: `Demande envoyée à ${target.username}.`, targetId: target.id };
}

/** Accepte ou refuse une demande REÇUE (refus = suppression). */
export async function respondToRequest(
  me: string,
  requestId: string,
  accept: boolean,
): Promise<AcceptResult> {
  if (!accept) {
    const res = await prisma.friendship.deleteMany({
      where: { id: requestId, addresseeId: me, status: "PENDING" },
    });
    return res.count === 1
      ? { ok: true, message: "Demande refusée." }
      : { ok: false, error: "Demande introuvable." };
  }

  if ((await countFriends(me)) >= MAX_FRIENDS) {
    return { ok: false, error: `Limite de ${MAX_FRIENDS} amis atteinte.` };
  }
  const res = await prisma.friendship.updateMany({
    where: { id: requestId, addresseeId: me, status: "PENDING" },
    data: { status: "ACCEPTED", acceptedAt: new Date() },
  });
  if (res.count !== 1) return { ok: false, error: "Demande introuvable." };
  const link = await prisma.friendship.findUnique({
    where: { id: requestId },
    select: { requesterId: true },
  });
  return {
    ok: true,
    message: "Vous êtes maintenant amis !",
    requesterId: link?.requesterId,
  };
}

/** Annule une demande ENVOYÉE et pas encore acceptée. */
export async function cancelRequest(me: string, requestId: string): Promise<Result> {
  const res = await prisma.friendship.deleteMany({
    where: { id: requestId, requesterId: me, status: "PENDING" },
  });
  return res.count === 1
    ? { ok: true, message: "Demande annulée." }
    : { ok: false, error: "Demande introuvable." };
}

/**
 * Retire un ami. Les offres d'échange en attente entre les deux sont annulées
 * (elles ne pourraient plus être acceptées de toute façon).
 */
export async function removeFriend(me: string, friendId: string): Promise<Result> {
  const res = await prisma.friendship.deleteMany({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: me, addresseeId: friendId },
        { requesterId: friendId, addresseeId: me },
      ],
    },
  });
  if (res.count === 0) return { ok: false, error: "Ce joueur n'est pas ton ami." };

  await prisma.tradeOffer.updateMany({
    where: {
      status: "PENDING",
      OR: [
        { fromUserId: me, toUserId: friendId },
        { fromUserId: friendId, toUserId: me },
      ],
    },
    data: { status: "CANCELLED", resolvedAt: new Date() },
  });
  return { ok: true, message: "Ami retiré." };
}

/** Amis acceptés, triés par pseudo (décor de l'univers `universeId`). */
export async function listFriends(me: string, universeId: string): Promise<FriendView[]> {
  const rows = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: me }, { addresseeId: me }],
    },
    select: {
      acceptedAt: true,
      requester: { select: { id: true, ...userDecorSelect(universeId) } },
      addressee: { select: { id: true, ...userDecorSelect(universeId) } },
    },
  });
  return rows
    .map((r) => {
      const other = r.requester.id === me ? r.addressee : r.requester;
      return {
        userId: other.id,
        username: other.username,
        decor: userDecor(other),
        since: (r.acceptedAt ?? new Date()).toISOString(),
      };
    })
    .sort((a, b) => a.username.localeCompare(b.username, "fr"));
}

/** Demandes en attente, reçues et envoyées (décor de l'univers `universeId`). */
export async function listPendingRequests(
  me: string,
  universeId: string,
): Promise<{
  received: FriendRequestView[];
  sent: FriendRequestView[];
}> {
  const rows = await prisma.friendship.findMany({
    where: {
      status: "PENDING",
      OR: [{ requesterId: me }, { addresseeId: me }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      requester: { select: { id: true, ...userDecorSelect(universeId) } },
      addressee: { select: { id: true, ...userDecorSelect(universeId) } },
    },
  });
  const received: FriendRequestView[] = [];
  const sent: FriendRequestView[] = [];
  for (const r of rows) {
    const incoming = r.addressee.id === me;
    const other = incoming ? r.requester : r.addressee;
    (incoming ? received : sent).push({
      id: r.id,
      userId: other.id,
      username: other.username,
      decor: userDecor(other),
      createdAt: r.createdAt.toISOString(),
    });
  }
  return { received, sent };
}

/**
 * Relation entre le visiteur et un profil, pour le bouton du profil public.
 * `incoming` = l'autre nous a envoyé une demande (on peut l'accepter).
 */
export async function friendshipState(
  me: string,
  other: string,
): Promise<
  | { kind: "none" }
  | { kind: "friends" }
  | { kind: "outgoing"; requestId: string }
  | { kind: "incoming"; requestId: string }
> {
  if (me === other) return { kind: "none" };
  const link = await findLink(me, other);
  if (!link) return { kind: "none" };
  if (link.status === "ACCEPTED") return { kind: "friends" };
  return link.requesterId === me
    ? { kind: "outgoing", requestId: link.id }
    : { kind: "incoming", requestId: link.id };
}
