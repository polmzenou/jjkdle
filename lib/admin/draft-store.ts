import { prisma } from "@/lib/prisma";
import type { DraftCharacter } from "@/lib/games/draft/types";
import { getCurrentUniverse } from "@/lib/universes/current";

/**
 * Écriture du roster « Jujutsu Draft » en base (édition depuis /admin).
 * Calqué sur `roster-store.ts` : upsert + position en fin de liste pour les
 * nouveaux personnages.
 */

export async function upsertDraftCharacter(c: DraftCharacter): Promise<void> {
  const data = {
    name: c.name,
    image: c.image ?? null,
    excellenceCategory: c.excellenceCategory,
    tier: c.tier,
    cost: c.cost,
    statValue: c.statValue,
    sourceCharacterId: c.sourceId ?? null,
  };

  const existing = await prisma.draftCharacter.findUnique({
    where: { id: c.id },
    select: { id: true },
  });

  if (existing) {
    await prisma.draftCharacter.update({ where: { id: c.id }, data });
  } else {
    // Nouveau perso : rattaché à l'univers courant, position en fin de liste DE
    // CET UNIVERS ; slug = id (clé lisible).
    const current = await getCurrentUniverse();
    const max = await prisma.draftCharacter.aggregate({
      where: { universeId: current.id },
      _max: { position: true },
    });
    await prisma.draftCharacter.create({
      data: {
        id: c.id,
        ...data,
        position: (max._max.position ?? -1) + 1,
        universeId: current.id,
        slug: c.id,
      },
    });
  }
}

export async function deleteDraftCharacter(id: string): Promise<void> {
  await prisma.draftCharacter.deleteMany({ where: { id } });
}

// ──────────────────────────────────────────────────────────────────────────
// Boss du draft — 6 par univers, éditables depuis l'onglet Draft de /admin.
// ──────────────────────────────────────────────────────────────────────────

/** Boss tel que l'admin le manipule (le slug est la clé stable par univers). */
export interface AdminDraftBoss {
  id: string;
  slug: string;
  name: string;
  /** Seuil de score à dépasser — libellé « PV » côté interface. */
  threshold: number;
  characterId: string | null;
  image: string | null;
  position: number;
}

/** Boss d'un univers, dans l'ordre d'affrontement. */
export async function listDraftBosses(
  universeId?: string,
): Promise<AdminDraftBoss[]> {
  const uid = universeId ?? (await getCurrentUniverse()).id;
  return prisma.draftBoss.findMany({
    where: { universeId: uid },
    orderBy: { position: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      threshold: true,
      characterId: true,
      image: true,
      position: true,
    },
  });
}

export interface DraftBossInput {
  /** Absent = création ; le slug est alors dérivé du personnage ou du nom. */
  id?: string;
  slug: string;
  name: string;
  threshold: number;
  characterId?: string | null;
  image?: string | null;
}

/** Crée ou met à jour un boss de l'univers courant. */
export async function upsertDraftBoss(input: DraftBossInput): Promise<void> {
  const universe = await getCurrentUniverse();
  const data = {
    name: input.name,
    threshold: input.threshold,
    characterId: input.characterId ?? null,
    image: input.image ?? null,
  };

  // On cherche par SLUG et non par id : c'est la clé stable par univers, celle
  // que l'import réutilise pour rester idempotent.
  const existing = await prisma.draftBoss.findUnique({
    where: { universeId_slug: { universeId: universe.id, slug: input.slug } },
    select: { id: true },
  });

  if (existing) {
    await prisma.draftBoss.update({ where: { id: existing.id }, data });
    return;
  }

  const max = await prisma.draftBoss.aggregate({
    where: { universeId: universe.id },
    _max: { position: true },
  });
  await prisma.draftBoss.create({
    data: {
      id: `${universe.slug}-boss-${input.slug}`,
      slug: input.slug,
      universeId: universe.id,
      ...data,
      position: (max._max.position ?? -1) + 1,
    },
  });
}

/** Supprime un boss (aucune donnée de joueur n'y est rattachée). */
export async function deleteDraftBoss(id: string): Promise<void> {
  const { id: universeId } = await getCurrentUniverse();
  await prisma.draftBoss.deleteMany({ where: { id, universeId } });
}

/**
 * Monte ou descend un boss dans l'ordre d'affrontement.
 *
 * Comme pour les consignes du Pyramid, on RÉÉCRIT l'ordre complet plutôt que
 * d'échanger deux `position` : celles-ci peuvent être trouées ou dupliquées
 * (import, éditions passées), auquel cas un échange ne déplacerait rien.
 */
export async function moveDraftBoss(
  id: string,
  direction: "up" | "down",
): Promise<void> {
  const { id: universeId } = await getCurrentUniverse();
  const rows = await prisma.draftBoss.findMany({
    where: { universeId },
    orderBy: { position: "asc" },
    select: { id: true },
  });

  const index = rows.findIndex((r) => r.id === id);
  if (index === -1) throw new Error("Boss introuvable dans cet univers.");
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= rows.length) return; // déjà en butée

  const reordered = [...rows];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  await prisma.$transaction(
    reordered.map((row, position) =>
      prisma.draftBoss.update({ where: { id: row.id }, data: { position } }),
    ),
  );
}
