import { prisma } from "@/lib/prisma";

/**
 * Leaderboard global (Neon Postgres via Prisma).
 *
 * Les scores sont liés à un compte (table `Score`, un meilleur score par
 * couple utilisateur/jeu). Le pseudo affiché est le `username` du compte.
 */

export type LeaderboardGame = "builder" | "ranking";

export interface LeaderboardEntry {
  id: string;
  pseudo: string;
  score: number;
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
 * Top N d'un jeu (meilleur score décroissant, départage par ancienneté).
 */
export async function topEntries(
  limit = 8,
  game?: LeaderboardGame,
): Promise<LeaderboardEntry[]> {
  const rows = await prisma.score.findMany({
    where: game ? { gameId: game } : undefined,
    orderBy: [{ best: "desc" }, { updatedAt: "asc" }],
    take: limit,
    include: { user: { select: { username: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    pseudo: r.user.username,
    score: r.best,
  }));
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
}

/** Tous les scores (tous jeux), pour l'admin. Groupé par jeu puis score décroissant. */
export async function listAllScores(): Promise<AdminScore[]> {
  const rows = await prisma.score.findMany({
    orderBy: [{ gameId: "asc" }, { best: "desc" }, { updatedAt: "asc" }],
    include: { user: { select: { username: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    pseudo: r.user.username,
    game: r.gameId,
    score: r.best,
    date: r.updatedAt.toISOString(),
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
