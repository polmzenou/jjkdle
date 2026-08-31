import { prisma } from "@/lib/prisma";
import { getCurrentUniverse } from "@/lib/universes/current";
import { slugify, uniqueSlug } from "@/lib/admin/slug";
import { normalizeItem, type TowerItem } from "@/lib/games/tower/items";

/**
 * Écriture du roster ITEM en base (édition depuis /admin, onglet Objets).
 * Calqué sur `draft-store.ts` : upsert, slug posé À LA CRÉATION uniquement,
 * position en fin de liste pour les nouveaux.
 *
 * Le `slug` ne change jamais après coup : c'est la clé stable sur laquelle le
 * seed s'appuie pour resynchroniser sans créer de doublon.
 */

export interface ItemInput {
  /** Absent = création. */
  id?: string;
  name: string;
  description: string;
  rarity: string;
  effectKind: string;
  effectValue: number;
  effectKind2: string | null;
  effectValue2: number | null;
  enabled: boolean;
}

/**
 * Tous les objets de l'univers administré, ACTIFS ET INACTIFS.
 *
 * Contrairement au catalogue de jeu (`lib/games/tower/queries.ts`), l'admin doit
 * voir ce qu'il a désactivé — sinon un objet retiré des tirages disparaîtrait
 * de l'écran qui sert justement à le remettre.
 */
export async function listItems(universeId?: string): Promise<TowerItem[]> {
  const uid = universeId ?? (await getCurrentUniverse()).id;

  const rows = await prisma.item.findMany({
    where: { universeId: uid },
    orderBy: { position: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      image: true,
      rarity: true,
      effectKind: true,
      effectValue: true,
      effectKind2: true,
      effectValue2: true,
      enabled: true,
      position: true,
    },
  });

  const withImage = new Set(
    (
      await prisma.item.findMany({
        where: { universeId: uid, NOT: { imageData: null } },
        select: { id: true },
      })
    ).map((r) => r.id),
  );

  return rows
    .map((r) => normalizeItem({ ...r, imageData: withImage.has(r.id) }))
    .filter((i): i is TowerItem => i !== null);
}

export async function upsertItem(input: ItemInput): Promise<string> {
  const data = {
    name: input.name,
    description: input.description,
    rarity: input.rarity,
    effectKind: input.effectKind,
    effectValue: input.effectValue,
    effectKind2: input.effectKind2,
    effectValue2: input.effectValue2,
    enabled: input.enabled,
  };

  if (input.id) {
    const updated = await prisma.item.update({
      where: { id: input.id },
      data,
      select: { id: true },
    });
    return updated.id;
  }

  const universe = await getCurrentUniverse();
  const [taken, max] = await Promise.all([
    prisma.item.findMany({
      where: { universeId: universe.id },
      select: { slug: true },
    }),
    prisma.item.aggregate({
      where: { universeId: universe.id },
      _max: { position: true },
    }),
  ]);

  const created = await prisma.item.create({
    data: {
      ...data,
      slug: uniqueSlug(
        slugify(input.name) || "objet",
        taken.map((t) => t.slug),
      ),
      universeId: universe.id,
      position: (max._max.position ?? -1) + 1,
    },
    select: { id: true },
  });
  return created.id;
}

export async function deleteItem(id: string): Promise<void> {
  const universe = await getCurrentUniverse();
  // Cadré sur l'univers administré : un id venant du client ne doit pas pouvoir
  // supprimer une ligne d'un autre anime.
  await prisma.item.deleteMany({ where: { id, universeId: universe.id } });
}

/** Déplace un objet dans la liste (échange de positions avec son voisin). */
export async function moveItem(id: string, direction: -1 | 1): Promise<void> {
  const universe = await getCurrentUniverse();
  const items = await prisma.item.findMany({
    where: { universeId: universe.id },
    orderBy: { position: "asc" },
    select: { id: true, position: true },
  });

  const index = items.findIndex((i) => i.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= items.length) return;

  await prisma.$transaction([
    prisma.item.update({
      where: { id: items[index].id },
      data: { position: items[target].position },
    }),
    prisma.item.update({
      where: { id: items[target].id },
      data: { position: items[index].position },
    }),
  ]);
}
