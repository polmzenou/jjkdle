import { prisma } from "@/lib/prisma";

/**
 * Couche d'accès aux OCTROIS MANUELS admin de titres et cadres (cf. spec §5).
 * Distinct du déblocage dérivé (lib/cosmetics/unlock) : un grant trace qui a
 * accordé quoi et permet de le retirer sans toucher aux stats du joueur. Toutes
 * les opérations sont idempotentes (upsert / deleteMany). Le contrôle `isAdmin`
 * est fait en amont dans les server actions (app/admin/actions).
 */

/** Clés des titres octroyés manuellement à un user. */
export async function getTitleGrantKeys(userId: string): Promise<string[]> {
  const rows = await prisma.userTitleGrant.findMany({
    where: { userId },
    select: { titleKey: true },
  });
  return rows.map((r) => r.titleKey);
}

/** Clés des cadres octroyés manuellement à un user. */
export async function getFrameGrantKeys(userId: string): Promise<string[]> {
  const rows = await prisma.userFrameGrant.findMany({
    where: { userId },
    select: { frameKey: true },
  });
  return rows.map((r) => r.frameKey);
}

/** Octroie un titre (idempotent ; conserve `grantedBy` du premier octroi). */
export async function grantTitle(
  userId: string,
  titleKey: string,
  grantedBy: string,
): Promise<void> {
  await prisma.userTitleGrant.upsert({
    where: { userId_titleKey: { userId, titleKey } },
    create: { userId, titleKey, grantedBy },
    update: {},
  });
}

/** Retire un octroi de titre (no-op s'il n'existe pas). */
export async function revokeTitle(userId: string, titleKey: string): Promise<void> {
  await prisma.userTitleGrant.deleteMany({ where: { userId, titleKey } });
}

/** Octroie un cadre (idempotent). */
export async function grantFrame(
  userId: string,
  frameKey: string,
  grantedBy: string,
): Promise<void> {
  await prisma.userFrameGrant.upsert({
    where: { userId_frameKey: { userId, frameKey } },
    create: { userId, frameKey, grantedBy },
    update: {},
  });
}

/** Retire un octroi de cadre (no-op s'il n'existe pas). */
export async function revokeFrame(userId: string, frameKey: string): Promise<void> {
  await prisma.userFrameGrant.deleteMany({ where: { userId, frameKey } });
}
