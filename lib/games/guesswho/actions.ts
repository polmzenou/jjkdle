"use server";

import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { getRoster } from "@/lib/content/queries";
import { prisma } from "@/lib/prisma";
import { isPusherConfigured, triggerLobby } from "@/lib/pusher/server";
import { serializeLobby } from "@/lib/multiplayer/state";
import {
  addPlayer,
  createLobby,
  deleteLobby,
  findLobby,
  removePlayer,
  type LobbyWithPlayers,
} from "@/lib/multiplayer/store";
import type { MpResult } from "@/lib/multiplayer/actions";
import { awardExp, refreshLevelAndBadges } from "@/lib/progress/recompute";
import { guessWhoLossExp, guessWhoWinExp } from "@/lib/progress/exp-rewards";
import { GUESSWHO_EVENTS } from "./events";
import { secretForUser, toPublicState } from "./load";
import {
  GUESSWHO_CHAT_MAX,
  GUESSWHO_GRID,
  GUESSWHO_PLAYERS,
  type GuessWhoChatMessage,
  type GuessWhoEliminationsPayload,
  type GuessWhoGuessResultPayload,
  type GuessWhoStartPayload,
  type GuessWhoStatePayload,
  type GuessWhoTurnPayload,
} from "./types";

/** Résultat de `getMySecretAction` : secret du joueur appelant uniquement. */
export type SecretResult =
  | { ok: true; secretId: string | null }
  | { ok: false; error?: string; needsAuth?: boolean };

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/** Mélange de Fisher-Yates (copie). */
function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Diffuse le snapshot du salon (lobby + état public éventuel). */
async function broadcastState(
  code: string,
  preloaded?: LobbyWithPlayers | null,
): Promise<void> {
  const lobby = preloaded ?? (await findLobby(code));
  if (!lobby) return;
  const game = await prisma.guessWhoGame.findUnique({
    where: { lobbyId: lobby.id },
  });
  const payload: GuessWhoStatePayload = {
    lobby: serializeLobby(lobby, 0),
    publicState: game ? toPublicState(game) : null,
  };
  await triggerLobby(code, GUESSWHO_EVENTS.state, payload);
}

/** Crée un lobby « Qui est-ce ? » et y place l'hôte. */
export async function createGuessWhoLobbyAction(): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, needsAuth: true, error: "Connecte-toi pour jouer en multi." };
  }
  if (!isPusherConfigured()) {
    return { ok: false, error: "Le mode multijoueur n'est pas configuré sur ce serveur." };
  }
  const lobby = await createLobby(user.id, "guesswho");
  return { ok: true, code: lobby.code };
}

/** Rejoint un lobby « Qui est-ce ? » via son code (1v1 : 2 joueurs max). */
export async function joinGuessWhoLobbyAction(codeRaw: string): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, needsAuth: true, error: "Connecte-toi pour jouer en multi." };
  }

  const code = normalizeCode(codeRaw);
  if (!code) return { ok: false, error: "Entre un code de lobby." };

  const lobby = await findLobby(code);
  if (!lobby) return { ok: false, error: "Lobby introuvable." };
  if (lobby.gameId !== "guesswho") return { ok: false, error: "Ce lobby n'est pas un « Qui est-ce ? »." };

  if (lobby.players.some((p) => p.userId === user.id)) return { ok: true, code };
  if (lobby.status !== "WAITING") {
    return { ok: false, error: "La partie a déjà commencé." };
  }
  if (lobby.players.length >= GUESSWHO_PLAYERS) {
    return { ok: false, error: "Lobby complet (2 joueurs max)." };
  }

  await addPlayer(lobby.id, user.id, lobby.players.length);
  await broadcastState(code);
  return { ok: true, code };
}

