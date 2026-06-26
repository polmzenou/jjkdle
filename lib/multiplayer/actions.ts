"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { getCategories, getRoster } from "@/lib/content/queries";
import {
  drawAllOne,
  redrawUnlockedOne,
} from "@/lib/draw/draw";
import { prisma } from "@/lib/prisma";
import { isPusherConfigured, triggerLobby } from "@/lib/pusher/server";
import {
  EVENTS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  type PlayerLockedPayload,
} from "./events";
import {
  buildRosterMap,
  idsToSingleDraw,
  lockedIdsOf,
  scoreSelection,
  serializeLobby,
  singleDrawToIds,
  type SelectionIds,
} from "./state";
import {
  addPlayer,
  createLobby,
  deleteLobby,
  findLobby,
  type LobbyWithPlayers,
  removePlayer,
} from "./store";

export type MpResult = {
  ok: boolean;
  error?: string;
  /** Code du lobby (renvoyé par create/join pour la redirection). */
  code?: string;
  /** true si l'action a échoué faute d'authentification. */
  needsAuth?: boolean;
};

/** Seuil de note du tirage "curated" (easter egg meilleures cartes), cf. builder solo. */
const RATING_FLOOR = 90;

/** Normalise un code de lobby saisi par l'utilisateur. */
function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/**
 * Sérialise le lobby et diffuse le snapshot à tous les membres. Les appelants
 * qui ont déjà chargé le lobby et/ou connaissent le nombre de manches peuvent
 * les passer pour éviter une relecture (`lockCategoryAction` est sur le chemin chaud).
 */
async function broadcastState(
  code: string,
  preloaded?: { lobby?: LobbyWithPlayers | null; totalRounds?: number },
): Promise<void> {
  const lobby = preloaded?.lobby ?? (await findLobby(code));
  if (!lobby) return;
  const totalRounds = preloaded?.totalRounds ?? (await getCategories()).length;
  await triggerLobby(code, EVENTS.lobbyState, {
    lobby: serializeLobby(lobby, totalRounds),
  });
}

/** Crée un lobby privé et y place l'hôte. */
export async function createLobbyAction(): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true, error: "Connecte-toi pour jouer en multi." };
  if (!isPusherConfigured()) {
    return { ok: false, error: "Le mode multijoueur n'est pas configuré sur ce serveur." };
  }
  const lobby = await createLobby(user.id);
  return { ok: true, code: lobby.code };
}

/** Rejoint un lobby existant via son code. */
export async function joinLobbyAction(codeRaw: string): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true, error: "Connecte-toi pour jouer en multi." };

  const code = normalizeCode(codeRaw);
  if (!code) return { ok: false, error: "Entre un code de lobby." };

  const lobby = await findLobby(code);
  if (!lobby) return { ok: false, error: "Lobby introuvable." };

  const already = lobby.players.some((p) => p.userId === user.id);
  if (already) return { ok: true, code };

  if (lobby.status !== "WAITING") {
    return { ok: false, error: "La partie a déjà commencé." };
  }
  if (lobby.players.length >= MAX_PLAYERS) {
    return { ok: false, error: `Lobby complet (${MAX_PLAYERS} joueurs max).` };
  }

  await addPlayer(lobby.id, user.id, lobby.players.length);
  await broadcastState(code);
  return { ok: true, code };
}

/** Quitte un lobby (gère la réassignation d'hôte et la fin de partie). */
export async function leaveLobbyAction(codeRaw: string): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby) return { ok: true };
  if (!lobby.players.some((p) => p.userId === user.id)) return { ok: true };

  await removePlayer(lobby.id, user.id);

  const remaining = lobby.players.filter((p) => p.userId !== user.id);
  if (remaining.length === 0) {
    await deleteLobby(lobby.id);
    return { ok: true };
  }

  // Réassigne l'hôte si besoin ; termine la partie si elle était en cours.
  const data: { hostId?: string; status?: "FINISHED" } = {};
  if (lobby.hostId === user.id) {
    data.hostId = remaining.sort((a, b) => a.joinOrder - b.joinOrder)[0].userId;
  }
  if (lobby.status === "PLAYING") {
    data.status = "FINISHED";
    const [categories, roster] = await Promise.all([getCategories(), getRoster()]);
    const rosterMap = buildRosterMap(roster);
    await Promise.all(
      remaining.map((p) =>
        prisma.lobbyPlayer.update({
          where: { id: p.id },
          data: {
            finalScore: scoreSelection(
              (p.selection ?? {}) as SelectionIds,
              categories,
              rosterMap,
            ),
          },
        }),
      ),
    );
  }
  if (Object.keys(data).length > 0) {
    await prisma.lobby.update({ where: { id: lobby.id }, data });
  }

  await broadcastState(code);
  return { ok: true };
}

