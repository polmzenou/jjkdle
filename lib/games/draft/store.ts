import { Prisma, type DraftOutcome } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { DraftSelection } from "./types";

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
): Promise<DraftLeaderboardEntry[]> {
  const rows = await prisma.jujutsuDraftScore.findMany({
    orderBy: [
      { enemiesKilled: "desc" },
      { globalScore: "desc" },
      { updatedAt: "asc" },
    ],
    take: limit,
    include: { user: { select: { username: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    pseudo: r.user.username,
    enemiesKilled: r.enemiesKilled,
    outcome: r.outcome,
  }));
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