/** Démarre la partie : tire la grille 5×5 partagée + un secret distinct par joueur. */
export async function startGuessWhoAction(codeRaw: string): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby) return { ok: false, error: "Lobby introuvable." };
  if (lobby.gameId !== "guesswho") return { ok: false, error: "Lobby invalide." };
  if (lobby.hostId !== user.id) return { ok: false, error: "Seul l'hôte peut démarrer." };
  if (lobby.status !== "WAITING") return { ok: false, error: "Partie déjà démarrée." };
  if (lobby.players.length !== GUESSWHO_PLAYERS) {
    return { ok: false, error: "Il faut exactement 2 joueurs." };
  }

  const roster = await getRoster();
  if (roster.length < GUESSWHO_GRID) {
    return {
      ok: false,
      error: `Il faut au moins ${GUESSWHO_GRID} personnages dans le roster pour jouer.`,
    };
  }

  // Grille partagée : 25 IDs tirés au hasard (ordre identique pour les 2 joueurs).
  const grid = shuffle(roster.map((c) => c.id)).slice(0, GUESSWHO_GRID);
  // Deux secrets DISTINCTS parmi la grille (chacun devinera celui de l'autre).
  const [secret1Id, secret2Id] = shuffle(grid).slice(0, 2);

  const player1Id = lobby.hostId;
  const player2Id = lobby.players.find((p) => p.userId !== player1Id)!.userId;

  // Transaction : création de la partie + passage du lobby en PLAYING.
  await prisma.$transaction([
    prisma.guessWhoGame.create({
      data: {
        lobbyId: lobby.id,
        player1Id,
        player2Id,
        gridCharIds: grid,
        secret1Id,
        secret2Id,
        currentTurn: player1Id, // l'hôte commence
      },
    }),
    prisma.lobby.update({
      where: { id: lobby.id },
      data: { status: "PLAYING" },
    }),
  ]);

  // On relit le lobby (statut à jour) pour le snapshot ; PAS de secret ici.
  const fresh = await findLobby(code);
  const payload: GuessWhoStartPayload = {
    lobby: serializeLobby(fresh ?? lobby, 0),
    grid,
    currentTurn: player1Id,
  };
  await triggerLobby(code, GUESSWHO_EVENTS.start, payload);
  return { ok: true };
}

/** Renvoie UNIQUEMENT le secret du joueur appelant (jamais celui de l'adversaire). */
export async function getMySecretAction(codeRaw: string): Promise<SecretResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby || lobby.gameId !== "guesswho") return { ok: false, error: "Lobby introuvable." };
  if (!lobby.players.some((p) => p.userId === user.id)) {
    return { ok: false, error: "Tu ne fais pas partie de ce lobby." };
  }

  const game = await prisma.guessWhoGame.findUnique({
    where: { lobbyId: lobby.id },
  });
  if (!game) return { ok: true, secretId: null };

  const secretId =
    user.id === game.player1Id
      ? game.secret1Id
      : user.id === game.player2Id
        ? game.secret2Id
        : null;
  return { ok: true, secretId };
}

export async function peekAction(codeRaw: string): Promise<{ id: string | null }> {
  const user = await getCurrentUser();
  if (!user) return { id: null };
  const lobby = await findLobby(normalizeCode(codeRaw));
  if (!lobby || lobby.gameId !== "guesswho") return { id: null };
  const game = await prisma.guessWhoGame.findUnique({ where: { lobbyId: lobby.id } });
  if (!game) return { id: null };
  const opponentId =
    user.id === game.player1Id
      ? game.player2Id
      : user.id === game.player2Id
        ? game.player1Id
        : null;
  return { id: opponentId ? secretForUser(game, opponentId) : null };
}

