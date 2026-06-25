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
