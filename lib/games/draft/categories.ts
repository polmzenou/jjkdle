import type { DraftCategoryId } from "./types";

/** Métadonnées d'affichage d'une catégorie de draft. */
export interface DraftCategory {
  id: DraftCategoryId;
  label: string;
  description: string;
}

/** Les 8 catégories du draft, dans l'ordre d'affichage du plateau. */
export const DRAFT_CATEGORIES: DraftCategory[] = [
  {
    id: "occult-energy",
    label: "Stock d'énergie occulte",
    description: "Réserve brute d'énergie maudite.",
  },
  {
    id: "physical-strength",
    label: "Force physique",
    description: "Puissance au corps à corps.",
  },
  {
    id: "speed",
    label: "Vitesse",
    description: "Vitesse de déplacement et de réaction.",
  },
  {
    id: "battle-iq",
    label: "Battle IQ",
    description: "Intelligence tactique en plein combat.",
  },
  {
    id: "innate-technique",
    label: "Sort inné",
    description: "Puissance de la technique innée (perso meneur au combat).",
  },
  {
    id: "domain-expansion",
    label: "Extension du territoire",
    description: "Maîtrise de l'Extension du Territoire.",
  },
  {
    id: "black-flash",
    label: "Black Flash",
    description: "Facilité à déclencher le Black Flash.",
  },
  {
    id: "teammate",
    label: "Coéquipier",
    description: "Valeur du sorcier comme coéquipier / soutien d'équipe.",
  },
];

export const DRAFT_CATEGORY_BY_ID: Record<DraftCategoryId, DraftCategory> =
  Object.fromEntries(DRAFT_CATEGORIES.map((c) => [c.id, c])) as Record<
    DraftCategoryId,
    DraftCategory
  >;

/** Catégorie servant d'avatar de combat (perso affiché face aux boss). */
export const COMBAT_AVATAR_CATEGORY: DraftCategoryId = "innate-technique";
