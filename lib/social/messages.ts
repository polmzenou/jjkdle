import "server-only";
import { prisma } from "@/lib/prisma";
import { areFriends, listFriends } from "./friends";
import type { ConversationView, MessageView, SocialCounts } from "./types";

/**
 * MESSAGERIE PRIVÉE entre amis. Texte brut (React échappe à l'affichage),
 * 500 caractères max, anti-spam simple par fenêtre glissante.
 */

export const MESSAGE_MAX = 500;
export const PAGE_SIZE = 50;
const SPAM_WINDOW_MS = 30_000;
const SPAM_MAX = 10;

type Row = {
  id: string;
  senderId: string;
  body: string;
  createdAt: Date;
  readAt: Date | null;
};

function toView(r: Row): MessageView {
  return {
    id: r.id,
    senderId: r.senderId,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
    read: r.readAt != null,
  };
}

const rowSelect = {
  id: true,
  senderId: true,
  body: true,
  createdAt: true,
  readAt: true,
} as const;

/** Normalise le corps d'un message : trim + longueur. `null` si vide. */
export function normalizeMessage(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const body = raw.trim();
  if (!body) return null;
  return body.slice(0, MESSAGE_MAX);
}

export async function sendMessage(
  me: string,
  to: string,
  raw: unknown,
): Promise<{ ok: true; message: MessageView } | { ok: false; error: string }> {
  const body = normalizeMessage(raw);
  if (!body) return { ok: false, error: "Message vide." };
  if (!(await areFriends(me, to))) {
    return { ok: false, error: "Tu ne peux écrire qu'à tes amis." };
  }

  const recent = await prisma.directMessage.count({
    where: { senderId: me, createdAt: { gte: new Date(Date.now() - SPAM_WINDOW_MS) } },
  });
  if (recent >= SPAM_MAX) {
    return { ok: false, error: "Doucement ! Attends quelques secondes." };
  }

  const row = await prisma.directMessage.create({
    data: { senderId: me, recipientId: to, body },
    select: rowSelect,
  });
  return { ok: true, message: toView(row) };
}

/**
 * Fil d'une conversation, du plus ancien au plus récent (les `PAGE_SIZE`
 * derniers, ou ceux d'avant `before` pour remonter l'historique).
 */
export async function listConversation(
  me: string,
  friendId: string,
  before?: string,
): Promise<MessageView[]> {
  const rows = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: me, recipientId: friendId },
        { senderId: friendId, recipientId: me },
      ],
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    select: rowSelect,
  });
  return rows.reverse().map(toView);
}

/** Marque comme lus les messages reçus d'un ami. */
export async function markConversationRead(me: string, friendId: string): Promise<void> {
  await prisma.directMessage.updateMany({
    where: { senderId: friendId, recipientId: me, readAt: null },
    data: { readAt: new Date() },
  });
}

/**
 * Une conversation par ami (même sans message), triées par activité récente
 * puis par pseudo.
 */
export async function listConversations(me: string): Promise<ConversationView[]> {
  const friends = await listFriends(me);
  if (friends.length === 0) return [];
  const ids = friends.map((f) => f.userId);

  const [unread, lasts] = await Promise.all([
    prisma.directMessage.groupBy({
      by: ["senderId"],
      where: { recipientId: me, readAt: null, senderId: { in: ids } },
      _count: { _all: true },
    }),
    // Dernier message de chaque fil : une requête par ami (≤ 100, indexée).
    Promise.all(
      ids.map((id) =>
        prisma.directMessage.findFirst({
          where: {
            OR: [
              { senderId: me, recipientId: id },
              { senderId: id, recipientId: me },
            ],
          },
          orderBy: { createdAt: "desc" },
          select: rowSelect,
        }),
      ),
    ),
  ]);
  const unreadBy = new Map(unread.map((u) => [u.senderId, u._count._all]));

  return friends
    .map((f, i) => {
      const last = lasts[i];
      return {
        friendId: f.userId,
        username: f.username,
        lastMessage: last ? toView(last) : null,
        unread: unreadBy.get(f.userId) ?? 0,
      };
    })
    .sort((a, b) => {
      const ta = a.lastMessage?.createdAt ?? "";
      const tb = b.lastMessage?.createdAt ?? "";
      if (ta !== tb) return tb.localeCompare(ta);
      return a.username.localeCompare(b.username, "fr");
    });
}

/** Compteurs de la pastille de navigation (tous univers confondus). */
export async function getSocialCounts(me: string): Promise<SocialCounts> {
  const [friendRequests, trades, messages] = await Promise.all([
    prisma.friendship.count({ where: { addresseeId: me, status: "PENDING" } }),
    prisma.tradeOffer.count({ where: { toUserId: me, status: "PENDING" } }),
    prisma.directMessage.count({ where: { recipientId: me, readAt: null } }),
  ]);
  return { friendRequests, trades, messages };
}
