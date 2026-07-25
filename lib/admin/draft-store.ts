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
