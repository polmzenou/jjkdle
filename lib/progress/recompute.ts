import { prisma } from "@/lib/prisma";
import { buildUserStatsContext } from "./context";
import { computeTotalXp, xpToLevel } from "./xp";
import { evaluateBadges } from "@/lib/badges/evaluate";

/**
 * Hook de fin de partie unifié et IDEMPOTENT : recalcule XP + niveau (cache sur
 * `User`) et débloque les badges nouvellement mérités. À appeler après chaque
 * sauvegarde de score (Builder/Ranking, Draft, JJKdle — le streak JJKdle se met
 * à jour AVANT). Rejouable sans effet de bord : XP/niveau purs depuis les
 * scores, badges en upsert. Le `xpBonus` admin est relu et ajouté, jamais écrasé.
 */
export async function recomputeUserProgress(
  userId: string,
): Promise<{ newBadges: string[]; level: number; totalXp: number }> {
  const ctx = await buildUserStatsContext(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xpBonus: true },
  });
  const totalXp = Math.max(0, computeTotalXp(ctx) + (user?.xpBonus ?? 0));
  const { level } = xpToLevel(totalXp);

  await prisma.user.update({
    where: { id: userId },
    data: { totalXp, level },
  });

  const newBadges = await evaluateBadges(userId, ctx);
  return { newBadges, level, totalXp };
}
