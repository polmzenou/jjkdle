"use server";

import { Prisma } from "@prisma/client";
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
import { codenamesLossExp, codenamesWinExp } from "@/lib/progress/exp-rewards";
import { CODENAMES_EVENTS } from "./events";
import {
  roleForUser,
  teamSelectFromGameState,
  toPublicState,
} from "./load";
import {
  agentIdsOf,
  autoBalance,
  balanceViolations,
  buildColorKey,
  canJoinTeam,
  checkWin,
  otherTeam,
  resolveReveal,
  shuffle,
} from "./logic";
import {
  CODENAMES_CHAT_MAX,
  CODENAMES_GRID,
  CODENAMES_MAX_PLAYERS,
  CODENAMES_MIN_PLAYERS,
  type CardColor,
  type Clue,
  type CodenamesChatMessage,
  type CodenamesCluePayload,
  type CodenamesEndPayload,
  type CodenamesPassPayload,
  type CodenamesRevealPayload,
  type CodenamesStartPayload,
  type CodenamesStatePayload,
  type CodenamesTeamSelectPayload,
  type ColorKey,
  type Team,
  type TeamAssignment,
  type TeamSelectState,
} from "./types";

/** Résultat de `getKeyCardAction` : carte-clé complète (maîtres-espions uniquement). */
export type KeyCardResult =
  | { ok: true; colorKey: ColorKey | null }
  | { ok: false; error?: string; needsAuth?: boolean };

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/** Écrit l'état de sélection dans `Lobby.gameState` (cast Json). */
function teamSelectJson(assignments: Record<string, TeamAssignment>) {
  return {
    phase: "TEAM_SELECT",
    assignments,
  } as unknown as Prisma.InputJsonValue;
}

/** Diffuse le snapshot du salon (lobby + état public + sélection d'équipe). */
async function broadcastState(
  code: string,
  preloaded?: LobbyWithPlayers | null,
): Promise<void> {
  const lobby = preloaded ?? (await findLobby(code));
  if (!lobby) return;
  const game = await prisma.codenamesGame.findUnique({
    where: { lobbyId: lobby.id },
  });
  const payload: CodenamesStatePayload = {
    lobby: serializeLobby(lobby, 0),
    publicState: game ? toPublicState(game) : null,
    teamSelect: teamSelectFromGameState(lobby.gameState),
  };
  await triggerLobby(code, CODENAMES_EVENTS.state, payload);
}

/** Diffuse l'état de sélection d'équipe en direct (lobby + assignations). */
async function broadcastTeamSelect(
  code: string,
  preloaded?: LobbyWithPlayers | null,
): Promise<void> {
  const lobby = preloaded ?? (await findLobby(code));
  if (!lobby) return;
  const teamSelect = teamSelectFromGameState(lobby.gameState);
  if (!teamSelect) return;
  const payload: CodenamesTeamSelectPayload = {
    lobby: serializeLobby(lobby, 0),
    teamSelect,
  };
  await triggerLobby(code, CODENAMES_EVENTS.teamSelect, payload);
}

// ──────────────────────────────────────────────────────────────────────────
// Lobby : création / rejoindre
// ──────────────────────────────────────────────────────────────────────────

/** Crée un lobby « JJK Codenames » et y place l'hôte. */
export async function createCodenamesLobbyAction(): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, needsAuth: true, error: "Connecte-toi pour jouer en multi." };
  }
  if (!isPusherConfigured()) {
    return { ok: false, error: "Le mode multijoueur n'est pas configuré sur ce serveur." };
  }
  const lobby = await createLobby(user.id, "codenames");
  return { ok: true, code: lobby.code };
}

/** Rejoint un lobby « JJK Codenames » via son code (6 joueurs max). */
export async function joinCodenamesLobbyAction(codeRaw: string): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, needsAuth: true, error: "Connecte-toi pour jouer en multi." };
  }

  const code = normalizeCode(codeRaw);
  if (!code) return { ok: false, error: "Entre un code de lobby." };

  const lobby = await findLobby(code);
  if (!lobby) return { ok: false, error: "Lobby introuvable." };
  if (lobby.gameId !== "codenames") {
    return { ok: false, error: "Ce lobby n'est pas un « JJK Codenames »." };
  }

  if (lobby.players.some((p) => p.userId === user.id)) return { ok: true, code };
  if (lobby.status !== "WAITING") {
    return { ok: false, error: "La partie a déjà commencé." };
  }
  // On ferme les arrivées dès que la sélection d'équipe a commencé.
  if (teamSelectFromGameState(lobby.gameState)) {
    return { ok: false, error: "La sélection d'équipe a déjà commencé." };
  }
  if (lobby.players.length >= CODENAMES_MAX_PLAYERS) {
    return { ok: false, error: `Lobby complet (${CODENAMES_MAX_PLAYERS} joueurs max).` };
  }

  await addPlayer(lobby.id, user.id, lobby.players.length);
  await broadcastState(code);
  return { ok: true, code };
}

