/**
 * Contrat temps réel du mode « JJK Random Battle » (partagé client/serveur).
 * Réutilise le canal de présence des lobbys (`presence-lobby-<code>`). Le serveur
 * est autoritatif : il diffuse `battle-state` (snapshot complet) à chaque
 * changement ; le snapshot pilote aussi les animations côté client.
 */
export { lobbyChannel } from "@/lib/multiplayer/events";

export const BATTLE_EVENTS = {
  /** Snapshot complet : lobby + état de jeu battle. */
  state: "battle-state",
} as const;
