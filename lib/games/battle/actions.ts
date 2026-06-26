"use server";

import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { getRoster } from "@/lib/content/queries";
import { prisma } from "@/lib/prisma";
import { isPusherConfigured, triggerLobby } from "@/lib/pusher/server";
import { serializeLobby, buildRosterMap } from "@/lib/multiplayer/state";
import {
  addPlayer,
  createLobby,
  deleteLobby,
  findLobby,
  removePlayer,
  type LobbyWithPlayers,
} from "@/lib/multiplayer/store";
import type { MpResult } from "@/lib/multiplayer/actions";
import { BATTLE_EVENTS } from "./events";
import { parseBattleState } from "./state";
import { computeBattleResult } from "./scoring";
import { pickCard, randomSeed } from "./rng";
import {
  BATTLE_PLAYERS,
  DECK_SIZE,
  type BattleDecision,
  type BattleMode,
  type BattleState,
  type BattleStatePayload,
} from "./types";

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/** Cast d'un état typé vers le type JSON attendu par Prisma (champs optionnels). */
function toJson(value: BattleState | object): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

/** Sérialise et diffuse l'état (lobby + gameState) à tous les membres. */
async function broadcastBattle(
  code: string,
  preloaded?: { lobby?: LobbyWithPlayers | null; gameState?: BattleState | null },
): Promise<void> {
  const lobby = preloaded?.lobby ?? (await findLobby(code));
  if (!lobby) return;
  const gameState =
    preloaded && "gameState" in preloaded
      ? (preloaded.gameState ?? null)
      : parseBattleState(lobby.gameState);
  const payload: BattleStatePayload = {
    lobby: serializeLobby(lobby, 0),
    gameState,
  };
  await triggerLobby(code, BATTLE_EVENTS.state, payload);
}

/** Crée un lobby « JJK Random Battle » et y place l'hôte. */
export async function createBattleLobbyAction(): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, needsAuth: true, error: "Connecte-toi pour jouer en multi." };
  }
  if (!isPusherConfigured()) {
    return { ok: false, error: "Le mode multijoueur n'est pas configuré sur ce serveur." };
  }
  const lobby = await createLobby(user.id, "battle");
  return { ok: true, code: lobby.code };
}

/** Rejoint un lobby battle via son code (1v1 : 2 joueurs max). */
export async function joinBattleLobbyAction(codeRaw: string): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, needsAuth: true, error: "Connecte-toi pour jouer en multi." };
  }

  const code = normalizeCode(codeRaw);
  if (!code) return { ok: false, error: "Entre un code de lobby." };

  const lobby = await findLobby(code);
  if (!lobby) return { ok: false, error: "Lobby introuvable." };

  if (lobby.players.some((p) => p.userId === user.id)) return { ok: true, code };
  if (lobby.status !== "WAITING") {
    return { ok: false, error: "La partie a déjà commencé." };
  }
  if (lobby.players.length >= BATTLE_PLAYERS) {
    return { ok: false, error: "Lobby complet (2 joueurs max)." };
  }

  await addPlayer(lobby.id, user.id, lobby.players.length);
  await broadcastBattle(code);
  return { ok: true, code };
}

/** Démarre la partie : init de l'état de draft (hôte commence). */
export async function startBattleAction(
  codeRaw: string,
  hardcore = false,
): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby) return { ok: false, error: "Lobby introuvable." };
  if (lobby.hostId !== user.id) return { ok: false, error: "Seul l'hôte peut démarrer." };
  if (lobby.status !== "WAITING") return { ok: false, error: "Partie déjà démarrée." };
  if (lobby.players.length !== BATTLE_PLAYERS) {
    return { ok: false, error: "Il faut exactement 2 joueurs." };
  }

  const roster = await getRoster();
  const ids = roster.map((c) => c.id);
  const seed = randomSeed();
  const decks: Record<string, string[]> = {};
  for (const p of lobby.players) decks[p.userId] = [];

  const mode: BattleMode = hardcore ? "hardcore" : "normal";
  const state: BattleState = {
    phase: "DRAFT",
    mode,
    seed,
    drawCount: 1, // 0 sert au tirage de la 1ère carte ci-dessous
    currentCardId: pickCard(seed, 0, ids),
    activeUserId: lobby.hostId,
    decks,
  };

  await prisma.lobby.update({
    where: { id: lobby.id },
    data: { status: "PLAYING", gameState: toJson(state) },
  });
  await broadcastBattle(code, { gameState: state });
  return { ok: true };
}