// ──────────────────────────────────────────────────────────────────────────
// Phase de sélection d'équipe (état dans Lobby.gameState)
// ──────────────────────────────────────────────────────────────────────────

/** Passe le lobby en sélection d'équipe (hôte, ≥ 4 joueurs). */
export async function enterTeamSelectAction(codeRaw: string): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby || lobby.gameId !== "codenames") return { ok: false, error: "Lobby introuvable." };
  if (lobby.hostId !== user.id) return { ok: false, error: "Seul l'hôte peut lancer la sélection." };
  if (lobby.status !== "WAITING") return { ok: false, error: "Partie déjà démarrée." };
  if (lobby.players.length < CODENAMES_MIN_PLAYERS) {
    return { ok: false, error: `Il faut au moins ${CODENAMES_MIN_PLAYERS} joueurs.` };
  }

  await prisma.lobby.update({
    where: { id: lobby.id },
    data: { gameState: teamSelectJson({}) },
  });
  await broadcastTeamSelect(code);
  return { ok: true };
}

/** Ramène le lobby au salon d'attente depuis la sélection (hôte). */
export async function backToWaitingAction(codeRaw: string): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby || lobby.gameId !== "codenames") return { ok: false, error: "Lobby introuvable." };
  if (lobby.hostId !== user.id) return { ok: false, error: "Seul l'hôte peut revenir au salon." };

  await prisma.lobby.update({
    where: { id: lobby.id },
    data: { gameState: {} },
  });
  await broadcastState(code);
  return { ok: true };
}

/** Choisit son équipe (validé serveur : équilibre des effectifs ≤ 1). */
export async function chooseTeamAction(
  codeRaw: string,
  team: Team,
): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };
  if (team !== "RED" && team !== "PURPLE") return { ok: false, error: "Équipe invalide." };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby || lobby.gameId !== "codenames") return { ok: false, error: "Lobby introuvable." };
  if (!lobby.players.some((p) => p.userId === user.id)) {
    return { ok: false, error: "Tu ne fais pas partie de ce lobby." };
  }
  const ts = teamSelectFromGameState(lobby.gameState);
  if (!ts) return { ok: false, error: "La sélection d'équipe n'est pas ouverte." };

  const playerIds = lobby.players.map((p) => p.userId);
  const prev = ts.assignments[user.id];
  // Si le joueur est déjà dans cette équipe, rien à faire.
  if (prev?.team === team) return { ok: true };

  if (!canJoinTeam(ts.assignments, playerIds, user.id, team)) {
    return { ok: false, error: "Cette équipe déséquilibrerait la partie." };
  }

  // Changer d'équipe libère le rôle de maître-espion.
  const assignments = { ...ts.assignments, [user.id]: { team, spymaster: false } };
  await prisma.lobby.update({
    where: { id: lobby.id },
    data: { gameState: teamSelectJson(assignments) },
  });
  await broadcastTeamSelect(code);
  return { ok: true };
}

/** Se porte volontaire comme maître-espion de son équipe (1 seul par équipe). */
export async function claimSpymasterAction(
  codeRaw: string,
  team: Team,
): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby || lobby.gameId !== "codenames") return { ok: false, error: "Lobby introuvable." };
  const ts = teamSelectFromGameState(lobby.gameState);
  if (!ts) return { ok: false, error: "La sélection d'équipe n'est pas ouverte." };

  const mine = ts.assignments[user.id];
  if (!mine || mine.team !== team) {
    return { ok: false, error: "Tu dois d'abord rejoindre cette équipe." };
  }
  // Rôle verrouillé : rejeté si un autre joueur l'a déjà pris.
  const taken = Object.entries(ts.assignments).some(
    ([uid, a]) => uid !== user.id && a.team === team && a.spymaster,
  );
  if (taken) return { ok: false, error: "Cette équipe a déjà un maître-espion." };

  const assignments = {
    ...ts.assignments,
    [user.id]: { team, spymaster: true },
  };
  await prisma.lobby.update({
    where: { id: lobby.id },
    data: { gameState: teamSelectJson(assignments) },
  });
  await broadcastTeamSelect(code);
  return { ok: true };
}

