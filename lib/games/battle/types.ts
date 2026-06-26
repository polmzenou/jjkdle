/**
 * Types du jeu « JJK Random Battle » (1v1 en ligne).
 *
 * Aucune dépendance serveur-only : ces types sont partagés client/serveur. L'état
 * de jeu (`BattleState`) est autoritatif côté serveur, stocké dans `Lobby.gameState`
 * (JSON) et diffusé via Pusher avec le snapshot de lobby.
 */
import type { SerializedLobby } from "@/lib/multiplayer/events";

/** Taille de deck cible par joueur. */
export const DECK_SIZE = 5;
/** Nombre de joueurs requis (1v1 strict). */
export const BATTLE_PLAYERS = 2;

export type BattlePhase = "DRAFT" | "COMBAT" | "RESULT";

export type BattleDecision = "keep" | "give";

/**
 * Mode de résolution du combat :
 * - `normal`   : le cumul des battleValue des 5 persos détermine le vainqueur.
 * - `hardcore` : gauntlet « le vainqueur reste » — un perso plus fort élimine
 *   l'adversaire et continue jusqu'à tomber sur plus fort que lui ; l'équipe
 *   avec des survivants l'emporte.
 */
export type BattleMode = "normal" | "hardcore";

/** Résultat de combat : vainqueur (null si égalité) + détails par mode. */
export interface BattleResult {
  /** userId -> cumul des battleValue de son deck (toujours calculé, info). */
  scores: Record<string, number>;
  /** userId -> persos restants (mode hardcore uniquement). */
  survivors?: Record<string, number>;
  /** Gagnant ; null en cas d'égalité. */
  winnerUserId: string | null;
  tie: boolean;
}

/** État de jeu autoritatif (blob `Lobby.gameState`). */
export interface BattleState {
  phase: BattlePhase;
  /** Mode de résolution choisi par l'hôte au démarrage. */
  mode: BattleMode;
  /** Graine RNG fixée par l'hôte au démarrage (reproductibilité). */
  seed: number;
  /** Curseur RNG : nombre de cartes tirées (incrémenté côté serveur). */
  drawCount: number;
  /** Carte posée sur la table (jamais la suivante → anti-triche). */
  currentCardId: string | null;
  /** Joueur dont c'est le tour. */
  activeUserId: string;
  /** userId -> ids de personnages (jusqu'à DECK_SIZE). */
  decks: Record<string, string[]>;
  /** Présent une fois le combat résolu (phase COMBAT/RESULT). */
  result?: BattleResult;
  /** Vrai si un joueur a quitté en cours de partie. */
  opponentLeft?: boolean;
}

/** Payload temps réel : snapshot du lobby + état de jeu (null si non démarré). */
export interface BattleStatePayload {
  lobby: SerializedLobby;
  gameState: BattleState | null;
}