/** Action de draft : garder la carte ou la donner à l'adversaire. */
export async function decideAction(
  codeRaw: string,
  decision: BattleDecision,
): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby) return { ok: false, error: "Lobby introuvable." };
  if (lobby.status !== "PLAYING") return { ok: false, error: "La partie n'est pas en cours." };

  const opponent = lobby.players.find((p) => p.userId !== user.id);
  if (!opponent) return { ok: false, error: "Adversaire introuvable." };

  const roster = await getRoster();
  const ids = roster.map((c) => c.id);

  let next: BattleState | null = null;
  let rejection: string | null = null;

  // Transaction : on relit l'état frais et on garde contre le double-clic
  // (drawCount) et le hors-tour (activeUserId) avant d'écrire.
  await prisma.$transaction(async (tx) => {
    const fresh = await tx.lobby.findUnique({
      where: { id: lobby.id },
      select: { gameState: true, status: true },
    });
    if (!fresh || fresh.status !== "PLAYING") return;

    const state = parseBattleState(fresh.gameState);
    if (!state || state.phase !== "DRAFT") {
      rejection = "La phase de draft est terminée.";
      return;
    }
    if (state.activeUserId !== user.id) {
      rejection = "Ce n'est pas ton tour.";
      return;
    }
    if (!state.currentCardId) {
      rejection = "Aucune carte à jouer.";
      return;
    }

    const recipientId = decision === "keep" ? user.id : opponent.userId;
    const recipientDeck = state.decks[recipientId] ?? [];
    if (recipientDeck.length >= DECK_SIZE) {
      rejection = "Ce deck est déjà plein.";
      return;
    }

    const decks: Record<string, string[]> = {
      ...state.decks,
      [recipientId]: [...recipientDeck, state.currentCardId],
    };
    const allFull = lobby.players.every(
      (p) => (decks[p.userId]?.length ?? 0) >= DECK_SIZE,
    );

    if (allFull) {
      const result = computeBattleResult(decks, buildRosterMap(roster), state.mode);
      next = { ...state, decks, currentCardId: null, phase: "COMBAT", result };
    } else {
      // Tour suivant : on alterne, mais on saute l'adversaire si son deck est plein
      // (il ne pourrait que « donner ») pour le confier à celui qui peut agir.
      const nextActive =
        (decks[opponent.userId]?.length ?? 0) >= DECK_SIZE
          ? user.id
          : opponent.userId;
      // pickCard indexe un mélange fixé par la graine via drawCount → tirage
      // sans doublon tant que drawCount < taille du roster (toujours le cas ici).
      next = {
        ...state,
        decks,
        currentCardId: pickCard(state.seed, state.drawCount, ids),
        drawCount: state.drawCount + 1,
        activeUserId: nextActive,
      };
    }

    await tx.lobby.update({
      where: { id: lobby.id },
      data: { gameState: toJson(next) },
    });
  });

  if (rejection) return { ok: false, error: rejection };
  if (!next) return { ok: true }; // état déjà avancé (double-clic) : no-op

  // `lobby` est encore exact pour la sérialisation (statut/joueurs inchangés) :
  // on le réutilise pour éviter une relecture sur le chemin chaud du draft.
  await broadcastBattle(code, { lobby, gameState: next });
  return { ok: true };
}

/** Fin de l'animation de combat → écran de résultat (idempotent). */
export async function finishCombatAction(codeRaw: string): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby) return { ok: true };

  const state = parseBattleState(lobby.gameState);
  if (!state || state.phase !== "COMBAT") return { ok: true };

  const next: BattleState = { ...state, phase: "RESULT" };
  await prisma.lobby.updateMany({
    where: { id: lobby.id, status: "PLAYING" },
    data: { gameState: toJson(next), status: "FINISHED" },
  });
  await broadcastBattle(code, { gameState: next });
  return { ok: true };
}

/** Relance une partie dans le même lobby (hôte uniquement). */
export async function playAgainBattleAction(codeRaw: string): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby) return { ok: false, error: "Lobby introuvable." };
  if (lobby.hostId !== user.id) return { ok: false, error: "Seul l'hôte peut relancer." };

  await prisma.lobby.update({
    where: { id: lobby.id },
    data: { status: "WAITING", gameState: toJson({}) },
  });
  await broadcastBattle(code, { gameState: null });
  return { ok: true };
}

/** Retire un joueur du lobby battle ; ramène le joueur restant au salon. */
async function applyLeave(
  lobby: LobbyWithPlayers,
  userId: string,
): Promise<void> {
  await removePlayer(lobby.id, userId);

  const remaining = lobby.players.filter((p) => p.userId !== userId);
  if (remaining.length === 0) {
    await deleteLobby(lobby.id);
    return;
  }

  const data: {
    hostId?: string;
    status?: "WAITING";
    gameState?: Prisma.InputJsonValue;
  } = {};
  if (lobby.hostId === userId) {
    data.hostId = remaining.sort((a, b) => a.joinOrder - b.joinOrder)[0].userId;
  }
  // Départ en cours de partie → retour au salon d'attente (même code).
  if (lobby.status !== "WAITING") {
    data.status = "WAITING";
    data.gameState = toJson({});
  }
  if (Object.keys(data).length > 0) {
    await prisma.lobby.update({ where: { id: lobby.id }, data });
  }
  await broadcastBattle(lobby.code);
}

/** Quitte volontairement le lobby battle. */
export async function leaveBattleAction(codeRaw: string): Promise<MpResult> {
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
 * (fermeture d'onglet/déconnexion) : retire le joueur parti et ramène au salon.
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
  // L'appelant doit être membre ; le parti doit encore figurer dans le lobby.
  if (!lobby.players.some((p) => p.userId === user.id)) return { ok: true };
  if (!lobby.players.some((p) => p.userId === leftUserId)) return { ok: true };

  await applyLeave(lobby, leftUserId);
  return { ok: true };
}
