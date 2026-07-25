import { prisma } from "@/lib/prisma";
import { getCachedImage } from "@/lib/admin/image-cache";
import { getCurrentUniverse } from "@/lib/universes/current";
import type { CategoryConfig, CategoryId } from "@/data/roster/categories";
import type { Character, CharacterTier } from "@/data/roster/characters";
import type { RankingCondition } from "@/data/ranking/conditions";

/**
 * Accès en lecture au contenu du jeu (source de vérité = base Neon).
 * Modules server-only (importent le client Prisma) : à n'utiliser que depuis
 * des Server Components, Server Actions ou Route Handlers.
 */

type CharacterRow = {
  id: string;
  name: string;
  title: string;
  tier: string;
  image: string | null;
  ratings: unknown;
  battleValue: number | null;
  // Attributs data-driven. Absent = pas chargé par cette requête.
  attributeValues?: {
    numericValue: number | null;
    attribute: { key: string };
    option: { value: string } | null;
  }[];
};

/** Sélection des valeurs d'attributs data-driven (une seule requête, pas de N+1). */
const ATTRIBUTE_VALUES_SELECT = {
  select: {
    numericValue: true,
    attribute: { select: { key: true } },
    option: { select: { value: true } },
  },
} as const;

/**
 * `CharacterAttribute[]` → `Record<clé, valeur>` : option → `string`, NUMERIC →
 * `number`. Une ligne sans valeur exploitable est ignorée (= non renseigné).
 */
function toAttributes(
  rows: NonNullable<CharacterRow["attributeValues"]>,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const row of rows) {
    const value = row.option ? row.option.value : row.numericValue;
    if (value != null) out[row.attribute.key] = value;
  }
  return out;
}

function toCharacter(row: CharacterRow): Character {
  // L'image en cache (bouton « OUAIS ») prime sur celle stockée en base.
  const image = getCachedImage(row.id) ?? row.image ?? undefined;
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    tier: row.tier as CharacterTier,
    ...(image ? { image } : {}),
    ratings: (row.ratings ?? {}) as Partial<Record<CategoryId, number>>,
    ...(row.battleValue != null ? { battleValue: row.battleValue } : {}),
    ...(row.attributeValues
      ? { attributes: toAttributes(row.attributeValues) }
      : {}),
  };
}

/** Catégories de stats du builder de l'univers, dans l'ordre d'affichage. */
export async function getCategories(
  universeId?: string,
): Promise<CategoryConfig[]> {
  const uid = universeId ?? (await getCurrentUniverse()).id;
  const rows = await prisma.category.findMany({
    where: { universeId: uid },
    orderBy: { position: "asc" },
  });
  return rows.map((c) => ({
    id: c.id as CategoryId,
    label: c.label,
    description: c.description,
    weight: c.weight,
    drawCount: c.drawCount,
  }));
}

/** Roster complet de l'univers, dans l'ordre d'affichage.
 * `universeId` par défaut = univers courant (cf. getCurrentUniverse) ; un id
 * explicite permet à l'admin de cibler un autre univers (étape 5).
 * On ne sélectionne PAS `imageData` (les octets) : l'image est servie par la
 * route /api/characters/[id]/image, `image` ne porte que l'URL d'affichage. */
export async function getRoster(universeId?: string): Promise<Character[]> {
  const uid = universeId ?? (await getCurrentUniverse()).id;
  const rows = await prisma.character.findMany({
    where: { universeId: uid },
    orderBy: { position: "asc" },
    select: {
      id: true,
      name: true,
      title: true,
      tier: true,
      image: true,
      ratings: true,
      battleValue: true,
      attributeValues: ATTRIBUTE_VALUES_SELECT,
    },
  });
  return rows.map(toCharacter);
}

/** Roster indexé par id (pour résoudre un personnage côté client du jeu Pyramid). */
export async function getCharacterMap(
  universeId?: string,
): Promise<Record<string, Character>> {
  const roster = await getRoster(universeId);
  return Object.fromEntries(roster.map((c) => [c.id, c]));
}

/** Conditions du jeu Pyramid de l'univers. */
export async function getConditions(
  universeId?: string,
): Promise<RankingCondition[]> {
  const uid = universeId ?? (await getCurrentUniverse()).id;
  const rows = await prisma.rankingCondition.findMany({
    where: { universeId: uid },
    orderBy: { position: "asc" },
  });
  return rows.map((c) => ({
    id: c.id,
    pool: c.pool,
    category: c.category,
    prompt: c.prompt,
    order: c.order,
  }));
}
