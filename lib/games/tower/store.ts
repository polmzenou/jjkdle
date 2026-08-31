import { Prisma, type Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getWeekBounds } from "@/lib/date";
import { getCurrentUniverse } from "@/lib/universes/current";
import {
  userDecor,
  userDecorSelect,
  type LeaderboardScope,
} from "@/lib/leaderboard/store";
import { normalizeRunState, type TowerRunState } from "./run";
import { TOWER_BEST_ORDER_SQL, compareTowerRuns } from "./ranking";

/**
 * Persistance de « The Culling Tower » — module SERVER-ONLY.
 *
 * Deux responsabilités, séparées comme dans Higher/Lower :
 *  1. l'état d'une run EN COURS (`TowerRun`), autorité serveur et éphémère ;
 *  2. les runs TERMINÉES (`TowerScore`, append) pour le classement et le profil.
 *
 * La tour elle-même n'est jamais stockée : elle se régénère depuis `seed`.
 */

/** Cookie httpOnly portant le runId. La source de vérité reste la base. */
export const TOWER_COOKIE = "tower_run";

/** Durée de vie du cookie : une run peut être reprise le lendemain. */
export const TOWER_COOKIE_MAX_AGE = 60 * 60 * 24 * 2;

const GAME_ID = "tower";

export interface StoredRun {
  id: string;
  userId: string | null;
  universeId: string;
  seed: number;
  dateKey: string | null;
  attempt: number;
  floor: number;
  state: TowerRunState;
}

// ──────────────────────────────────────────────────────────────────────────
// Run en cours
// ──────────────────────────────────────────────────────────────────────────

