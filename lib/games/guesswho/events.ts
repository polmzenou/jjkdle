/**
 * Contrat temps réel du mode « Qui est-ce ? » (Guess Who JJK, 1v1).
 * Réutilise le canal de présence des lobbys (`presence-lobby-<code>`). Le serveur
 * est autoritatif : la grille et le tour sont diffusés en clair, mais les DEUX
 * secrets ne transitent JAMAIS par Pusher tant que la partie est ACTIVE
 * (chaque joueur récupère le sien via `getMySecretAction`). Ils ne sont révélés
 * qu'au moment de `guesswho:guess-result` (partie terminée).
 */
export { lobbyChannel } from "@/lib/multiplayer/events";

export const GUESSWHO_EVENTS = {
  /** Snapshot du salon (join/leave/play-again) : lobby + état public éventuel. */
  state: "guesswho:state",
  /** Démarrage : grille (25 IDs) + joueur dont c'est le tour. Aucun secret. */
  start: "guesswho:start",
  /** Nouveau tour (après « Passer »). */
  turnPassed: "guesswho:turn-passed",
  /** Message de chat intégré (éphémère, non persisté). */
  chat: "guesswho:chat",
  /**
   * Éliminations d'un joueur (éphémère, non persisté) : diffusées en direct pour
   * que l'adversaire voie l'avancée du plateau de l'autre (« deck en direct »).
   */
  eliminations: "guesswho:eliminations",
  /** Résultat d'un guess : partie finie + vainqueur + révélation des 2 secrets. */
  guessResult: "guesswho:guess-result",
} as const;
