import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getWeekBounds } from "@/lib/date";

/**
 * Leaderboard global (Neon Postgres via Prisma).
 *
 * Les scores sont liés à un compte (table `Score`, un meilleur score par
 * couple utilisateur/jeu). Le pseudo affiché est le `username` du compte.
 */

export type LeaderboardGame = "builder" | "ranking";

/**
 * Portée du classement. `weekly` filtre sur `updatedAt >= lundi` : comme la
 * table `Score` ne garde que le MEILLEUR score (upsert), l'hebdo n'affiche que
 * les joueurs ayant (re)battu leur record cette semaine (limite assumée).
 */
export type LeaderboardScope = "all-time" | "weekly";

export interface LeaderboardEntry {
  id: string;
  pseudo: string;
  score: number;
  /** Rôle du joueur (pour afficher le tag VIP à côté du pseudo). */
  role: Role;
  /** Image de l'avatar choisi (ou null = initiales). */
  avatarImage: string | null;
  /** Niveau du compte. */
  level: number;
  /** Clé du titre équipé (ou null) — affiché sous le pseudo. */
  titleKey: string | null;
  /** Clé du cadre équipé (ou null) — bordure autour de l'avatar. */
  frameKey: string | null;
}

/** Sélection Prisma commune pour décorer une ligne (avatar + niveau + rôle + cosmétiques). */
export const USER_DECOR_SELECT = {
  username: true,
  role: true,
  level: true,
  avatarCharacter: { select: { image: true } },
  equippedTitleKey: true,
  equippedFrameKey: true,
} as const;

/** Filtre `where` de portée (vide pour all-time, borne lundi pour weekly). */
export function scopeWhere(scope: LeaderboardScope) {
  return scope === "weekly"
    ? { updatedAt: { gte: getWeekBounds().start } }
    : {};
}

/** Normalise un paramètre d'URL (?scope=) en portée valide (défaut all-time). */
export function parseScope(value: unknown): LeaderboardScope {
  return value === "weekly" ? "weekly" : "all-time";
}

/** Score maximum atteignable par jeu (sert à valider les soumissions). */
export const MAX_SCORE: Record<LeaderboardGame, number> = {
  builder: 1000,
  ranking: 10000,
};

/**
 * Enregistre le score d'un utilisateur pour un jeu : ne met à jour que si
 * c'est un nouveau record. Renvoie le meilleur score à jour et si un record
 * a été battu.
 */
export async function saveScore(
  userId: string,
  game: LeaderboardGame,
  score: number,
): Promise<{ best: number; isNewRecord: boolean }> {
  const existing = await prisma.score.findUnique({
    where: { userId_gameId: { userId, gameId: game } },
  });

  if (existing && existing.best >= score) {
    return { best: existing.best, isNewRecord: false };
  }

  await prisma.score.upsert({
    where: { userId_gameId: { userId, gameId: game } },
    create: { userId, gameId: game, best: score },
    update: { best: score },
  });

  return { best: score, isNewRecord: true };
}

/**
 * Meilleur score persisté d'un utilisateur pour un jeu (0 si jamais enregistré).
 * Lecture SEULE — sert à détecter un « nouveau record » sans rien écrire (octroi
 * d'XP automatique hors classement).
 */
export async function getBestScore(
  userId: string,
  game: LeaderboardGame,
): Promise<number> {
  const s = await prisma.score.findUnique({
    where: { userId_gameId: { userId, gameId: game } },
    select: { best: true },
  });
  return s?.best ?? 0;
}

/**
 * Top N d'un jeu (meilleur score décroissant, départage par ancienneté).
 */
export async function topEntries(
  limit = 8,
  game?: LeaderboardGame,
  scope: LeaderboardScope = "all-time",
): Promise<LeaderboardEntry[]> {
  const rows = await prisma.score.findMany({
    where: { ...(game ? { gameId: game } : {}), ...scopeWhere(scope) },
    orderBy: [{ best: "desc" }, { updatedAt: "asc" }],
    take: limit,
    include: { user: { select: USER_DECOR_SELECT } },
  });

  return rows.map((r) => ({
    id: r.id,
    pseudo: r.user.username,
    score: r.best,
    role: r.user.role,
    avatarImage: r.user.avatarCharacter?.image ?? null,
    level: r.user.level,
    titleKey: r.user.equippedTitleKey,
    frameKey: r.user.equippedFrameKey,
  }));
}

// ──────────────────────────────────────────────────────────────────────────
// Récap personnel (vue /account)
// ──────────────────────────────────────────────────────────────────────────

export interface UserScore {
  gameId: string;
  best: number;
  /** Position dans le classement du jeu (1 = meilleur). */
  rank: number;
  /** Nombre total de joueurs classés sur ce jeu. */
  totalPlayers: number;
  /** Date du dernier record (ISO). */
  updatedAt: string;
}

/** Meilleurs scores d'un utilisateur, avec son rang par jeu. */
export async function getUserScores(userId: string): Promise<UserScore[]> {
  const scores = await prisma.score.findMany({
    where: { userId },
    orderBy: { gameId: "asc" },
  });

  return Promise.all(
    scores.map(async (s) => {
      const [better, totalPlayers] = await Promise.all([
        prisma.score.count({
          where: { gameId: s.gameId, best: { gt: s.best } },
        }),
        prisma.score.count({ where: { gameId: s.gameId } }),
      ]);
      return {
        gameId: s.gameId,
        best: s.best,
        rank: better + 1,
        totalPlayers,
        updatedAt: s.updatedAt.toISOString(),
      };
    }),
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Administration du leaderboard (vue /admin)
// ──────────────────────────────────────────────────────────────────────────

export interface AdminScore {
  id: string;
  pseudo: string;
  /** Id du jeu (ex. "builder", "ranking"). */
  game: string;
  score: number;
  /** Date du dernier record (ISO). */
  date: string;
  /** Rôle du joueur (pour afficher le tag VIP à côté du pseudo). */
  role: Role;
}

/** Tous les scores (tous jeux), pour l'admin. Groupé par jeu puis score décroissant. */
export async function listAllScores(): Promise<AdminScore[]> {
  const rows = await prisma.score.findMany({
    orderBy: [{ gameId: "asc" }, { best: "desc" }, { updatedAt: "asc" }],
    include: { user: { select: { username: true, role: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    pseudo: r.user.username,
    game: r.gameId,
    score: r.best,
    date: r.updatedAt.toISOString(),
    role: r.user.role,
  }));
}

/** Met à jour le score (best) d'une entrée. */
export async function adminUpdateScore(id: string, best: number): Promise<void> {
  await prisma.score.update({ where: { id }, data: { best } });
}

/** Supprime une entrée de score. */
export async function adminDeleteScore(id: string): Promise<void> {
  await prisma.score.delete({ where: { id } });
}
