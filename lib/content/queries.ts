import { prisma } from "@/lib/prisma";
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
  // Attributs JJKdle (nullable en base = non renseigné).
  race: Character["race"] | null;
  gender: Character["gender"] | null;
  grade: Character["grade"] | null;
  affiliation: Character["affiliation"] | null;
  clan: Character["clan"] | null;
  appearanceArc: Character["appearanceArc"] | null;
  hasDomain: boolean | null;
  cursedEnergy: number | null;
};

function toCharacter(row: CharacterRow): Character {
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    tier: row.tier as CharacterTier,
    ...(row.image ? { image: row.image } : {}),
    ratings: (row.ratings ?? {}) as Partial<Record<CategoryId, number>>,
    ...(row.battleValue != null ? { battleValue: row.battleValue } : {}),
    // null → undefined (omis) pour rester cohérent avec le type optionnel.
    ...(row.race != null ? { race: row.race } : {}),
    ...(row.gender != null ? { gender: row.gender } : {}),
    ...(row.grade != null ? { grade: row.grade } : {}),
    ...(row.affiliation != null ? { affiliation: row.affiliation } : {}),
    ...(row.clan != null ? { clan: row.clan } : {}),
    ...(row.appearanceArc != null ? { appearanceArc: row.appearanceArc } : {}),
    ...(row.hasDomain != null ? { hasDomain: row.hasDomain } : {}),
    ...(row.cursedEnergy != null ? { cursedEnergy: row.cursedEnergy } : {}),
  };
}

/** Catégories de stats du builder, dans l'ordre d'affichage. */
export async function getCategories(): Promise<CategoryConfig[]> {
  const rows = await prisma.category.findMany({ orderBy: { position: "asc" } });
  return rows.map((c) => ({
    id: c.id as CategoryId,
    label: c.label,
    description: c.description,
    weight: c.weight,
    drawCount: c.drawCount,
  }));
}

/** Roster complet, dans l'ordre d'affichage.
 * On ne sélectionne PAS `imageData` (les octets) : l'image est servie par la
 * route /api/characters/[id]/image, `image` ne porte que l'URL d'affichage. */
export async function getRoster(): Promise<Character[]> {
  const rows = await prisma.character.findMany({
    orderBy: { position: "asc" },
    select: {
      id: true,
      name: true,
      title: true,
      tier: true,
      image: true,
      ratings: true,
      battleValue: true,
      race: true,
      gender: true,
      grade: true,
      affiliation: true,
      clan: true,
      appearanceArc: true,
      hasDomain: true,
      cursedEnergy: true,
    },
  });
  return rows.map(toCharacter);
}

/** Roster indexé par id (pour résoudre un personnage côté client du jeu Pyramid). */
export async function getCharacterMap(): Promise<Record<string, Character>> {
  const roster = await getRoster();
  return Object.fromEntries(roster.map((c) => [c.id, c]));
}

/** Conditions du jeu Pyramid. */
export async function getConditions(): Promise<RankingCondition[]> {
  const rows = await prisma.rankingCondition.findMany({
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
