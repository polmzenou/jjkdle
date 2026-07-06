import "server-only";
import type { GuessWhoGame } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { getRoster } from "@/lib/content/queries";
import type { Character } from "@/data/roster/characters";
import { prisma } from "@/lib/prisma";
import type { SerializedLobby } from "@/lib/multiplayer/events";
import { serializeLobby } from "@/lib/multiplayer/state";
import { findLobby } from "@/lib/multiplayer/store";
import type { GuessWhoPublicState } from "./types";

/** Données initiales d'une page de lobby « Qui est-ce ? ». */
export interface GuessWhoView {
  lobby: SerializedLobby;
  /** État public (grille + tour + statut). null tant qu'aucune partie n'a démarré. */
  publicState: GuessWhoPublicState | null;
  /** Secret du joueur COURANT uniquement (jamais celui de l'adversaire). */
  mySecretId: string | null;
  roster: Character[];
}

/**
 * Vue publique d'une partie : la grille + le tour + le statut. Les secrets ne
 * sont inclus (via `reveal`) QUE lorsque la partie est terminée.
 */
export function toPublicState(game: GuessWhoGame): GuessWhoPublicState {
  const finished = game.status === "FINISHED";
  return {
    grid: game.gridCharIds,
    currentTurn: game.currentTurn,
    status: finished ? "FINISHED" : "ACTIVE",
    winnerId: game.winnerId,
    ...(finished
      ? { reveal: { secret1Id: game.secret1Id, secret2Id: game.secret2Id } }
      : {}),
  };
}

/**
 * Secret du joueur donné uniquement (secret1 = perso de player1, etc.).
 * Renvoie null si l'utilisateur n'est pas un des deux joueurs.
 */
export function secretForUser(
  game: GuessWhoGame,
  userId: string,
): string | null {
  if (userId === game.player1Id) return game.secret1Id;
  if (userId === game.player2Id) return game.secret2Id;
  return null;
}

/** Charge l'état initial d'un lobby « Qui est-ce ? » (null si absent/autre jeu). */
export async function loadGuessWhoView(
  code: string,
): Promise<GuessWhoView | null> {
  const [lobby, roster, user] = await Promise.all([
    findLobby(code),
    getRoster(),
    getCurrentUser(),
  ]);
  // Garde le mode : un lobby d'un autre jeu ne doit pas s'ouvrir ici.
  if (!lobby || lobby.gameId !== "guesswho") return null;

  const game = await prisma.guessWhoGame.findUnique({
    where: { lobbyId: lobby.id },
  });

  return {
    lobby: serializeLobby(lobby, 0),
    publicState: game ? toPublicState(game) : null,
    // Le secret n'est révélé au joueur COURANT que si la partie est en cours
    // (une fois finie, la révélation passe par `publicState.reveal`).
    mySecretId:
      game && game.status === "ACTIVE" && user
        ? secretForUser(game, user.id)
        : null,
    roster,
  };
}
