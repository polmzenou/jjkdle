import type { CategoryConfig, CategoryId } from "@/data/roster/categories";
import type { Character } from "@/data/roster/characters";
import type { SingleDraw } from "@/lib/draw/draw";
import { computeTotalScore, type Selection } from "@/lib/scoring/scoring";
import type {
  SerializedLobby,
  SerializedPlayer,
  LobbyStatusValue,
} from "./events";

/**
 * Conversions entre la représentation stockée (maps d'IDs, sérialisables en JSON
 * et diffusables via Pusher) et les objets métier (Character) utilisés par la
 * logique de tirage et de score. Aucune dépendance serveur-only ici.
 */

/** Sélection verrouillée stockée : { [categoryId]: characterId }. */
export type SelectionIds = Record<string, string>;
/** Tirage courant stocké : { [categoryId]: characterId | null }. */
export type DrawIds = Record<string, string | null>;

/** Map id→Character (construite depuis la roster). */
export type RosterMap = Record<string, Character>;

export function buildRosterMap(roster: Character[]): RosterMap {
  return Object.fromEntries(roster.map((c) => [c.id, c]));
}

/** Tirage (objets) → map d'IDs sérialisable. */
export function singleDrawToIds(draw: SingleDraw): DrawIds {
  const out: DrawIds = {};
  for (const [categoryId, character] of Object.entries(draw)) {
    out[categoryId] = character?.id ?? null;
  }
  return out;
}

/** Map d'IDs → tirage (objets) pour la logique de re-tirage. */
export function idsToSingleDraw(
  ids: DrawIds,
  categories: CategoryConfig[],
  roster: RosterMap,
): SingleDraw {
  const out = {} as SingleDraw;
  for (const category of categories) {
    const id = ids[category.id];
    out[category.id] = id ? (roster[id] ?? null) : null;
  }
  return out;
}

/** Sélection verrouillée (IDs) → Selection (objets) pour le scoring. */
export function idsToSelection(
  ids: SelectionIds,
  roster: RosterMap,
): Selection {
  const out: Selection = {};
  for (const [categoryId, characterId] of Object.entries(ids)) {
    const character = roster[characterId];
    if (character) out[categoryId as CategoryId] = character;
  }
  return out;
}

/** Catégories déjà verrouillées par un joueur (clés de sa sélection). */
export function lockedIdsOf(selection: SelectionIds): Set<CategoryId> {
  return new Set(Object.keys(selection) as CategoryId[]);
}

/** Score final d'un joueur (sur 1000) à partir de sa sélection en IDs. */
export function scoreSelection(
  selection: SelectionIds,
  categories: CategoryConfig[],
  roster: RosterMap,
): number {
  return computeTotalScore(idsToSelection(selection, roster), categories);
}

// ──────────────────────────────────────────────────────────────────────────
// Sérialisation Prisma → snapshot diffusable
// ──────────────────────────────────────────────────────────────────────────

/** Forme minimale d'un LobbyPlayer (avec username) attendue pour la sérialisation. */
export interface PlayerRow {
  userId: string;
  joinOrder: number;
  selection: unknown;
  currentDraw: unknown;
  lockedThisRound: boolean;
  finalScore: number | null;
  user: { username: string; avatarCharacter: { image: string | null } | null };
}

export interface LobbyRow {
  code: string;
  gameId: string;
  hostId: string;
  status: LobbyStatusValue;
  roundIndex: number;
  players: PlayerRow[];
}

/** Champ JSON Prisma (`Json`) → record typé, en se prémunissant des null/scalaires. */
function asRecord<T>(value: unknown): T {
  return (value && typeof value === "object" ? value : {}) as T;
}

export function serializePlayer(player: PlayerRow): SerializedPlayer {
  return {
    userId: player.userId,
    username: player.user.username,
    avatarImage: player.user.avatarCharacter?.image ?? null,
    joinOrder: player.joinOrder,
    selection: asRecord<SelectionIds>(player.selection),
    currentDraw: asRecord<DrawIds>(player.currentDraw),
    lockedThisRound: player.lockedThisRound,
    finalScore: player.finalScore,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Dérivation d'affichage (client) : tirage/sélection → cases à rendre
// ──────────────────────────────────────────────────────────────────────────

export interface BoardTile {
  category: CategoryConfig;
  /** Personnage à afficher (verrouillé → choix figé ; sinon tirage courant). */
  character: Character | null;
  locked: boolean;
}

/** Construit les cases du plateau d'un joueur (verrouillées + tirage courant). */
export function deriveBoard(
  player: SerializedPlayer,
  categories: CategoryConfig[],
  roster: RosterMap,
): BoardTile[] {
  return categories.map((category) => {
    const lockedId = player.selection[category.id];
    if (lockedId) {
      return { category, character: roster[lockedId] ?? null, locked: true };
    }
    const drawId = player.currentDraw[category.id];
    return {
      category,
      character: drawId ? (roster[drawId] ?? null) : null,
      locked: false,
    };
  });
}

export function serializeLobby(
  lobby: LobbyRow,
  totalRounds: number,
): SerializedLobby {
  return {
    code: lobby.code,
    gameId: lobby.gameId,
    hostId: lobby.hostId,
    status: lobby.status,
    roundIndex: lobby.roundIndex,
    totalRounds,
    players: [...lobby.players]
      .sort((a, b) => a.joinOrder - b.joinOrder)
      .map(serializePlayer),
  };
}