/** Abandonne le rôle de maître-espion. */
export async function unclaimSpymasterAction(codeRaw: string): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby || lobby.gameId !== "codenames") return { ok: false, error: "Lobby introuvable." };
  const ts = teamSelectFromGameState(lobby.gameState);
  if (!ts) return { ok: false, error: "La sélection d'équipe n'est pas ouverte." };

  const mine = ts.assignments[user.id];
  if (!mine || !mine.spymaster) return { ok: true };

  const assignments = {
    ...ts.assignments,
    [user.id]: { team: mine.team, spymaster: false },
  };
  await prisma.lobby.update({
    where: { id: lobby.id },
    data: { gameState: teamSelectJson(assignments) },
  });
  await broadcastTeamSelect(code);
  return { ok: true };
}

/** Répartit automatiquement les équipes + tire un maître-espion par équipe (hôte). */
export async function autoBalanceTeamsAction(codeRaw: string): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby || lobby.gameId !== "codenames") return { ok: false, error: "Lobby introuvable." };
  if (lobby.hostId !== user.id) return { ok: false, error: "Seul l'hôte peut équilibrer." };
  const ts = teamSelectFromGameState(lobby.gameState);
  if (!ts) return { ok: false, error: "La sélection d'équipe n'est pas ouverte." };

  const assignments = autoBalance(lobby.players.map((p) => p.userId));
  await prisma.lobby.update({
    where: { id: lobby.id },
    data: { gameState: teamSelectJson(assignments) },
  });
  await broadcastTeamSelect(code);
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────────────────
// Démarrage de la partie
// ──────────────────────────────────────────────────────────────────────────

/** Lance la partie : revalide l'équité, tire la grille + la carte-clé (hôte). */
export async function startCodenamesAction(codeRaw: string): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby || lobby.gameId !== "codenames") return { ok: false, error: "Lobby introuvable." };
  if (lobby.hostId !== user.id) return { ok: false, error: "Seul l'hôte peut démarrer." };
  if (lobby.status !== "WAITING") return { ok: false, error: "Partie déjà démarrée." };
  const ts = teamSelectFromGameState(lobby.gameState);
  if (!ts) return { ok: false, error: "La sélection d'équipe n'est pas ouverte." };

  const playerIds = lobby.players.map((p) => p.userId);
  const violations = balanceViolations(ts.assignments, playerIds);
  if (violations.length > 0) {
    return { ok: false, error: violations[0] };
  }

  const roster = await getRoster();
  if (roster.length < CODENAMES_GRID) {
    return {
      ok: false,
      error: `Il faut au moins ${CODENAMES_GRID} personnages dans le roster pour jouer.`,
    };
  }

  // Grille partagée (36 IDs) + carte-clé cachée (8 R / 8 P / 1 assassin / 19 neutres).
  const grid = shuffle(roster.map((c) => c.id)).slice(0, CODENAMES_GRID);
  const colorKey = buildColorKey(grid);

  // Fige équipes + maîtres-espions depuis la sélection (validée ci-dessus).
  const teams: Record<string, Team> = {};
  let redSpymasterId = "";
  let purpleSpymasterId = "";
  for (const p of lobby.players) {
    const a = ts.assignments[p.userId];
    teams[p.userId] = a.team as Team;
    if (a.spymaster && a.team === "RED") redSpymasterId = p.userId;
    if (a.spymaster && a.team === "PURPLE") purpleSpymasterId = p.userId;
  }

  await prisma.$transaction([
    prisma.codenamesGame.create({
      data: {
        lobbyId: lobby.id,
        gridCharIds: grid,
        colorKey: colorKey as unknown as Prisma.InputJsonValue,
        redSpymasterId,
        purpleSpymasterId,
        teams: teams as unknown as Prisma.InputJsonValue,
        currentTeam: "RED", // le rouge commence
      },
    }),
    prisma.lobby.update({
      where: { id: lobby.id },
      data: { status: "PLAYING", gameState: {} },
    }),
  ]);

  const fresh = await findLobby(code);
  const game = await prisma.codenamesGame.findUnique({
    where: { lobbyId: lobby.id },
  });
  if (!game) return { ok: false, error: "Erreur de création de partie." };

  const payload: CodenamesStartPayload = {
    lobby: serializeLobby(fresh ?? lobby, 0),
    publicState: toPublicState(game), // aucune couleur (partie ACTIVE)
  };
  await triggerLobby(code, CODENAMES_EVENTS.start, payload);
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────────────────
// Anti-triche : carte-clé réservée aux maîtres-espions
// ──────────────────────────────────────────────────────────────────────────

