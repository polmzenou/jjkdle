import { prisma } from "@/lib/prisma";
import { xpToLevel } from "./xp";
import { coinsForExp } from "./exp-rewards";
import { evaluateBadges } from "@/lib/badges/evaluate";

/**
 * Progression ACCUMULATIVE : `User.totalXp` est la source de vérité unique. Il
 * grandit de l'EXP gagnée à chaque partie (`awardExp`) et n'est jamais recalculé
 * depuis les meilleurs scores. Le niveau en dérive via `xpToLevel` (courbe dans
 * xp.ts). Les badges restent dérivés des scores/streaks (evaluateBadges).
 */

export interface ProgressResult {
  newBadges: string[];
  level: number;
  totalXp: number;
}

/**
 * Ajoute `gainedExp` au total du joueur, crédite les coins correspondants,
 * recalcule le niveau et débloque les badges nouvellement mérités. À appeler en
 * fin de partie avec le montant du barème (`lib/progress/exp-rewards`). Un gain
 * ≤ 0 n'ajoute rien mais réévalue quand même les badges.
 *
 * C'est le point d'entrée UNIQUE de tous les jeux : les coins étant dérivés de
 * l'EXP (`coinsForExp`), aucun jeu n'a à s'en occuper.
 */
export async function awardExp(
  userId: string,
  gainedExp: number,
): Promise<ProgressResult & { gained: number; gainedCoins: number }> {
  const gained = Math.max(0, Math.round(gainedExp));
  const gainedCoins = coinsForExp(gained);

  const user = await prisma.user.update({
    where: { id: userId },
    data:
      gained > 0
        ? { totalXp: { increment: gained }, coins: { increment: gainedCoins } }
        : {},
    select: { totalXp: true },
  });

  const totalXp = Math.max(0, user.totalXp);
  const { level } = xpToLevel(totalXp);

  await prisma.user.update({
    where: { id: userId },
    data: { level },
  });

  const newBadges = await evaluateBadges(userId);
  return { newBadges, level, totalXp, gained, gainedCoins };
}

/**
 * Recalcule niveau + badges à partir du `totalXp` COURANT, sans le modifier.
 * Non destructif : sert aux actions admin qui ont déjà fixé `totalXp` (bonus,
 * niveau cible).
 */
export async function refreshLevelAndBadges(
  userId: string,
): Promise<ProgressResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totalXp: true },
  });
  const totalXp = Math.max(0, user?.totalXp ?? 0);
  const { level } = xpToLevel(totalXp);

  await prisma.user.update({
    where: { id: userId },
    data: { level },
  });

  const newBadges = await evaluateBadges(userId);
  return { newBadges, level, totalXp };
}