/** Démarre la partie : génère le tirage initial de chaque joueur. */
export async function startGameAction(codeRaw: string): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby) return { ok: false, error: "Lobby introuvable." };
  if (lobby.hostId !== user.id) return { ok: false, error: "Seul l'hôte peut démarrer." };
  if (lobby.status !== "WAITING") return { ok: false, error: "Partie déjà démarrée." };
  if (lobby.players.length < MIN_PLAYERS) {
    return { ok: false, error: `Il faut au moins ${MIN_PLAYERS} joueurs.` };
  }

  const [categories, roster] = await Promise.all([getCategories(), getRoster()]);

  await prisma.$transaction([
    ...lobby.players.map((p) =>
      prisma.lobbyPlayer.update({
        where: { id: p.id },
        data: {
          selection: {},
          currentDraw: singleDrawToIds(drawAllOne(categories, roster)),
          lockedThisRound: false,
          curated: false,
          sabotaged: false,
          finalScore: null,
        },
      }),
    ),
    prisma.lobby.update({
      where: { id: lobby.id },
      data: { status: "PLAYING", roundIndex: 0 },
    }),
  ]);

  await broadcastState(code, { totalRounds: categories.length });
  return { ok: true };
}

/** Verrouille une catégorie pour le joueur courant (logique lockstep). */
export async function lockCategoryAction(
  codeRaw: string,
  categoryId: string,
): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby) return { ok: false, error: "Lobby introuvable." };
  if (lobby.status !== "PLAYING") return { ok: false, error: "La partie n'est pas en cours." };

  const me = lobby.players.find((p) => p.userId === user.id);
  if (!me) return { ok: false, error: "Tu n'es pas dans ce lobby." };
  if (me.lockedThisRound) return { ok: true }; // déjà joué cette manche

  const selection = (me.selection ?? {}) as SelectionIds;
  const draw = (me.currentDraw ?? {}) as Record<string, string | null>;
  if (selection[categoryId]) return { ok: false, error: "Catégorie déjà verrouillée." };

  const characterId = draw[categoryId];
  if (!characterId) return { ok: false, error: "Catégorie non jouable." };

  // 1) Verrouille la catégorie pour CE joueur.
  await prisma.lobbyPlayer.update({
    where: { id: me.id },
    data: {
      selection: { ...selection, [categoryId]: characterId },
      lockedThisRound: true,
    },
  });

  // Cue d'animation immédiat pour les adversaires. Indépendant de la relecture
  // fraîche du lobby → on lance les deux en parallèle.
  const cue: PlayerLockedPayload = {
    userId: user.id,
    categoryId,
    characterId,
    roundIndex: lobby.roundIndex,
  };

  // 2) Tous les joueurs ont-ils verrouillé ? (relecture fraîche)
  const [, fresh] = await Promise.all([
    triggerLobby(code, EVENTS.playerLocked, cue),
    findLobby(code),
  ]);
  if (!fresh) return { ok: true };
  const allLocked = fresh.players.every((p) => p.lockedThisRound);

  if (!allLocked) {
    await broadcastState(code, { lobby: fresh });
    return { ok: true };
  }

  // 3) Avance de manche — garde anti-double-avance (concurrence).
  const [categories, roster] = await Promise.all([getCategories(), getRoster()]);
  const totalRounds = categories.length;
  const nextRound = fresh.roundIndex + 1;
  const finished = nextRound >= totalRounds;

  const advanced = await prisma.lobby.updateMany({
    where: { id: fresh.id, roundIndex: fresh.roundIndex, status: "PLAYING" },
    data: { roundIndex: nextRound, status: finished ? "FINISHED" : "PLAYING" },
  });
  if (advanced.count === 0) {
    // Une autre requête a déjà fait avancer la manche.
    await broadcastState(code);
    return { ok: true };
  }

  const rosterMap = buildRosterMap(roster);
  await prisma.$transaction(
    fresh.players.map((p) => {
      const sel = (p.selection ?? {}) as SelectionIds;
      if (finished) {
        return prisma.lobbyPlayer.update({
          where: { id: p.id },
          data: {
            lockedThisRound: false,
            finalScore: scoreSelection(sel, categories, rosterMap),
          },
        });
      }
      const currentDraw = idsToSingleDraw(
        (p.currentDraw ?? {}) as Record<string, string | null>,
        categories,
        rosterMap,
      );
      // Easter eggs : sabotage (pires cartes, prioritaire et à usage unique) ou
      // curated perso (meilleures cartes, persistant).
      const nextDraw = redrawUnlockedOne(
        currentDraw,
        categories,
        lockedIdsOf(sel),
        roster,
        Math.random,
        !p.sabotaged && p.curated ? RATING_FLOOR : undefined,
        p.sabotaged,
      );
      return prisma.lobbyPlayer.update({
        where: { id: p.id },
        data: {
          currentDraw: singleDrawToIds(nextDraw),
          lockedThisRound: false,
          sabotaged: false, // consommé : un seul tour
        },
      });
    }),
  );

  await broadcastState(code, { totalRounds });
  return { ok: true };
}