export async function createRun(params: {
  userId: string | null;
  universeId: string;
  seed: number;
  dateKey: string | null;
  attempt: number;
  state: TowerRunState;
}): Promise<string> {
  const run = await prisma.towerRun.create({
    data: {
      userId: params.userId,
      universeId: params.universeId,
      seed: params.seed,
      dateKey: params.dateKey,
      attempt: params.attempt,
      floor: params.state.floor,
      state: params.state as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
  return run.id;
}

/**
 * Relit une run. `universeId` est vérifié par l'appelant : une run démarrée sur
 * un univers ne doit pas pouvoir être reprise depuis un autre (même règle que
 * `HigherLowerSession`).
 */
export async function loadRun(runId: string): Promise<StoredRun | null> {
  const row = await prisma.towerRun.findUnique({
    where: { id: runId },
    select: {
      id: true,
      userId: true,
      universeId: true,
      seed: true,
      dateKey: true,
      attempt: true,
      floor: true,
      state: true,
    },
  });
  if (!row) return null;

  // L'état vient d'un blob JSON écrit par une version antérieure du jeu :
  // on le remet d'aplomb avant de le rendre (cf. `normalizeRunState`).
  return { ...row, state: normalizeRunState(row.state) };
}

/**
 * Écrit l'état d'une run.
 *
 * Garde d'IDEMPOTENCE : l'écriture n'est appliquée que si la run est encore à
 * l'étage `expectedFloor`. Un double clic (ou un renvoi du même log de combat)
 * ne peut donc pas faire monter la tour deux fois — même garde que
 * `consumeSession` en Higher/Lower. Renvoie `false` si l'écriture a été ignorée.
 */
export async function saveRun(
  runId: string,
  expectedFloor: number,
  state: TowerRunState,
): Promise<boolean> {
  const { count } = await prisma.towerRun.updateMany({
    where: { id: runId, floor: expectedFloor },
    data: {
      floor: state.floor,
      state: state as unknown as Prisma.InputJsonValue,
    },
  });
  return count > 0;
}

export async function deleteRun(runId: string): Promise<void> {
  await prisma.towerRun.deleteMany({ where: { id: runId } });
}

/**
 * Purge les runs abandonnées. Table à fort churn et sans valeur historique :
 * un joueur qui n'a pas touché sa run depuis une semaine ne la reprendra pas.
 */
export async function purgeStaleRuns(days = 7): Promise<number> {
  const before = new Date(Date.now() - days * 86_400_000);
  const { count } = await prisma.towerRun.deleteMany({
    where: { updatedAt: { lt: before } },
  });
  return count;
}

// ──────────────────────────────────────────────────────────────────────────
// Essais du jour
// ──────────────────────────────────────────────────────────────────────────

export interface DailyProgress {
  /** Essais déjà TERMINÉS aujourd'hui (le prochain porte le n° suivant). */
  attempts: number;
  /** La tour du jour a-t-elle déjà été bouclée ? */
  cleared: boolean;
  /**
   * Meilleur étage atteint aujourd'hui. Sert au paiement de l'XP « au
   * plus-haut-atteint » : sans lui, rejouer trente fois la même tour
   * rapporterait trente fois l'XP (cf. §11 du doc).
   */
  bestFloor: number;
}

export async function dailyProgress(
  userId: string,
  universeId: string,
  dateKey: string,
): Promise<DailyProgress> {
  const rows = await prisma.towerScore.findMany({
    where: { userId, universeId, dateKey },
    select: { floor: true, cleared: true },
  });

  return {
    attempts: rows.length,
    cleared: rows.some((r) => r.cleared),
    bestFloor: rows.reduce((max, r) => Math.max(max, r.floor), 0),
  };
}

/**
 * Tours ALÉATOIRES terminées depuis `since` (VIP/ADMIN).
 *
 * Comptées à part des essais du jour : elles n'ont pas de `dateKey` (elles ne
 * sont pas classées), donc `dailyProgress` ne les voit pas. C'est ce compteur
 * qui applique réellement le plafond `VIP_MAX_REPLAYS`.
 */
export async function countRandomRunsSince(
  userId: string,
  universeId: string,
  since: Date,
): Promise<number> {
  return prisma.towerScore.count({
    where: { userId, universeId, dateKey: null, createdAt: { gte: since } },
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Runs terminées
// ──────────────────────────────────────────────────────────────────────────

export async function recordScore(params: {
  userId: string;
  universeId: string;
  score: number;
  floor: number;
  enemiesKilled: number;
  bossesKilled: number;
  cleared: boolean;
  attempt: number;
  dateKey: string | null;
  xpEarned: number;
}): Promise<void> {
  await prisma.towerScore.create({ data: params });

  // Le meilleur score global passe aussi par la table `Score` commune : c'est
  // elle que lisent le profil et le compteur `gamesPlayed`, donc aucun code
  // spécifique à ajouter ailleurs.
  const existing = await prisma.score.findUnique({
    where: {
      userId_universeId_gameId: {
        userId: params.userId,
        universeId: params.universeId,
        gameId: GAME_ID,
      },
    },
    select: { best: true },
  });

  if (!existing) {
    await prisma.score.create({
      data: {
        userId: params.userId,
        universeId: params.universeId,
        gameId: GAME_ID,
        best: params.score,
      },
    });
    return;
  }

  if (params.score > existing.best) {
    await prisma.score.update({
      where: {
        userId_universeId_gameId: {
          userId: params.userId,
          universeId: params.universeId,
          gameId: GAME_ID,
        },
      },
      data: { best: params.score },
    });
  }
}

/** Stats d'un joueur pour les badges et le profil. */
export async function towerStats(
  userId: string,
  universeId: string,
): Promise<{ bestFloor: number; cleared: boolean; bestAttempt: number; played: boolean }> {
  const rows = await prisma.towerScore.findMany({
    where: { userId, universeId },
    select: { floor: true, cleared: true, attempt: true },
  });

  const clears = rows.filter((r) => r.cleared);

  return {
    bestFloor: rows.reduce((max, r) => Math.max(max, r.floor), 0),
    cleared: clears.length > 0,
    // Meilleur (= plus petit) n° d'essai auquel la tour a été bouclée. 0 si
    // jamais bouclée — c'est ce que lit le badge « premier essai ».
    bestAttempt: clears.reduce(
      (min, r) => (min === 0 ? r.attempt : Math.min(min, r.attempt)),
      0,
    ),
    played: rows.length > 0,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Classement
// ──────────────────────────────────────────────────────────────────────────

export interface TowerLeaderboardEntry {
  id: string;
  pseudo: string;
  role: Role;
  avatarImage: string | null;
  level: number;
  titleKey: string | null;
  frameKey: string | null;
  /** Étage atteint (20 = tour bouclée). */
  floor: number;
  score: number;
  cleared: boolean;
  /** Essai auquel ce résultat a été obtenu. */
  attempt: number;
}

interface TowerBestRow {
  id: string;
  userId: string;
  score: number;
  floor: number;
  cleared: boolean;
  attempt: number;
  createdAt: Date;
}

/**
 * Classement de la Tour.
 *
 * ⚠️ Le tri n'est PAS le score seul, et c'est la conséquence directe des essais
 * illimités : tout le monde finit par boucler la tour, donc un classement au
 * score ne distinguerait plus personne. On classe donc, dans l'ordre :
 *   1. avoir bouclé la tour ;
 *   2. le NOMBRE D'ESSAIS qu'il a fallu (moins = mieux) ;
 *   3. le score, puis l'antériorité.
 *
 * C'est la même métrique que JJKdle, qui classe déjà sur les tentatives : les
 * joueurs la comprennent sans explication.
 *
 * Une seule ligne par joueur : sa MEILLEURE, selon ce même ordre.
 */
export async function topTowerEntries(
  limit = 20,
  scope: LeaderboardScope = "all-time",
): Promise<TowerLeaderboardEntry[]> {
  const { id: universeId } = await getCurrentUniverse();

  // `DISTINCT ON` retient la PREMIÈRE ligne de chaque joueur selon l'ordre
  // ci-dessous : c'est donc lui qui décide « quelle run représente ce joueur ».
  // Il doit rester le miroir de `compareTowerRuns` (cf. ranking.ts).
  const bestOrder = Prisma.raw(TOWER_BEST_ORDER_SQL);

  const bestPerUser = await prisma.$queryRaw<TowerBestRow[]>(
    scope === "weekly"
      ? Prisma.sql`
          SELECT DISTINCT ON ("userId")
            "id", "userId", "score", "floor", "cleared", "attempt", "createdAt"
          FROM "TowerScore"
          WHERE "universeId" = ${universeId} AND "createdAt" >= ${getWeekBounds().start}
          ORDER BY "userId", ${bestOrder}`
      : Prisma.sql`
          SELECT DISTINCT ON ("userId")
            "id", "userId", "score", "floor", "cleared", "attempt", "createdAt"
          FROM "TowerScore"
          WHERE "universeId" = ${universeId}
          ORDER BY "userId", ${bestOrder}`,
  );

  const ranked = bestPerUser.sort(compareTowerRuns).slice(0, limit);
  if (ranked.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: ranked.map((r) => r.userId) } },
    select: { id: true, ...userDecorSelect(universeId) },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  return ranked.map((r) => {
    const u = userById.get(r.userId);
    const d = u ? userDecor(u) : null;
    return {
      id: r.id,
      pseudo: d?.pseudo ?? "—",
      role: d?.role ?? "PLAYER",
      avatarImage: d?.avatarImage ?? null,
      level: d?.level ?? 1,
      titleKey: d?.titleKey ?? null,
      frameKey: d?.frameKey ?? null,
      floor: r.floor,
      score: r.score,
      cleared: r.cleared,
      attempt: r.attempt,
    };
  });
}