/** Passe le tour à l'adversaire (uniquement pendant son propre tour). */
export async function passTurnAction(codeRaw: string): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby || lobby.gameId !== "guesswho") return { ok: false, error: "Lobby introuvable." };

  const game = await prisma.guessWhoGame.findUnique({
    where: { lobbyId: lobby.id },
  });
  if (!game || game.status !== "ACTIVE") return { ok: false, error: "La partie n'est pas en cours." };
  if (game.currentTurn !== user.id) return { ok: false, error: "Ce n'est pas ton tour." };

  const nextTurn = user.id === game.player1Id ? game.player2Id : game.player1Id;

  // Garde anti-double-clic : seul le tour courant peut avancer.
  const { count } = await prisma.guessWhoGame.updateMany({
    where: { id: game.id, status: "ACTIVE", currentTurn: user.id },
    data: { currentTurn: nextTurn },
  });
  if (count === 0) return { ok: true }; // déjà avancé

  const payload: GuessWhoTurnPayload = { currentTurn: nextTurn };
  await triggerLobby(code, GUESSWHO_EVENTS.turnPassed, payload);
  return { ok: true };
}

/** Devine le secret de l'adversaire (validé serveur → fin de partie immédiate). */
export async function guessAction(
  codeRaw: string,
  guessedId: string,
): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby || lobby.gameId !== "guesswho") return { ok: false, error: "Lobby introuvable." };

  const game = await prisma.guessWhoGame.findUnique({
    where: { lobbyId: lobby.id },
  });
  if (!game || game.status !== "ACTIVE") return { ok: false, error: "La partie n'est pas en cours." };
  if (game.currentTurn !== user.id) return { ok: false, error: "Ce n'est pas ton tour." };
  if (!game.gridCharIds.includes(guessedId)) {
    return { ok: false, error: "Ce personnage n'est pas dans la grille." };
  }

  const isPlayer1 = user.id === game.player1Id;
  const opponentId = isPlayer1 ? game.player2Id : game.player1Id;
  // player1 doit deviner le secret de player2 (secret2Id), et inversement.
  const opponentSecret = isPlayer1 ? game.secret2Id : game.secret1Id;
  const correct = guessedId === opponentSecret;
  const winnerId = correct ? user.id : opponentId;
  const loserId = correct ? opponentId : user.id;

  // Idempotence : seule la 1ʳᵉ résolution (status encore ACTIVE) écrit et compte.
  const { count } = await prisma.guessWhoGame.updateMany({
    where: { id: game.id, status: "ACTIVE" },
    data: { status: "FINISHED", winnerId },
  });
  if (count === 0) return { ok: true }; // spam / double-clic : partie déjà finie

  // Persistance des scores (une ligne par joueur) + XP (victoire > défaite).
  await prisma.guessWhoScore.createMany({
    data: [
      { userId: winnerId, won: true },
      { userId: loserId, won: false },
    ],
  });
  await Promise.all([
    awardExp(winnerId, guessWhoWinExp()),
    awardExp(loserId, guessWhoLossExp()),
  ]);
  await Promise.all([
    refreshLevelAndBadges(winnerId),
    refreshLevelAndBadges(loserId),
  ]);

  const payload: GuessWhoGuessResultPayload = {
    status: "FINISHED",
    winnerId,
    guessById: user.id,
    correct,
    secret1Id: game.secret1Id,
    secret2Id: game.secret2Id,
  };
  await triggerLobby(code, GUESSWHO_EVENTS.guessResult, payload);
  return { ok: true };
}

/** Envoie un message de chat intégré (éphémère, non persisté). */
export async function sendChatAction(
  codeRaw: string,
  textRaw: string,
): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby || lobby.gameId !== "guesswho") return { ok: false, error: "Lobby introuvable." };
  if (!lobby.players.some((p) => p.userId === user.id)) {
    return { ok: false, error: "Tu ne fais pas partie de ce lobby." };
  }

  const text = textRaw.trim().slice(0, GUESSWHO_CHAT_MAX);
  if (!text) return { ok: true };

  const message: GuessWhoChatMessage = {
    userId: user.id,
    username: user.username,
    text,
    at: Date.now(),
  };
  await triggerLobby(code, GUESSWHO_EVENTS.chat, message);
  return { ok: true };
}