/** Relance une partie dans le même lobby (hôte uniquement). */
export async function playAgainAction(codeRaw: string): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby) return { ok: false, error: "Lobby introuvable." };
  if (lobby.hostId !== user.id) return { ok: false, error: "Seul l'hôte peut relancer." };

  await prisma.$transaction([
    prisma.lobbyPlayer.updateMany({
      where: { lobbyId: lobby.id },
      data: {
        selection: {},
        currentDraw: {},
        lockedThisRound: false,
        curated: false,
        sabotaged: false,
        finalScore: null,
      },
    }),
    prisma.lobby.update({
      where: { id: lobby.id },
      data: { status: "WAITING", roundIndex: 0 },
    }),
  ]);

  await broadcastState(code);
  return { ok: true };
}

/**
 * Easter egg (joueur principal) : bascule le mode "curated" — ne propose que
 * les meilleures cartes — et re-tire aussitôt mes catégories non verrouillées,
 * comme le bandeau secret du builder solo. L'état persiste pour les manches suivantes.
 */
export async function toggleCuratedAction(codeRaw: string): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby) return { ok: false, error: "Lobby introuvable." };
  if (lobby.status !== "PLAYING") return { ok: true };

  const me = lobby.players.find((p) => p.userId === user.id);
  if (!me) return { ok: false, error: "Tu n'es pas dans ce lobby." };

  const nextCurated = !me.curated;
  const [categories, roster] = await Promise.all([getCategories(), getRoster()]);
  const rosterMap = buildRosterMap(roster);
  const selection = (me.selection ?? {}) as SelectionIds;
  const currentDraw = idsToSingleDraw(
    (me.currentDraw ?? {}) as Record<string, string | null>,
    categories,
    rosterMap,
  );
  const nextDraw = redrawUnlockedOne(
    currentDraw,
    categories,
    lockedIdsOf(selection),
    roster,
    Math.random,
    nextCurated ? RATING_FLOOR : undefined,
  );

  await prisma.lobbyPlayer.update({
    where: { id: me.id },
    data: { curated: nextCurated, currentDraw: singleDrawToIds(nextDraw) },
  });

  await broadcastState(code);
  return { ok: true };
}

/**
 * Easter egg ultra caché : sabote un adversaire. Au tour suivant, sa proposition
 * ne contiendra que les pires cartes. Drapeau à usage unique (consommé à l'avance
 * de manche), silencieux : rien n'est diffusé pour ne pas trahir le sabotage.
 */
export async function sabotagePlayerAction(
  codeRaw: string,
  targetUserId: string,
): Promise<MpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };
  if (targetUserId === user.id) return { ok: true }; // jamais soi-même

  const code = normalizeCode(codeRaw);
  const lobby = await findLobby(code);
  if (!lobby) return { ok: false, error: "Lobby introuvable." };
  if (lobby.status !== "PLAYING") return { ok: true };

  const me = lobby.players.find((p) => p.userId === user.id);
  const target = lobby.players.find((p) => p.userId === targetUserId);
  if (!me || !target) return { ok: true };

  await prisma.lobbyPlayer.update({
    where: { id: target.id },
    data: { sabotaged: true },
  });
  return { ok: true };
}
