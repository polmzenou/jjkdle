/**
 * Contrat temps réel partagé client/serveur (aucune dépendance serveur-only ici).
 *
 * Le serveur est autoritatif : il diffuse un snapshot complet du lobby
 * (`lobby-state`) à chaque changement d'état, plus un événement léger
 * (`player-locked`) qui sert uniquement de déclencheur d'animation immédiat
 * côté adversaire (le snapshot fait foi).
 */

export type LobbyStatusValue = "WAITING" | "PLAYING" | "FINISHED";

/** Bornes du nombre de joueurs par lobby (partagées client/serveur). */
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 3;

/** Plateau d'un joueur, sérialisé en IDs de personnages (résolus via la roster). */
export interface SerializedPlayer {
  userId: string;
  username: string;
  /** Image de l'avatar choisi (personnage du roster), ou null = initiales. */
  avatarImage: string | null;
  joinOrder: number;
  /** Sélection verrouillée : { [categoryId]: characterId }. */
  selection: Record<string, string>;
  /** Tirage courant : { [categoryId]: characterId | null }. */
  currentDraw: Record<string, string | null>;
  lockedThisRound: boolean;
  finalScore: number | null;
}

/** Snapshot complet d'un lobby, diffusé à chaque changement. */
export interface SerializedLobby {
  code: string;
  gameId: string;
  hostId: string;
  status: LobbyStatusValue;
  roundIndex: number;
  /** Nombre total de manches (= nombre de catégories). */
  totalRounds: number;
  players: SerializedPlayer[];
}

/** Noms d'événements Pusher (hors événements réservés `pusher:` de présence). */
export const EVENTS = {
  /** Snapshot complet du lobby (join, leave, start, round-advance, fin). */
  lobbyState: "lobby-state",
  /** Cue d'animation : un joueur vient de verrouiller une catégorie. */
  playerLocked: "player-locked",
} as const;

export interface LobbyStatePayload {
  lobby: SerializedLobby;
}

export interface PlayerLockedPayload {
  userId: string;
  categoryId: string;
  characterId: string;
  roundIndex: number;
}

/** Canal de présence dédié à un lobby (préfixe `presence-` requis par Pusher). */
export function lobbyChannel(code: string): string {
  return `presence-lobby-${code}`;
}
