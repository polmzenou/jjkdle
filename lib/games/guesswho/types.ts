/**
 * Types du jeu « Qui est-ce ? » (Guess Who JJK, 1v1 en ligne).
 *
 * Aucune dépendance serveur-only : types partagés client/serveur. L'état
 * autoritatif vit en base (`GuessWhoGame`), pas dans `Lobby.gameState`. Les
 * secrets n'apparaissent JAMAIS dans l'état public diffusé (voir events.ts) : ils
 * ne sont présents que dans la révélation de fin de partie.
 */
import type { SerializedLobby } from "@/lib/multiplayer/events";

/** Taille de la grille partagée (5×5). */
export const GUESSWHO_GRID = 25;
/** Nombre de joueurs requis (1v1 strict). */
export const GUESSWHO_PLAYERS = 2;
/** Longueur max d'un message de chat. */
export const GUESSWHO_CHAT_MAX = 300;

export type GuessWhoStatus = "ACTIVE" | "FINISHED";

/**
 * État PUBLIC d'une partie (jamais de secret tant que ACTIVE). `reveal` n'est
 * présent qu'une fois la partie terminée.
 */
export interface GuessWhoPublicState {
  /** 25 IDs de personnages, ordre partagé (grille identique pour les 2 joueurs). */
  grid: string[];
  /** Joueur dont c'est le tour. */
  currentTurn: string;
  status: GuessWhoStatus;
  winnerId: string | null;
  /** Révélation des deux secrets (uniquement quand status === "FINISHED"). */
  reveal?: { secret1Id: string; secret2Id: string };
}

/** Payload `guesswho:state` : snapshot du salon (join/leave/play-again). */
export interface GuessWhoStatePayload {
  lobby: SerializedLobby;
  /** État public de la partie, ou null tant qu'aucune n'a démarré. */
  publicState: GuessWhoPublicState | null;
}

/** Payload `guesswho:start` : grille + tour (aucun secret). */
export interface GuessWhoStartPayload {
  lobby: SerializedLobby;
  grid: string[];
  currentTurn: string;
}

/** Payload `guesswho:turn-passed`. */
export interface GuessWhoTurnPayload {
  currentTurn: string;
}

/**
 * Payload `guesswho:eliminations` : plateau grisé d'un joueur (éphémère). Chaque
 * joueur diffuse SES éliminations pour que l'adversaire suive son « deck » en direct.
 */
export interface GuessWhoEliminationsPayload {
  userId: string;
  eliminatedIds: string[];
}

/** Message de chat intégré (éphémère). */
export interface GuessWhoChatMessage {
  userId: string;
  username: string;
  text: string;
  at: number;
}

/** Payload `guesswho:guess-result` : fin de partie + révélation des 2 secrets. */
export interface GuessWhoGuessResultPayload {
  status: "FINISHED";
  winnerId: string;
  /** Auteur du guess. */
  guessById: string;
  /** Vrai si le guess était correct. */
  correct: boolean;
  secret1Id: string;
  secret2Id: string;
}
