import type { DraftCategoryId } from "./types";

/**
 * Catégories du plateau de draft.
 *
 * Il n'y a plus de liste en dur : les catégories du draft SONT celles du
 * builder de l'univers (table `Category`), dont on retient les huit déclarées
 * par `UniverseConfig.draft`. Un plateau Demon Slayer affiche donc « Souffle »
 * et « Piliers », et non « Black Flash » — du vocabulaire Jujutsu Kaisen qui ne
 * voulait rien dire ailleurs, et qui obligeait surtout l'import à plaquer les
 * notes d'un axe sur un axe qui n'existait pas.
 *
 * La liste effective est résolue côté serveur (`getDraftCategories`) puis
 * passée en props : tout ce qui vit sous `lib/games/draft/` la reçoit en
 * paramètre plutôt que de l'importer.
 */

/** Métadonnées d'affichage d'une catégorie de draft. */
export interface DraftCategory {
  /** Slug de la `Category` du builder — clé stable par univers. */
  id: DraftCategoryId;
  label: string;
  description: string;
}

/** Nombre de catégories du plateau : un slot par catégorie, donc un budget. */
export const DRAFT_CATEGORY_COUNT = 8;

/** Index par id, pour résoudre un libellé sans reparcourir la liste. */
export function draftCategoryById(
  categories: DraftCategory[],
): Record<string, DraftCategory> {
  return Object.fromEntries(categories.map((c) => [c.id, c]));
}