/** Renvoie la carte-clé complète UNIQUEMENT si l'appelant est maître-espion. */
export async function getKeyCardAction(codeRaw: string): Promise<KeyCardResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby || lobby.gameId !== "codenames") return { ok: false, error: "Lobby introuvable." };

  const game = await prisma.codenamesGame.findUnique({
    where: { lobbyId: lobby.id },
  });
  if (!game) return { ok: true, colorKey: null };

  const isSpymaster =
    user.id === game.redSpymasterId || user.id === game.purpleSpymasterId;
  if (!isSpymaster) return { ok: true, colorKey: null };

  return { ok: true, colorKey: game.colorKey as unknown as ColorKey };
}

// ──────────────────────────────────────────────────────────────────────────
// Déroulé d'un tour
// ──────────────────────────────────────────────────────────────────────────

/** Donne un indice (maître-espion de l'équipe active uniquement). */
export async function giveClueAction(
  codeRaw: string,
  wordRaw: string,
  countRaw: number,
): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby || lobby.gameId !== "codenames") return { ok: false, error: "Lobby introuvable." };

  const game = await prisma.codenamesGame.findUnique({
    where: { lobbyId: lobby.id },
  });
  if (!game || game.status !== "ACTIVE") return { ok: false, error: "La partie n'est pas en cours." };

  const currentTeam = game.currentTeam as Team;
  const spymaster = currentTeam === "RED" ? game.redSpymasterId : game.purpleSpymasterId;
  if (user.id !== spymaster) {
    return { ok: false, error: "Seul le maître-espion de l'équipe active peut donner un indice." };
  }
  if (game.currentClue) {
    return { ok: false, error: "Un indice est déjà en cours." };
  }

  const word = wordRaw.trim().slice(0, 40);
  if (!word) return { ok: false, error: "L'indice ne peut pas être vide." };
  const count = Math.floor(countRaw);
  if (!Number.isFinite(count) || count < 1) {
    return { ok: false, error: "Le nombre doit être ≥ 1." };
  }

  const clue: Clue = { word, count, remaining: count + 1 };
  // Anti-double : seul le tour courant sans indice peut en écrire un.
  const { count: updated } = await prisma.codenamesGame.updateMany({
    where: { id: game.id, status: "ACTIVE", currentTeam },
    data: {
      currentClue: clue as unknown as Prisma.InputJsonValue,
      passedAgentIds: [],
    },
  });
  if (updated === 0) return { ok: true };

  const payload: CodenamesCluePayload = {
    team: currentTeam,
    word,
    count,
    byUserId: user.id,
    byUsername: user.username,
  };
  await triggerLobby(code, CODENAMES_EVENTS.clue, payload);
  return { ok: true };
}

