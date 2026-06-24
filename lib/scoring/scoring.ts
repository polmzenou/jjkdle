import type { CategoryConfig, CategoryId } from "@/data/roster/categories";
import type { Character } from "@/data/roster/characters";
import { getGrade, type GradeTier } from "./grades";

/**
 * Logique de score isolée (aucune dépendance UI/Next) → testable unitairement.
 *
 * Score d'une catégorie = rating(0–100) × poids.
 * Score total = Σ(rating×poids) / Σ(100×poids) × 1000  → normalisé sur 1000.
 * Un build parfait (toutes notes à 100) vaut donc exactement 1000.
 */

/** Une sélection associe chaque catégorie au personnage choisi (ou null si vide). */
export type Selection = Partial<Record<CategoryId, Character | null>>;

export const MAX_SCORE = 1000;

/** Score brut d'une catégorie pour un personnage donné. */
export function computeCategoryScore(
  character: Character | null | undefined,
  category: CategoryConfig,
): number {
  if (!character) return 0;
  const rating = character.ratings[category.id] ?? 0;
  return rating * category.weight;
}

/**
 * Score total normalisé sur 1000.
 * Le dénominateur = score maximum théorique (toutes catégories à 100).
 */
export function computeTotalScore(
  selection: Selection,
  categories: CategoryConfig[],
): number {
  if (categories.length === 0) return 0;

  let earned = 0;
  let max = 0;
  for (const category of categories) {
    earned += computeCategoryScore(selection[category.id] ?? null, category);
    max += 100 * category.weight;
  }
  if (max === 0) return 0;

  return Math.round((earned / max) * MAX_SCORE);
}

/** Détail par catégorie — pratique pour l'affichage du récap de fin. */
export interface CategoryBreakdown {
  category: CategoryConfig;
  character: Character | null;
  /** Score brut (rating × poids). */
  raw: number;
  /** Contribution normalisée sur 1000 de cette catégorie. */
  normalized: number;
}

export function computeBreakdown(
  selection: Selection,
  categories: CategoryConfig[],
): CategoryBreakdown[] {
  const max = categories.reduce((sum, c) => sum + 100 * c.weight, 0);
  return categories.map((category) => {
    const character = selection[category.id] ?? null;
    const raw = computeCategoryScore(character, category);
    return {
      category,
      character,
      raw,
      normalized: max === 0 ? 0 : Math.round((raw / max) * MAX_SCORE),
    };
  });
}

/** Score + grade en une passe. */
export function evaluateBuild(
  selection: Selection,
  categories: CategoryConfig[],
): { score: number; grade: GradeTier } {
  const score = computeTotalScore(selection, categories);
  return { score, grade: getGrade(score) };
}