/**
 * Diffuse les éliminations (cartes grisées) du joueur appelant : l'adversaire
 * suit ainsi son plateau en direct. Éphémère (non persisté), comme le chat.
 */
export async function updateEliminationsAction(
  codeRaw: string,
  eliminatedIdsRaw: string[],
): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby || lobby.gameId !== "guesswho") return { ok: false, error: "Lobby introuvable." };
  if (!lobby.players.some((p) => p.userId === user.id)) {
    return { ok: false, error: "Tu ne fais pas partie de ce lobby." };
  }

  // Défensif : on borne à la taille de grille et on ne garde que des chaînes.
  const eliminatedIds = Array.from(
    new Set(eliminatedIdsRaw.filter((id) => typeof id === "string")),
  ).slice(0, GUESSWHO_GRID);

  const payload: GuessWhoEliminationsPayload = { userId: user.id, eliminatedIds };
  await triggerLobby(code, GUESSWHO_EVENTS.eliminations, payload);
  return { ok: true };
}

/** Relance une partie dans le même lobby (hôte uniquement). */
export async function playAgainGuessWhoAction(codeRaw: string): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby || lobby.gameId !== "guesswho") return { ok: false, error: "Lobby introuvable." };
  if (lobby.hostId !== user.id) return { ok: false, error: "Seul l'hôte peut relancer." };

  await prisma.$transaction([
    prisma.guessWhoGame.deleteMany({ where: { lobbyId: lobby.id } }),
    prisma.lobby.update({ where: { id: lobby.id }, data: { status: "WAITING" } }),
  ]);
  await broadcastState(code);
  return { ok: true };
}

/** Retire un joueur du lobby ; ramène le joueur restant au salon (forfait). */
async function applyLeave(
  lobby: LobbyWithPlayers,
  userId: string,
): Promise<void> {
  await removePlayer(lobby.id, userId);

  const remaining = lobby.players.filter((p) => p.userId !== userId);
  if (remaining.length === 0) {
    // La suppression du lobby cascade sur les joueurs ; la partie liée reste
    // orpheline (lobbyId non contraint) mais sans impact — on la nettoie.
    await prisma.guessWhoGame.deleteMany({ where: { lobbyId: lobby.id } });
    await deleteLobby(lobby.id);
    return;
  }

  const data: { hostId?: string; status?: "WAITING" } = {};
  if (lobby.hostId === userId) {
    data.hostId = remaining.sort((a, b) => a.joinOrder - b.joinOrder)[0].userId;
  }
  // Départ en cours de partie → retour au salon d'attente (même code), partie annulée.
  if (lobby.status !== "WAITING") {
    data.status = "WAITING";
    await prisma.guessWhoGame.deleteMany({ where: { lobbyId: lobby.id } });
  }
  if (Object.keys(data).length > 0) {
    await prisma.lobby.update({ where: { id: lobby.id }, data });
  }
  await broadcastState(lobby.code);
}

/** Quitte volontairement le lobby « Qui est-ce ? ». */
export async function leaveGuessWhoAction(codeRaw: string): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby) return { ok: true };
  if (!lobby.players.some((p) => p.userId === user.id)) return { ok: true };

  await applyLeave(lobby, user.id);
  return { ok: true };
}

/**
 * Déclenchée par le joueur restant quand la présence de l'adversaire disparaît
 * (fermeture d'onglet/déconnexion) : retire le parti et ramène au salon.
 */
export async function handleOpponentLeftAction(
  codeRaw: string,
  leftUserId: string,
): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };
  if (leftUserId === user.id) return { ok: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby) return { ok: true };
  if (!lobby.players.some((p) => p.userId === user.id)) return { ok: true };
  if (!lobby.players.some((p) => p.userId === leftUserId)) return { ok: true };

  await applyLeave(lobby, leftUserId);
  return { ok: true };
}
