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