/** Révèle une carte (agent de l'équipe active uniquement). */
export async function revealCardAction(
  codeRaw: string,
  charId: string,
): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby || lobby.gameId !== "codenames") return { ok: false, error: "Lobby introuvable." };

  const game = await prisma.codenamesGame.findUnique({
    where: { lobbyId: lobby.id },
  });
  if (!game || game.status !== "ACTIVE") return { ok: false, error: "La partie n'est pas en cours." };

  const currentTeam = game.currentTeam as Team;
  const teams = game.teams as unknown as Record<string, Team>;
  const spymaster = currentTeam === "RED" ? game.redSpymasterId : game.purpleSpymasterId;
  // L'appelant doit être un AGENT de l'équipe active (pas le maître-espion).
  if (teams[user.id] !== currentTeam || user.id === spymaster) {
    return { ok: false, error: "Seuls les agents de l'équipe active peuvent révéler." };
  }
  const clue = game.currentClue as unknown as Clue | null;
  if (!clue || clue.remaining <= 0) {
    return { ok: false, error: "Aucune révélation disponible." };
  }
  if (!game.gridCharIds.includes(charId)) {
    return { ok: false, error: "Carte hors grille." };
  }
  if (game.revealedIds.includes(charId)) {
    return { ok: false, error: "Carte déjà révélée." };
  }

  const colorKey = game.colorKey as unknown as ColorKey;
  const color: CardColor = colorKey[charId];
  const outcome = resolveReveal(color, currentTeam);

  // Nouveaux scores (une carte peut compter pour l'adversaire).
  let redScore = game.redScore;
  let purpleScore = game.purpleScore;
  if (outcome.pointTo === "RED") redScore++;
  if (outcome.pointTo === "PURPLE") purpleScore++;

  const remaining = clue.remaining - 1;
  const scoreWinner = checkWin(redScore, purpleScore);
  const winnerTeam: Team | null = outcome.assassin
    ? otherTeam(currentTeam) // l'équipe active révèle l'assassin → elle perd
    : scoreWinner;
  const gameEnds = winnerTeam !== null;
  const turnEnded = gameEnds || outcome.endsTurn || remaining === 0;

  const nextTeam: Team = turnEnded && !gameEnds ? otherTeam(currentTeam) : currentTeam;
  const nextClue: Clue | null =
    turnEnded ? null : { ...clue, remaining };

  // Idempotence : n'écrit que si cette carte n'est pas déjà révélée.
  const { count: updated } = await prisma.codenamesGame.updateMany({
    where: {
      id: game.id,
      status: "ACTIVE",
      NOT: { revealedIds: { has: charId } },
    },
    data: {
      revealedIds: { push: charId },
      redScore,
      purpleScore,
      currentTeam: nextTeam,
      currentClue:
        nextClue === null
          ? Prisma.JsonNull
          : (nextClue as unknown as Prisma.InputJsonValue),
      passedAgentIds: turnEnded ? [] : game.passedAgentIds,
      ...(gameEnds ? { status: "FINISHED", winnerTeam } : {}),
    },
  });
  if (updated === 0) return { ok: true }; // déjà révélée (double-clic)

  const revealPayload: CodenamesRevealPayload = {
    charId,
    color,
    redScore,
    purpleScore,
    currentTeam: nextTeam,
    currentClue: nextClue,
    turnEnded,
    passedAgentIds: turnEnded ? [] : game.passedAgentIds,
  };
  await triggerLobby(code, CODENAMES_EVENTS.reveal, revealPayload);

  if (gameEnds && winnerTeam) {
    await finishGame(code, game.id, teams, winnerTeam, redScore, purpleScore, colorKey);
  }
  return { ok: true };
}

/** Passe le tour (agent de l'équipe active) ; bascule quand TOUS ont passé. */
export async function passAgentAction(codeRaw: string): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby || lobby.gameId !== "codenames") return { ok: false, error: "Lobby introuvable." };

  const game = await prisma.codenamesGame.findUnique({
    where: { lobbyId: lobby.id },
  });
  if (!game || game.status !== "ACTIVE") return { ok: false, error: "La partie n'est pas en cours." };

  const currentTeam = game.currentTeam as Team;
  const teams = game.teams as unknown as Record<string, Team>;
  const spymaster = currentTeam === "RED" ? game.redSpymasterId : game.purpleSpymasterId;
  if (teams[user.id] !== currentTeam || user.id === spymaster) {
    return { ok: false, error: "Seuls les agents de l'équipe active peuvent passer." };
  }
  if (!game.currentClue) {
    return { ok: false, error: "Attends l'indice du maître-espion." };
  }

  const agents = agentIdsOf(teams, currentTeam, game.redSpymasterId, game.purpleSpymasterId);
  const passed = new Set(game.passedAgentIds);
  passed.add(user.id);
  const allPassed = agents.every((id) => passed.has(id));

  const nextTeam: Team = allPassed ? otherTeam(currentTeam) : currentTeam;

  const { count: updated } = await prisma.codenamesGame.updateMany({
    where: { id: game.id, status: "ACTIVE", currentTeam },
    data: {
      passedAgentIds: allPassed ? [] : Array.from(passed),
      currentTeam: nextTeam,
      currentClue: allPassed ? Prisma.JsonNull : undefined,
    },
  });
  if (updated === 0) return { ok: true };

  const payload: CodenamesPassPayload = {
    passedAgentIds: allPassed ? [] : Array.from(passed),
    currentTeam: nextTeam,
    turnEnded: allPassed,
    currentClue: allPassed ? null : (game.currentClue as unknown as Clue),
  };
  await triggerLobby(code, CODENAMES_EVENTS.pass, payload);
  return { ok: true };
}

