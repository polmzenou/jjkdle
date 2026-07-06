import "server-only";
import { prisma } from "@/lib/prisma";

/** Bilan « Qui est-ce ? » d'un joueur (ratio victoires/défaites). */
export interface GuessWhoStats {
  wins: number;
  losses: number;
  total: number;
}

/** Agrège les victoires/défaites « Qui est-ce ? » d'un utilisateur. */
export async function getUserGuessWhoStats(
  userId: string,
): Promise<GuessWhoStats | null> {
  const rows = await prisma.guessWhoScore.groupBy({
    by: ["won"],
    where: { userId },
    _count: { _all: true },
  });
  if (rows.length === 0) return null;

  let wins = 0;
  let losses = 0;
  for (const r of rows) {
    if (r.won) wins = r._count._all;
    else losses = r._count._all;
  }
  return { wins, losses, total: wins + losses };
}
