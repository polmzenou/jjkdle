/**
 * Types du jeu « JJK Codenames » (jeu d'équipe en ligne, 4-6 joueurs, 2 équipes).
 *
 * Aucune dépendance serveur-only : types partagés client/serveur. L'état
 * autoritatif vit en base (`CodenamesGame`), pas dans `Lobby.gameState` — sauf la
 * phase de sélection d'équipe transitoire (`TeamSelectState`), stockée dans
 * `Lobby.gameState`. La carte-clé (`colorKey`) n'apparaît JAMAIS dans l'état public
 * diffusé (voir events.ts) : elle n'est présente que dans la révélation de fin (`end`).
 */
import type { SerializedLobby } from "@/lib/multiplayer/events";

/** Taille de la grille partagée (6×6). */
export const CODENAMES_GRID = 36;
/** Nombre de joueurs min / max. */
export const CODENAMES_MIN_PLAYERS = 4;
export const CODENAMES_MAX_PLAYERS = 6;
/** Répartition des couleurs sur la grille. */
export const CODENAMES_RED = 8;
export const CODENAMES_PURPLE = 8;
export const CODENAMES_ASSASSINS = 1;
/** 36 − 8 − 8 − 1 = 19 cartes neutres. */
export const CODENAMES_NEUTRAL =
  CODENAMES_GRID - CODENAMES_RED - CODENAMES_PURPLE - CODENAMES_ASSASSINS;
/** Score de victoire (toutes les cartes d'une équipe révélées). */
export const CODENAMES_WIN_SCORE = 8;
/** Longueur max d'un message de chat. */
export const CODENAMES_CHAT_MAX = 300;

export type Team = "RED" | "PURPLE";
export type CardColor = "RED" | "PURPLE" | "NEUTRAL" | "ASSASSIN";
export type CodenamesStatus = "ACTIVE" | "FINISHED";

/** Carte-clé : mapping id de personnage → couleur. */
export type ColorKey = Record<string, CardColor>;

/** Indice courant : un mot + un nombre + révélations restantes (= count + 1). */
export interface Clue {
  word: string;
  count: number;
  remaining: number;
}

// ──────────────────────────────────────────────────────────────────────────
// Phase de sélection d'équipe (transitoire, stockée dans Lobby.gameState)
// ──────────────────────────────────────────────────────────────────────────

/** Choix d'un joueur pendant la sélection : équipe + candidature maître-espion. */
export interface TeamAssignment {
  team: Team | null;
  spymaster: boolean;
}

/** État de la sélection d'équipe (Json dans `Lobby.gameState`). */
export interface TeamSelectState {
  phase: "TEAM_SELECT";
  /** userId → choix courant. */
  assignments: Record<string, TeamAssignment>;
}

// ──────────────────────────────────────────────────────────────────────────
// État public (jamais de couleurs tant que ACTIVE)
// ──────────────────────────────────────────────────────────────────────────

/**
 * État PUBLIC d'une partie. La carte-clé complète n'est présente (via `reveal`)
 * QUE lorsque la partie est terminée. Les cartes déjà révélées portent leur
 * couleur individuelle (publiquement connue) dans `revealed`.
 */
export interface CodenamesPublicState {
  /** 36 IDs de personnages, ordre partagé (grille identique pour tous). */
  grid: string[];
  /** Cartes révélées : id → couleur (connue publiquement une fois révélée). */
  revealed: Record<string, CardColor>;
  redScore: number;
  purpleScore: number;
  currentTeam: Team;
  /** Indice courant (mot + nombre), ou null entre deux indices. */
  currentClue: Clue | null;
  /** Agents ayant cliqué « Passer » ce tour. */
  passedAgentIds: string[];
  redSpymasterId: string;
  purpleSpymasterId: string;
  /** userId → équipe (figé au démarrage). */
  teams: Record<string, Team>;
  status: CodenamesStatus;
  winnerTeam: Team | null;
  /** Carte-clé complète (uniquement quand status === "FINISHED"). */
  reveal?: { colorKey: ColorKey };
}

/** Rôle de l'utilisateur courant dans la partie. */
export interface CodenamesRole {
  team: Team | null;
  isSpymaster: boolean;
}

// ──────────────────────────────────────────────────────────────────────────
// Payloads Pusher
// ──────────────────────────────────────────────────────────────────────────

/** Payload `codenames:state` : snapshot du salon + état public + sélection d'équipe. */
export interface CodenamesStatePayload {
  lobby: SerializedLobby;
  publicState: CodenamesPublicState | null;
  teamSelect: TeamSelectState | null;
}

/** Payload `codenames:team-select` : état de la sélection d'équipe en direct. */
export interface CodenamesTeamSelectPayload {
  lobby: SerializedLobby;
  teamSelect: TeamSelectState;
}

/** Payload `codenames:start` : partie créée, grille (sans couleurs) + 1er tour. */
export interface CodenamesStartPayload {
  lobby: SerializedLobby;
  publicState: CodenamesPublicState;
}

/** Payload `codenames:clue` : indice donné (mot + nombre) par un maître-espion. */
export interface CodenamesCluePayload {
  team: Team;
  word: string;
  count: number;
  /** Auteur (maître-espion). */
  byUserId: string;
  byUsername: string;
}

/** Payload `codenames:reveal` : une carte révélée + scores + éventuelle bascule. */
export interface CodenamesRevealPayload {
  charId: string;
  color: CardColor;
  redScore: number;
  purpleScore: number;
  currentTeam: Team;
  currentClue: Clue | null;
  turnEnded: boolean;
  passedAgentIds: string[];
}

/** Payload `codenames:pass` : agents ayant passé / changement de tour. */
export interface CodenamesPassPayload {
  passedAgentIds: string[];
  currentTeam: Team;
  turnEnded: boolean;
  currentClue: Clue | null;
}

/** Payload `codenames:end` : fin de partie + révélation de la carte-clé complète. */
export interface CodenamesEndPayload {
  status: "FINISHED";
  winnerTeam: Team;
  redScore: number;
  purpleScore: number;
  colorKey: ColorKey;
}

/** Message de chat intégré (éphémère). `kind: "clue"` = indice coloré par équipe. */
export interface CodenamesChatMessage {
  userId: string;
  username: string;
  text: string;
  at: number;
  kind: "text" | "clue";
  team?: Team;
}