/** Persiste les scores + XP et diffuse la fin (carte-clé complète). */
async function finishGame(
  code: string,
  gameId: string,
  teams: Record<string, Team>,
  winnerTeam: Team,
  redScore: number,
  purpleScore: number,
  colorKey: ColorKey,
): Promise<void> {
  const userIds = Object.keys(teams);

  // Persistance des résultats (une ligne par joueur).
  await prisma.codenamesScore.createMany({
    data: userIds.map((userId) => ({
      userId,
      team: teams[userId],
      won: teams[userId] === winnerTeam,
    })),
  });

  // XP : gagnants > perdants, puis recompute niveau/badges pour tous.
  await Promise.all(
    userIds.map((userId) =>
      awardExp(
        userId,
        teams[userId] === winnerTeam ? codenamesWinExp() : codenamesLossExp(),
      ),
    ),
  );
  await Promise.all(userIds.map((userId) => refreshLevelAndBadges(userId)));

  const payload: CodenamesEndPayload = {
    status: "FINISHED",
    winnerTeam,
    redScore,
    purpleScore,
    colorKey,
  };
  await triggerLobby(code, CODENAMES_EVENTS.end, payload);
}

// ──────────────────────────────────────────────────────────────────────────
// Chat éphémère
// ──────────────────────────────────────────────────────────────────────────

/** Envoie un message de chat intégré (éphémère, non persisté). */
export async function sendChatAction(
  codeRaw: string,
  textRaw: string,
): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby || lobby.gameId !== "codenames") return { ok: false, error: "Lobby introuvable." };
  if (!lobby.players.some((p) => p.userId === user.id)) {
    return { ok: false, error: "Tu ne fais pas partie de ce lobby." };
  }

  const text = textRaw.trim().slice(0, CODENAMES_CHAT_MAX);
  if (!text) return { ok: true };

  const message: CodenamesChatMessage = {
    userId: user.id,
    username: user.username,
    text,
    at: Date.now(),
    kind: "text",
  };
  await triggerLobby(code, CODENAMES_EVENTS.chat, message);
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────────────────
// Rejouer / départs
// ──────────────────────────────────────────────────────────────────────────

/** Relance une partie dans le même lobby (hôte) : retour à la sélection d'équipe. */
export async function playAgainCodenamesAction(codeRaw: string): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby || lobby.gameId !== "codenames") return { ok: false, error: "Lobby introuvable." };
  if (lobby.hostId !== user.id) return { ok: false, error: "Seul l'hôte peut relancer." };

  await prisma.$transaction([
    prisma.codenamesGame.deleteMany({ where: { lobbyId: lobby.id } }),
    prisma.lobby.update({
      where: { id: lobby.id },
      data: { status: "WAITING", gameState: {} },
    }),
  ]);
  await broadcastState(code);
  return { ok: true };
}

/** Retire un joueur du lobby et remet tout le monde dans un état cohérent. */
async function applyLeave(
  lobby: LobbyWithPlayers,
  userId: string,
): Promise<void> {
  await removePlayer(lobby.id, userId);

  const remaining = lobby.players.filter((p) => p.userId !== userId);
  if (remaining.length === 0) {
    await prisma.codenamesGame.deleteMany({ where: { lobbyId: lobby.id } });
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

  const ts = teamSelectFromGameState(lobby.gameState);
  if (lobby.status !== "WAITING") {
    // Départ en cours de partie → partie annulée, retour au salon.
    data.status = "WAITING";
    data.gameState = {};
    await prisma.codenamesGame.deleteMany({ where: { lobbyId: lobby.id } });
  } else if (ts) {
    // Départ pendant la sélection → libère l'équipe/rôle du partant.
    const assignments = { ...ts.assignments };
    delete assignments[userId];
    data.gameState = teamSelectJson(assignments);
  }

  if (Object.keys(data).length > 0) {
    await prisma.lobby.update({ where: { id: lobby.id }, data });
  }
  await broadcastState(lobby.code);
}

/** Quitte volontairement le lobby « JJK Codenames ». */
export async function leaveCodenamesLobbyAction(codeRaw: string): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby) return { ok: true };
  if (!lobby.players.some((p) => p.userId === user.id)) return { ok: true };

  await applyLeave(lobby, user.id);
  return { ok: true };
}

/** Déclenchée par un joueur restant quand la présence d'un autre disparaît. */
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
