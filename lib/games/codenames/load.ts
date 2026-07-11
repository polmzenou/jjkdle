import "server-only";
import type { CodenamesGame } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { getRoster } from "@/lib/content/queries";
import type { Character } from "@/data/roster/characters";
import { prisma } from "@/lib/prisma";
import type { SerializedLobby } from "@/lib/multiplayer/events";
import { serializeLobby } from "@/lib/multiplayer/state";
import { findLobby, type LobbyWithPlayers } from "@/lib/multiplayer/store";
import type {
  CardColor,
  Clue,
  CodenamesPublicState,
  CodenamesRole,
  ColorKey,
  Team,
  TeamSelectState,
} from "./types";

/** Données initiales d'une page de lobby « JJK Codenames ». */
export interface CodenamesView {
  lobby: SerializedLobby;
  /** État public (grille + scores + tour). null tant qu'aucune partie n'a démarré. */
  publicState: CodenamesPublicState | null;
  /** État de la sélection d'équipe (phase transitoire), ou null. */
  teamSelect: TeamSelectState | null;
  /** Rôle du joueur COURANT (équipe + maître-espion ou non). */
  myRole: CodenamesRole | null;
  roster: Character[];
}

/** Champ JSON Prisma → objet typé (défensif contre null/scalaire). */
function asColorKey(value: unknown): ColorKey {
  return (value && typeof value === "object" ? value : {}) as ColorKey;
}
function asTeams(value: unknown): Record<string, Team> {
  return (value && typeof value === "object" ? value : {}) as Record<string, Team>;
}
function asClue(value: unknown): Clue | null {
  return value && typeof value === "object" ? (value as Clue) : null;
}

/** Extrait l'état de sélection d'équipe depuis `Lobby.gameState`, ou null. */
export function teamSelectFromGameState(gameState: unknown): TeamSelectState | null {
  if (
    gameState &&
    typeof gameState === "object" &&
    (gameState as { phase?: unknown }).phase === "TEAM_SELECT"
  ) {
    const gs = gameState as Partial<TeamSelectState>;
    return {
      phase: "TEAM_SELECT",
      assignments: gs.assignments ?? {},
    };
  }
  return null;
}

/**
 * Vue publique d'une partie : grille + scores + tour + cartes révélées (avec leur
 * couleur). La carte-clé complète n'est incluse (via `reveal`) QUE lorsque la
 * partie est terminée.
 */
export function toPublicState(game: CodenamesGame): CodenamesPublicState {
  const finished = game.status === "FINISHED";
  const colorKey = asColorKey(game.colorKey);
  // Couleur individuelle de chaque carte déjà révélée (publiquement connue).
  const revealed: Record<string, CardColor> = {};
  for (const id of game.revealedIds) {
    if (colorKey[id]) revealed[id] = colorKey[id];
  }
  return {
    grid: game.gridCharIds,
    revealed,
    redScore: game.redScore,
    purpleScore: game.purpleScore,
    currentTeam: game.currentTeam as Team,
    currentClue: asClue(game.currentClue),
    passedAgentIds: game.passedAgentIds,
    redSpymasterId: game.redSpymasterId,
    purpleSpymasterId: game.purpleSpymasterId,
    teams: asTeams(game.teams),
    status: finished ? "FINISHED" : "ACTIVE",
    winnerTeam: (game.winnerTeam as Team | null) ?? null,
    ...(finished ? { reveal: { colorKey } } : {}),
  };
}

/** Rôle d'un joueur dans la partie (équipe + s'il est maître-espion). */
export function roleForUser(
  game: CodenamesGame,
  userId: string,
): CodenamesRole {
  const teams = asTeams(game.teams);
  const team = teams[userId] ?? null;
  const isSpymaster =
    userId === game.redSpymasterId || userId === game.purpleSpymasterId;
  return { team, isSpymaster };
}

/** Charge l'état initial d'un lobby « JJK Codenames » (null si absent/autre jeu). */
export async function loadCodenamesView(
  code: string,
): Promise<CodenamesView | null> {
  const [lobby, roster, user] = await Promise.all([
    findLobby(code),
    getRoster(),
    getCurrentUser(),
  ]);
  // Garde le mode : un lobby d'un autre jeu ne doit pas s'ouvrir ici.
  if (!lobby || lobby.gameId !== "codenames") return null;

  const game = await prisma.codenamesGame.findUnique({
    where: { lobbyId: lobby.id },
  });

  return {
    lobby: serializeLobby(lobby as LobbyWithPlayers, 0),
    publicState: game ? toPublicState(game) : null,
    teamSelect: teamSelectFromGameState(lobby.gameState),
    myRole: game && user ? roleForUser(game, user.id) : null,
    roster,
  };
}
