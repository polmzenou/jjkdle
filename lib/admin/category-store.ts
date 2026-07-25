import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUniverse } from "@/lib/universes/current";

/**
 * CRUD des CATÉGORIES du builder d'un univers.
 *
 * Pendant de `lib/admin/attribute-store.ts` (qui rend JJKdle jouable sans code) :
 * ce module rend le BUILDER jouable sans code. Jusqu'ici la table `Category`
 * n'avait qu'un seul écrivain — `prisma/seed.ts`, câblé en dur sur JJK — si bien
 * qu'un nouvel univers naissait avec zéro catégorie et aucun moyen d'en créer.
 *
 * Module server-only. L'univers ciblé est l'univers COURANT : l'univers
 * administré sur /admin (cookie, cf. lib/universes/admin-scope.ts), l'univers de
 * l'URL sur /csm/games/builder. Les deux appelants partagent donc ce store sans
 * avoir à passer d'identifiant.
 */

/** Forme éditable d'une catégorie (vue admin). */
export interface CategoryInput {
  /** Absent = création. */
  id?: string;
  label: string;
  description: string;
  /** Importance relative dans le score final (ratio entre catégories). */
  weight: number;
  /** Nombre maximum de cartes proposées dans la ligne au tirage. */
  drawCount: number;
  /** Rang d'affichage ; ignoré à la création (placée en fin de liste). */
  position?: number;
}

/** Catégorie telle que listée dans l'admin. */
export interface AdminCategory {
  id: string;
  slug: string;
  label: string;
  description: string;
  weight: number;
  drawCount: number;
  position: number;
  /** Nombre de personnages de l'univers notés sur cette catégorie. */
  usageCount: number;
}

const MAX_WEIGHT = 10;
const MAX_DRAW_COUNT = 12;

/** `"Contrat démoniaque"` → `"contrat-demoniaque"`. */
export function slugifyCategory(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Catégories de l'univers courant, avec leur usage dans le roster.
 *
 * L'usage n'est pas une jointure : l'éligibilité d'un personnage à une catégorie
 * est la PRÉSENCE de la clé dans son JSON `ratings` (cf. `eligibleFor`). On
 * compte donc côté applicatif, sur un roster de quelques dizaines de lignes.
 */
export async function listCategories(): Promise<AdminCategory[]> {
  const { id: universeId } = await getCurrentUniverse();
  const [rows, characters] = await Promise.all([
    prisma.category.findMany({
      where: { universeId },
      orderBy: { position: "asc" },
    }),
    prisma.character.findMany({
      where: { universeId },
      select: { ratings: true },
    }),
  ]);

  const usage = new Map<string, number>();
  for (const c of characters) {
    for (const key of Object.keys((c.ratings ?? {}) as Record<string, unknown>)) {
      usage.set(key, (usage.get(key) ?? 0) + 1);
    }
  }

  return rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    label: c.label,
    description: c.description,
    weight: c.weight,
    drawCount: c.drawCount,
    position: c.position,
    usageCount: usage.get(c.id) ?? 0,
  }));
}

/**
 * Crée ou met à jour une catégorie de l'univers courant.
 *
 * `id` et `slug` sont IMMUABLES après création : l'`id` est la clé de la
 * catégorie dans le JSON `Character.ratings`, le renommer orphelinerait toutes
 * les notes déjà saisies. Seuls libellé, description, poids, tirages et position
 * sont éditables.
 */
export async function upsertCategory(input: CategoryInput): Promise<void> {
  const { id: universeId, slug: universeSlug } = await getCurrentUniverse();

  const label = input.label.trim();
  const description = input.description.trim();
  const weight = clamp(input.weight, 0.1, MAX_WEIGHT);
  const drawCount = Math.round(clamp(input.drawCount, 1, MAX_DRAW_COUNT));

  if (input.id) {
    // `updateMany` borné à l'univers : un id d'un autre univers ne peut rien
    // modifier, même si un admin en forge un (mêmes garde-fous que les attributs).
    const { count } = await prisma.category.updateMany({
      where: { id: input.id, universeId },
      data: {
        label,
        description,
        weight,
        drawCount,
        ...(input.position != null
          ? { position: Math.max(0, Math.round(input.position)) }
          : {}),
      },
    });
    if (count === 0) throw new Error("Catégorie introuvable dans cet univers.");
    return;
  }

  const slug = slugifyCategory(label);
  if (!slug) throw new Error("Le libellé ne produit aucun identifiant lisible.");

  const max = await prisma.category.aggregate({
    where: { universeId },
    _max: { position: true },
  });

  await prisma.category.create({
    data: {
      // `Category.id` est un PK GLOBAL (pas de composite avec universeId) : on le
      // préfixe par l'univers pour que deux animes puissent avoir une catégorie
      // « vitesse » sans collision. C'est aussi la clé dans `Character.ratings`.
      id: `${universeSlug}-${slug}`,
      slug,
      universeId,
      label,
      description,
      weight,
      drawCount,
      position: (max._max.position ?? -1) + 1,
    },
  });
}

/**
 * Supprime une catégorie. DESTRUCTIF : les notes des personnages sur cette
 * catégorie sont retirées de leur JSON `ratings`, sans quoi elles resteraient
 * en base à référencer une catégorie disparue — invisible dans l'admin, mais
 * ressuscitée si un jour une catégorie reprenait le même id.
 */
export async function deleteCategory(id: string): Promise<void> {
  const { id: universeId } = await getCurrentUniverse();

  const category = await prisma.category.findFirst({
    where: { id, universeId },
    select: { id: true },
  });
  if (!category) throw new Error("Catégorie introuvable dans cet univers.");

  const characters = await prisma.character.findMany({
    where: { universeId },
    select: { id: true, ratings: true },
  });

  await prisma.$transaction([
    prisma.category.delete({ where: { id } }),
    ...characters.flatMap((c) => {
      const ratings = { ...((c.ratings ?? {}) as Record<string, number>) };
      if (!(id in ratings)) return [];
      delete ratings[id];
      return [
        prisma.character.update({
          where: { id: c.id },
          data: { ratings: ratings as Prisma.InputJsonValue },
        }),
      ];
    }),
  ]);
}

/**
 * Déplace une catégorie d'un rang dans l'ordre d'affichage (échange de
 * positions avec sa voisine). L'ordre pilote la grille du builder.
 */
export async function moveCategory(
  id: string,
  direction: "up" | "down",
): Promise<void> {
  const { id: universeId } = await getCurrentUniverse();
  const rows = await prisma.category.findMany({
    where: { universeId },
    orderBy: { position: "asc" },
    select: { id: true },
  });

  const index = rows.findIndex((r) => r.id === id);
  if (index === -1) throw new Error("Catégorie introuvable dans cet univers.");
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= rows.length) return; // déjà en butée

  // Les positions en base peuvent être trouées ou dupliquées (seed, éditions
  // manuelles) : on réécrit l'ordre complet plutôt que d'échanger deux valeurs.
  const reordered = [...rows];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  await prisma.$transaction(
    reordered.map((row, position) =>
      prisma.category.update({ where: { id: row.id }, data: { position } }),
    ),
  );
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
