import { prisma } from "@/lib/prisma";
import {
  buildUserStatsContext,
  type UserStatsContext,
} from "@/lib/progress/context";
import { getCurrentUniverse } from "@/lib/universes/current";
import { badgesForUniverse } from "./definitions";

/**
 * Évalue les règles de badge de l'UNIVERS COURANT pour un utilisateur et persiste
 * les nouveaux déblocages. Idempotent : `@@unique([userId, badgeKey])` empêche
 * tout doublon, et un badge déjà possédé n'est jamais retiré (l'attribution
 * manuelle admin coexiste). Renvoie les clés NOUVELLEMENT débloquées (toast).
 *
 * Multi-univers (étape 2d) : on ne gagne que les badges de l'univers où l'on
 * joue — mais la POSSESSION reste globale (UserBadge n'est pas taggé), donc un
 * badge acquis sur JJK le reste à vie.
 */
export async function evaluateBadges(
  userId: string,
  ctx?: UserStatsContext,
): Promise<string[]> {
  const [context, universe] = await Promise.all([
    ctx ? Promise.resolve(ctx) : buildUserStatsContext(userId),
    getCurrentUniverse(),
  ]);

  const earnedKeys = badgesForUniverse(universe.slug)
    .filter((b) => b.check(context))
    .map((b) => b.key);
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
