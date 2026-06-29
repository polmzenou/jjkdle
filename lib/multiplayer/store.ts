import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Accès Prisma aux lobbys multijoueur. La logique de jeu (lockstep, tirages,
 * diffusion Pusher) vit dans `actions.ts` ; ce module ne fait que lire/écrire.
 */

/** Inclut les joueurs (ordonnés) + leur username + avatar pour la sérialisation. */
export const lobbyInclude = {
  players: {
    orderBy: { joinOrder: "asc" },
    include: {
      user: {
        select: {
          username: true,
          avatarCharacter: { select: { image: true } },
        },
      },
    },
  },
} satisfies Prisma.LobbyInclude;

export type LobbyWithPlayers = Prisma.LobbyGetPayload<{
  include: typeof lobbyInclude;
}>;

/** Caractères du code (sans 0/O/1/I pour éviter les confusions). */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

/** Lobby + joueurs par code (null si introuvable). */
export function findLobby(code: string): Promise<LobbyWithPlayers | null> {
  return prisma.lobby.findUnique({
    where: { code: code.toUpperCase() },
    include: lobbyInclude,
  });
}

/** Crée un lobby avec un code unique et l'hôte comme premier joueur.
 * `gameId` discrimine le jeu (défaut "builder", "battle" pour JJK Random Battle). */
export async function createLobby(
  hostId: string,
  gameId = "builder",
): Promise<LobbyWithPlayers> {
  // Quelques tentatives en cas de collision improbable du code.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const existing = await prisma.lobby.findUnique({ where: { code } });
    if (existing) continue;
    return prisma.lobby.create({
      data: {
        code,
        gameId,
        hostId,
        players: { create: { userId: hostId, joinOrder: 0 } },
      },
      include: lobbyInclude,
    });
  }
  throw new Error("Impossible de générer un code de lobby unique, réessaie.");
}

/** Ajoute un joueur (joinOrder = nombre de joueurs actuels). */
export function addPlayer(
  lobbyId: string,
  userId: string,
  joinOrder: number,
): Promise<unknown> {
  return prisma.lobbyPlayer.create({
    data: { lobbyId, userId, joinOrder },
  });
}

/** Retire un joueur d'un lobby. */
export function removePlayer(lobbyId: string, userId: string): Promise<unknown> {
  return prisma.lobbyPlayer.deleteMany({ where: { lobbyId, userId } });
}

/** Supprime entièrement un lobby (cascade sur les joueurs). */
export function deleteLobby(lobbyId: string): Promise<unknown> {
  return prisma.lobby.delete({ where: { id: lobbyId } });
}
