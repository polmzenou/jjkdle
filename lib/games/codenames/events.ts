/**
 * Contrat temps réel du mode « JJK Codenames » (jeu d'équipe, 4-6 joueurs).
 * Réutilise le canal de présence des lobbys (`presence-lobby-<code>`). Le serveur
 * est autoritatif : la grille et les scores sont diffusés en clair, mais la
 * carte-clé (`colorKey`, mapping id→couleur) ne transite JAMAIS par Pusher tant
 * que la partie est ACTIVE (chaque maître-espion la récupère via `getKeyCardAction`).
 * Elle n'est révélée qu'au moment de `codenames:end` (partie terminée). `codenames:
 * reveal` ne diffuse que la couleur de la SEULE carte qui vient d'être révélée.
 */
export { lobbyChannel } from "@/lib/multiplayer/events";

export const CODENAMES_EVENTS = {
  /** Snapshot du salon (join/leave/play-again) : lobby + état public + sélection. */
  state: "codenames:state",
  /** État de la sélection d'équipe en direct (choix équipe + maître-espion). */
  teamSelect: "codenames:team-select",
  /** Démarrage : grille (36 IDs) sans couleurs + 1er tour. */
  start: "codenames:start",
  /** Indice donné (mot + nombre) : chat coloré + bannière de notif. */
  clue: "codenames:clue",
  /** Carte révélée : couleur de CETTE carte + scores + éventuelle fin de tour. */
  reveal: "codenames:reveal",
  /** Agents ayant passé / changement de tour. */
  pass: "codenames:pass",
  /** Message de chat intégré (éphémère, non persisté). */
  chat: "codenames:chat",
  /** Fin de partie : vainqueur + révélation de la carte-clé complète. */
  end: "codenames:end",
} as const;
