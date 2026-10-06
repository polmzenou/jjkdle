import "server-only";
import type { NotificationKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { transferCoins } from "@/lib/coins";
import { userDecor, userDecorSelect } from "@/lib/leaderboard/store";
import { areFriends } from "./friends";
import { parseCoinAmount } from "./coins-amount";
import type { NotificationView } from "./types";

/**
 * NOTIFICATIONS du hub social (bloc « Notifications ») et ENVOI DE COINS entre
 * amis, qui en est la principale source.
 *
 * Une notification ne stocke que son type, l'autre joueur et un montant : le
 * texte est composé au rendu, avec le décor ACTUEL de l'acteur. On en garde
 * `MAX_NOTIFICATIONS` par joueur ; le joueur peut les supprimer une à une.
 */

export const MAX_NOTIFICATIONS = 50;
const SEND_WINDOW_MS = 30_000;
const SEND_MAX = 5;

/** Supprime les notifications au-delà des `MAX_NOTIFICATIONS` plus récentes. */
async function prune(userId: string): Promise<void> {
  const stale = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: MAX_NOTIFICATIONS,
    select: { id: true },
  });
  if (stale.length > 0) {
    await prisma.notification.deleteMany({ where: { id: { in: stale.map((n) => n.id) } } });
  }
}

/** Ajoute une notification (best-effort : un échec ne casse pas l'action). */
export async function notify(
  userId: string,
  kind: NotificationKind,
  actorId: string | null,
  amount?: number,
): Promise<void> {
  try {
    await prisma.notification.create({
      data: { userId, kind, actorId, amount: amount ?? null },
    });
    await prune(userId);
  } catch (err) {
    console.error("[notifications] notify", err);
  }
}

/** Notifications du joueur, plus récentes d'abord (décor de l'univers courant). */
export async function listNotifications(
  me: string,
  universeId: string,
): Promise<NotificationView[]> {
  const rows = await prisma.notification.findMany({
    where: { userId: me },
    orderBy: { createdAt: "desc" },
    take: MAX_NOTIFICATIONS,
    select: {
      id: true,
      kind: true,
      amount: true,
      createdAt: true,
      actor: { select: userDecorSelect(universeId) },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    amount: r.amount,
    createdAt: r.createdAt.toISOString(),
    actor: r.actor ? userDecor(r.actor) : null,
  }));
}

export async function deleteNotification(me: string, id: string): Promise<boolean> {
  const res = await prisma.notification.deleteMany({ where: { id, userId: me } });
  return res.count === 1;
}

export async function clearNotifications(me: string): Promise<void> {
  await prisma.notification.deleteMany({ where: { userId: me } });
}

/**
 * Envoie des coins à un ami : montant entier ≥ 1, sans plafond (jusqu'à tout
 * le solde), anti-spam léger. Le débit/crédit et les deux notifications sont
 * écrits ensemble (`transferCoins`).
 */
export async function sendCoinsToFriend(
  me: string,
  friendId: string,
  rawAmount: unknown,
): Promise<{ ok: true; amount: number } | { ok: false; error: string }> {
  const amount = parseCoinAmount(rawAmount);
  if (amount == null) return { ok: false, error: "Montant invalide." };
  if (!(await areFriends(me, friendId))) {
    return { ok: false, error: "Tu ne peux envoyer des coins qu'à tes amis." };
  }

  const recent = await prisma.notification.count({
    where: {
      userId: me,
      kind: "COINS_SENT",
      createdAt: { gte: new Date(Date.now() - SEND_WINDOW_MS) },
    },
  });
  if (recent >= SEND_MAX) {
    return { ok: false, error: "Doucement ! Attends quelques secondes." };
  }

  if (!(await transferCoins(me, friendId, amount))) {
    return { ok: false, error: "Solde insuffisant." };
  }
  await Promise.all([prune(me), prune(friendId)]);
  return { ok: true, amount };
}
