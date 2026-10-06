/**
 * Contrat temps réel du SOCIAL, partagé client/serveur (aucune dépendance
 * server-only ici).
 *
 * Chaque joueur connecté écoute SON canal privé `private-user-<id>` (auth :
 * `/api/pusher/auth`, qui n'autorise que son propre id). Les événements sont
 * des notifications légères : la base fait foi, le client se contente de
 * rafraîchir ce qu'il affiche.
 */

export function userChannel(userId: string): string {
  return `private-user-${userId}`;
}

export const SOCIAL_EVENTS = {
  /** Nouveau message privé (payload : `MessageView` + `fromUsername`). */
  message: "message-new",
  /** Demande d'ami reçue ou acceptée. */
  friend: "friend-update",
  /** Offre d'échange reçue ou résolue. */
  trade: "trade-update",
} as const;
