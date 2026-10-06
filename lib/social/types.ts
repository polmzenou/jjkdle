import type { CardView } from "@/lib/cards/types";

/**
 * Types de VUE du social (amis, échanges, messages), isolés des modules
 * server-only pour que les composants client puissent les importer.
 * Les dates voyagent en ISO (sérialisables d'un Server Component au client).
 */

export interface FriendView {
  userId: string;
  username: string;
  /** Date d'acceptation (ISO). */
  since: string;
}

export interface FriendRequestView {
  id: string;
  /** L'AUTRE joueur (expéditeur si reçue, destinataire si envoyée). */
  userId: string;
  username: string;
  createdAt: string;
}

export type TradeStatusView =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "CANCELLED"
  | "FAILED";

export interface TradeLine extends CardView {
  quantity: number;
}

export interface TradeView {
  id: string;
  /** `true` si c'est MOI qui ai proposé l'offre. */
  outgoing: boolean;
  /** L'autre joueur. */
  otherId: string;
  otherUsername: string;
  status: TradeStatusView;
  /** Univers de l'offre (une offre ne porte que sur des cartes d'un univers). */
  universeId: string;
  universeName: string;
  message: string | null;
  /** Ce que JE donne (du point de vue de l'utilisateur courant). */
  give: TradeLine[];
  /** Ce que JE reçois. */
  receive: TradeLine[];
  createdAt: string;
  resolvedAt: string | null;
}

/** Une carte échangeable : la carte + le nombre d'exemplaires possédés. */
export interface TradableCard extends CardView {
  copies: number;
}

export interface MessageView {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface ConversationView {
  friendId: string;
  username: string;
  lastMessage: MessageView | null;
  unread: number;
}

/** Compteurs de la pastille de navigation. */
export interface SocialCounts {
  friendRequests: number;
  trades: number;
  messages: number;
}
