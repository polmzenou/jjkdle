import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getCurrentUniverse } from "@/lib/universes/current";

/**
 * Accès Prisma aux lobbys multijoueur. La logique de jeu (lockstep, tirages,
 * diffusion Pusher) vit dans `actions.ts` ; ce module ne fait que lire/écrire.
 */

/**
 * Inclut les joueurs (ordonnés) + leur username + avatar POUR L'UNIVERS COURANT
 * (avatar par univers, UserUniverseProfile) pour la sérialisation. `universeId`
 * filtre le bon profil.
 */
export function lobbyInclude(universeId: string) {
  return {
    players: {
      orderBy: { joinOrder: "asc" },
      include: {
        user: {
          select: {
            username: true,
            universeProfiles: {
              where: { universeId },
              select: { avatarCharacter: { select: { image: true } } },
            },
          },
        },
      },
    },
  } satisfies Prisma.LobbyInclude;
}

export type LobbyWithPlayers = Prisma.LobbyGetPayload<{
  include: ReturnType<typeof lobbyInclude>;
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

/**
 * Lobby + joueurs par code, DANS L'UNIVERS COURANT (null si introuvable).
 *
 * Le filtre `universeId` est la garde multi-univers centrale : c'est le point
 * d'entrée unique de résolution par code pour TOUS les jeux à lobby (builder,
 * battle, guesswho, codenames). Un code appartenant à un autre univers renvoie
 * `null` — donc exactement le même comportement qu'un code inexistant, sans
 * message distinctif (aucune fuite d'information entre univers).
 */
export async function findLobby(code: string): Promise<LobbyWithPlayers | null> {
  const { id: universeId } = await getCurrentUniverse();
  return prisma.lobby.findFirst({
    where: { code: code.toUpperCase(), universeId },
    include: lobbyInclude(universeId),
  });
}

/** Crée un lobby avec un code unique et l'hôte comme premier joueur.
 * `gameId` discrimine le jeu (défaut "builder", "battle" pour JJK Random Battle). */
export async function createLobby(
  hostId: string,
  gameId = "builder",
): Promise<LobbyWithPlayers> {
  const { id: universeId } = await getCurrentUniverse();
  // Quelques tentatives en cas de collision improbable du code.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    // Unicité du code vérifiée GLOBALEMENT (tous univers confondus) : `code` est
    // @unique sans universeId, deux univers ne peuvent donc pas partager un code.
    const existing = await prisma.lobby.findUnique({ where: { code } });
    if (existing) continue;
    return prisma.lobby.create({
      data: {
        code,
        gameId,
        hostId,
        universeId,
        players: { create: { userId: hostId, joinOrder: 0 } },
      },
      include: lobbyInclude(universeId),
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
