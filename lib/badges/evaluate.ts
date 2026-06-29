import { prisma } from "@/lib/prisma";
import {
  buildUserStatsContext,
  type UserStatsContext,
} from "@/lib/progress/context";
import { BADGES } from "./definitions";

/**
 * Évalue toutes les règles de badge pour un utilisateur et persiste les
 * nouveaux déblocages. Idempotent : `@@unique([userId, badgeKey])` empêche tout
 * doublon, et un badge déjà possédé n'est jamais retiré (l'attribution manuelle
 * admin coexiste). Renvoie les clés NOUVELLEMENT débloquées (pour le toast).
 */
export async function evaluateBadges(
  userId: string,
  ctx?: UserStatsContext,
): Promise<string[]> {
  const context = ctx ?? (await buildUserStatsContext(userId));

  const earnedKeys = BADGES.filter((b) => b.check(context)).map((b) => b.key);
  if (earnedKeys.length === 0) return [];

  const existing = await prisma.userBadge.findMany({
    where: { userId, badgeKey: { in: earnedKeys } },
    select: { badgeKey: true },
  });
  const owned = new Set(existing.map((e) => e.badgeKey));
  const toUnlock = earnedKeys.filter((k) => !owned.has(k));
  if (toUnlock.length === 0) return [];

  await prisma.userBadge.createMany({
    data: toUnlock.map((badgeKey) => ({ userId, badgeKey })),
    skipDuplicates: true,
  });
  return toUnlock;
}

/** Clés des badges débloqués par un utilisateur (page profil / admin). */
export async function getUserBadgeKeys(userId: string): Promise<string[]> {
  const rows = await prisma.userBadge.findMany({
    where: { userId },
    select: { badgeKey: true },
  });
  return rows.map((r) => r.badgeKey);
}
