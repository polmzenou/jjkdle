import { Prisma, type DraftOutcome, type Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { DraftSelection } from "./types";
import {
  USER_DECOR_SELECT,
  scopeWhere,
  type AdminScore,
  type LeaderboardScope,
  type UserScore,
} from "@/lib/leaderboard/store";
import { BOSSES } from "./scoring";

/** Score max d'un draft = nombre de boss (tous vaincus → VICTORY). */
export const DRAFT_MAX_KILLS = BOSSES.length;

/**
 * Persistance du leaderboard « Jujutsu Draft » (Neon Postgres via Prisma).
 *
 * Un meilleur score par utilisateur (upsert) : on ne remplace que si le
 * résultat est meilleur — d'abord `enemiesKilled`, puis `globalScore` en
 * départage. `globalScore` reste un champ interne (jamais exposé au joueur) ;
 * il sert au classement et au recalcul anti-triche.
 */

export interface DraftLeaderboardEntry {
  id: string;
  pseudo: string;
  enemiesKilled: number;
  outcome: DraftOutcome;
  /** Rôle du joueur (pour afficher le tag VIP à côté du pseudo). */
  role: Role;
  /** Image de l'avatar choisi (ou null = initiales). */
  avatarImage: string | null;
  /** Niveau du compte. */
  level: number;
}

export interface SaveDraftInput {
  enemiesKilled: number;
  globalScore: number;
  outcome: DraftOutcome;
  draft: DraftSelection;
}

/** Enregistre le résultat si c'est un nouveau record perso. */
export async function saveDraftScore(
  userId: string,
  input: SaveDraftInput,
): Promise<{ best: number; isNewRecord: boolean }> {
  const existing = await prisma.jujutsuDraftScore.findUnique({
    where: { userId },
  });

  const isBetter =
    !existing ||
    input.enemiesKilled > existing.enemiesKilled ||
    (input.enemiesKilled === existing.enemiesKilled &&
      input.globalScore > existing.globalScore);

  if (existing && !isBetter) {
    return { best: existing.enemiesKilled, isNewRecord: false };
  }

  const data = {
    enemiesKilled: input.enemiesKilled,
    globalScore: input.globalScore,
    outcome: input.outcome,
    draft: input.draft as unknown as Prisma.InputJsonValue,
  };

  await prisma.jujutsuDraftScore.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  return { best: input.enemiesKilled, isNewRecord: true };
}

/** Top N : plus d'ennemis vaincus d'abord, départage par score puis ancienneté. */
export async function topDraftEntries(
  limit = 8,
  scope: LeaderboardScope = "all-time",
): Promise<DraftLeaderboardEntry[]> {
  const rows = await prisma.jujutsuDraftScore.findMany({
    where: scopeWhere(scope),
    orderBy: [
      { enemiesKilled: "desc" },
      { globalScore: "desc" },
      { updatedAt: "asc" },
    ],
    take: limit,
    include: { user: { select: USER_DECOR_SELECT } },
  });

  return rows.map((r) => ({
    id: r.id,
    pseudo: r.user.username,
    enemiesKilled: r.enemiesKilled,
    outcome: r.outcome,
    role: r.user.role,
    avatarImage: r.user.avatarCharacter?.image ?? null,
    level: r.user.level,
  }));
}

// ──────────────────────────────────────────────────────────────────────────
// Administration du leaderboard Draft (vue /admin)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Tous les scores Draft au format `AdminScore` (mutualisé avec les autres
 * leaderboards). `score` = ennemis vaincus (métrique de classement publique),
 * trié comme le classement (ennemis vaincus, puis score global en départage).
 */
export async function listAllDraftScores(): Promise<AdminScore[]> {
  const rows = await prisma.jujutsuDraftScore.findMany({
    orderBy: [
      { enemiesKilled: "desc" },
      { globalScore: "desc" },
      { updatedAt: "asc" },
    ],
    include: { user: { select: { username: true, role: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    pseudo: r.user.username,
    game: "jujutsu-draft",
    score: r.enemiesKilled,
    date: r.updatedAt.toISOString(),
    role: r.user.role,
  }));
}

/**
 * Met à jour le nombre d'ennemis vaincus d'une entrée (et l'issue en
 * conséquence : VICTORY si tous les boss tombent, sinon DEFEAT).
 */
export async function adminUpdateDraftScore(
  id: string,
  enemiesKilled: number,
): Promise<void> {
  await prisma.jujutsuDraftScore.update({
    where: { id },
    data: {
      enemiesKilled,
      outcome: enemiesKilled >= DRAFT_MAX_KILLS ? "VICTORY" : "DEFEAT",
    },
  });
}

/** Supprime une entrée du leaderboard Draft. */
export async function adminDeleteDraftScore(id: string): Promise<void> {
  await prisma.jujutsuDraftScore.delete({ where: { id } });
}

/** Meilleur nombre d'ennemis vaincus d'un utilisateur (ou null). */
export async function getUserDraftBest(
  userId: string,
): Promise<number | null> {
  const row = await prisma.jujutsuDraftScore.findUnique({
    where: { userId },
    select: { enemiesKilled: true },
  });
  return row?.enemiesKilled ?? null;
}

/**
 * Score Draft de l'utilisateur au format `UserScore` (pour la vue /account).
 * `best` = ennemis vaincus ; rang par enemiesKilled puis globalScore (départage).
 * Renvoie null si l'utilisateur n'a jamais joué.
 */
export async function getUserDraftScore(
  userId: string,
): Promise<UserScore | null> {
  const mine = await prisma.jujutsuDraftScore.findUnique({ where: { userId } });
  if (!mine) return null;

  const [better, totalPlayers] = await Promise.all([
    prisma.jujutsuDraftScore.count({
      where: {
        OR: [
          { enemiesKilled: { gt: mine.enemiesKilled } },
          {
            enemiesKilled: mine.enemiesKilled,
            globalScore: { gt: mine.globalScore },
          },
        ],
      },
    }),
    prisma.jujutsuDraftScore.count(),
  ]);

  return {
    gameId: "jujutsu-draft",
    best: mine.enemiesKilled,
    rank: better + 1,
    totalPlayers,
    updatedAt: mine.updatedAt.toISOString(),
  };
}
