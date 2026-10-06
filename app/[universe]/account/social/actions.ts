"use server";

import { getCurrentUser } from "@/lib/auth/session";
import {
  getCurrentUniverse,
  revalidateUniversePath,
} from "@/lib/universes/current";
import { triggerUser } from "@/lib/pusher/server";
import { SOCIAL_EVENTS } from "@/lib/social/events";
import {
  cancelRequest,
  removeFriend,
  respondToRequest,
  sendFriendRequest,
} from "@/lib/social/friends";
import {
  listConversation,
  markConversationRead,
  sendMessage,
} from "@/lib/social/messages";
import {
  acceptTrade,
  cancelTrade,
  createTrade,
  declineTrade,
  getFriendSpareCards,
  getSpareCards,
} from "@/lib/cards/trade-store";
import type { TradeLineInput } from "@/lib/cards/trade";
import type { MessageView, SpareCard } from "@/lib/social/types";

/**
 * Server actions du SOCIAL (amis, échanges, messages).
 *
 * Rien n'est cru côté client : chaque action relit la session, et les modules
 * `lib/social/*` / `lib/cards/trade-store` revérifient l'amitié et les
 * doublons. Les notifications Pusher sont best-effort (`triggerUser`).
 */

export type ActionResult = { ok: boolean; error?: string; message?: string };

const NOT_LOGGED = { ok: false, error: "Connecte-toi d'abord." } as const;

async function revalidateSocial(): Promise<void> {
  await revalidateUniversePath("/account/social");
}

function isLines(value: unknown): value is TradeLineInput[] {
  return (
    Array.isArray(value) &&
    value.length <= 20 &&
    value.every(
      (l) =>
        l &&
        typeof l === "object" &&
        typeof (l as TradeLineInput).characterId === "string" &&
        typeof (l as TradeLineInput).quantity === "number",
    )
  );
}

// ── Amis ──────────────────────────────────────────────────────────────────

export async function sendFriendRequestAction(username: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return NOT_LOGGED;
  if (typeof username !== "string") return { ok: false, error: "Pseudo invalide." };

  const res = await sendFriendRequest(user.id, username.slice(0, 64));
  if (!res.ok) return res;
  if (res.targetId) {
    await triggerUser(res.targetId, SOCIAL_EVENTS.friend, { from: user.username });
  }
  await revalidateSocial();
  await revalidateUniversePath(`/u/${encodeURIComponent(username)}`);
  return { ok: true, message: res.message };
}

export async function respondFriendRequestAction(
  requestId: string,
  accept: boolean,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return NOT_LOGGED;
  const res = await respondToRequest(user.id, String(requestId), Boolean(accept));
  if (!res.ok) return res;
  await revalidateSocial();
  return { ok: true, message: res.message };
}

export async function cancelFriendRequestAction(requestId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return NOT_LOGGED;
  const res = await cancelRequest(user.id, String(requestId));
  if (!res.ok) return res;
  await revalidateSocial();
  return { ok: true, message: res.message };
}

export async function removeFriendAction(friendId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return NOT_LOGGED;
  const res = await removeFriend(user.id, String(friendId));
  if (!res.ok) return res;
  await revalidateSocial();
  return { ok: true, message: res.message };
}

// ── Échanges ──────────────────────────────────────────────────────────────

/** Mes doublons et ceux de l'ami, dans l'univers courant (composeur d'offre). */
export async function loadTradeSparesAction(
  friendId: string,
): Promise<{ ok: boolean; error?: string; mine?: SpareCard[]; theirs?: SpareCard[] }> {
  const user = await getCurrentUser();
  if (!user) return NOT_LOGGED;
  const universe = await getCurrentUniverse();
  const [mine, theirs] = await Promise.all([
    getSpareCards(user.id, universe.id),
    getFriendSpareCards(user.id, String(friendId), universe.id),
  ]);
  if (!theirs) return { ok: false, error: "Ce joueur n'est pas ton ami." };
  return { ok: true, mine, theirs };
}

export async function createTradeAction(
  toUserId: string,
  give: TradeLineInput[],
  take: TradeLineInput[],
  message: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return NOT_LOGGED;
  if (!isLines(give) || !isLines(take)) return { ok: false, error: "Offre invalide." };

  const universe = await getCurrentUniverse();
  const res = await createTrade(user.id, String(toUserId), universe.id, give, take, message);
  if (!res.ok) return res;

  await triggerUser(String(toUserId), SOCIAL_EVENTS.trade, { from: user.username });
  await revalidateSocial();
  return { ok: true, message: "Offre envoyée !" };
}

export async function acceptTradeAction(offerId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return NOT_LOGGED;
  const res = await acceptTrade(user.id, String(offerId));
  if (!res.ok) {
    await revalidateSocial();
    return res;
  }
  await triggerUser(res.fromUserId, SOCIAL_EVENTS.trade, { from: user.username });
  await revalidateSocial();
  await revalidateUniversePath("/account/deck");
  return { ok: true, message: "Échange effectué ! Les cartes sont dans ta collection." };
}

export async function declineTradeAction(offerId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return NOT_LOGGED;
  const res = await declineTrade(user.id, String(offerId));
  if (!res.ok) return res;
  await triggerUser(res.fromUserId, SOCIAL_EVENTS.trade, { from: user.username });
  await revalidateSocial();
  return { ok: true, message: "Offre refusée." };
}

export async function cancelTradeAction(offerId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return NOT_LOGGED;
  const res = await cancelTrade(user.id, String(offerId));
  if (!res.ok) return res;
  await triggerUser(res.toUserId, SOCIAL_EVENTS.trade, { from: user.username });
  await revalidateSocial();
  return { ok: true, message: "Offre annulée." };
}

// ── Messages ──────────────────────────────────────────────────────────────

/** Ouvre une conversation : renvoie le fil et marque les messages reçus lus. */
export async function loadConversationAction(
  friendId: string,
  before?: string,
): Promise<{ ok: boolean; error?: string; messages?: MessageView[] }> {
  const user = await getCurrentUser();
  if (!user) return NOT_LOGGED;
  const id = String(friendId);
  const [messages] = await Promise.all([
    listConversation(user.id, id, typeof before === "string" ? before : undefined),
    before ? null : markConversationRead(user.id, id),
  ]);
  return { ok: true, messages };
}

export async function sendMessageAction(
  friendId: string,
  body: string,
): Promise<{ ok: boolean; error?: string; message?: MessageView }> {
  const user = await getCurrentUser();
  if (!user) return NOT_LOGGED;
  const res = await sendMessage(user.id, String(friendId), body);
  if (!res.ok) return res;
  await triggerUser(String(friendId), SOCIAL_EVENTS.message, {
    ...res.message,
    fromUsername: user.username,
  });
  return { ok: true, message: res.message };
}
