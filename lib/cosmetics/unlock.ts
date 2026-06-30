import { prisma } from "@/lib/prisma";
import { buildUserStatsContext } from "@/lib/progress/context";
import { TITLES } from "@/lib/titles/definitions";
import { FRAMES } from "@/lib/frames/definitions";
import type { UnlockContext } from "./types";

export type { UnlockContext } from "./types";

/**
 * Déblocage des titres/cadres : couche unifiée par-dessus les définitions code.
 *
 * Règle de déblocage finale (cf. spec §5) — un titre/cadre est débloqué si :
 *   1. la règle dérivée `isUnlocked(ctx)` est vraie, OU
 *   2. un octroi manuel admin existe (UserTitleGrant / UserFrameGrant), OU
 *   3. le user est admin (bypass total).
 *
 * Le retrait d'un grant n'enlève JAMAIS un déblocage dérivé : si la condition
 * naturelle reste remplie, l'item reste débloqué (cohérent avec les badges).
 */

/** Construit le contexte de déblocage dérivé d'un user (une passe groupée). */
export async function buildUnlockContext(userId: string): Promise<UnlockContext> {
  const [stats, user, badges] = await Promise.all([
    buildUserStatsContext(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { level: true } }),
    prisma.userBadge.findMany({ where: { userId }, select: { badgeKey: true } }),
  ]);
  const badgeKeys = new Set(badges.map((b) => b.badgeKey));
  return {
    stats,
    level: user?.level ?? 1,
    badgeCount: badgeKeys.size,
    badgeKeys,
  };
}

/** Vrai si le contexte correspond à un admin (bypass de toutes les conditions). */
function isAdminCtx(ctx: UnlockContext): boolean {
  return ctx.stats.role === "ADMIN";
}

/**
 * Clés des titres débloqués pour un user : règle dérivée (+ bypass admin) ∪
 * octrois manuels. `grantKeys` = clés présentes dans UserTitleGrant.
 */
export function getUnlockedTitleKeys(
  ctx: UnlockContext,
  grantKeys: Iterable<string> = [],
): Set<string> {
  const admin = isAdminCtx(ctx);
  const out = new Set<string>();
  for (const t of TITLES) {
    if (admin || t.isUnlocked(ctx)) out.add(t.key);
  }
  for (const k of grantKeys) out.add(k);
  return out;
}

/** Idem pour les cadres. */
export function getUnlockedFrameKeys(
  ctx: UnlockContext,
  grantKeys: Iterable<string> = [],
): Set<string> {
  const admin = isAdminCtx(ctx);
  const out = new Set<string>();
  for (const f of FRAMES) {
    if (admin || f.isUnlocked(ctx)) out.add(f.key);
  }
  for (const k of grantKeys) out.add(k);
  return out;
}

/** Vrai si un titre précis est débloqué (validation serveur à l'équipement). */
export function isTitleUnlocked(
  key: string,
  ctx: UnlockContext,
  grantKeys: Iterable<string> = [],
): boolean {
  return getUnlockedTitleKeys(ctx, grantKeys).has(key);
}

/** Vrai si un cadre précis est débloqué (validation serveur à l'équipement). */
export function isFrameUnlocked(
  key: string,
  ctx: UnlockContext,
  grantKeys: Iterable<string> = [],
): boolean {
  return getUnlockedFrameKeys(ctx, grantKeys).has(key);
}
