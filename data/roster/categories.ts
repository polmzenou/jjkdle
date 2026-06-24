/**
 * Catégories de stats du jeu "Build the Perfect Sorcerer".
 *
 * Tout est piloté par la data (pas de logique en dur ailleurs) :
 *  - `weight`     : importance relative de la catégorie dans le score final.
 *  - `drawCount`  : plafond de cartes affichées dans la ligne. Le tirage prend
 *                   `min(drawCount, nbPersonnagesÉligibles)` — donc certaines
 *                   catégories rares (ex. Maîtrise du Domaine) montrent moins de
 *                   cartes, ce qui est voulu.
 *
 * L'ID d'une catégorie sert de clé dans `Character.ratings`. Un personnage est
 * « éligible » à une catégorie uniquement s'il possède une note pour cet ID.
 */

export type CategoryId =
  | "innate-technique"
  | "speed"
  | "curse-status"
  | "battle-iq"
  | "physical-strength"
  | "cursed-energy"
  | "domain-expansion"
  | "versatility"
  | "endurance";

export interface CategoryConfig {
  id: CategoryId;
  label: string;
  description: string;
  /** Importance relative dans le score (sans unité, ratio entre catégories). */
  weight: number;
  /** Nombre maximum de personnages proposés dans la ligne au tirage. */
  drawCount: number;
}

export const CATEGORIES: CategoryConfig[] = [
  {
    id: "innate-technique",
    label: "Sort inné",
    description: "Puissance et originalité de la technique innée.",
    weight: 1.4,
    drawCount: 4,
  },
  {
    id: "speed",
    label: "Vitesse",
    description: "Vitesse de déplacement et de réaction au combat.",
    weight: 1.0,
    drawCount: 4,
  },
  {
    id: "curse-status",
    label: "Fléau / Shikigami",
    description: "Puissance en tant que fléau ou shikigami invoqué.",
    weight: 1.3,
    drawCount: 4,
  },
  {
    id: "battle-iq",
    label: "Battle IQ",
    description: "Intelligence tactique en plein combat.",
    weight: 1.2,
    drawCount: 4,
  },
  {
    id: "physical-strength",
    label: "Force physique",
    description: "Puissance brute au corps à corps.",
    weight: 1.0,
    drawCount: 4,
  },
  {
    id: "cursed-energy",
    label: "Énergie maudite",
    description: "Réserve et flux d'énergie maudite.",
    weight: 1.2,
    drawCount: 4,
  },
  {
    id: "domain-expansion",
    label: "Extension du Territoire",
    description: "Maîtrise de l'Extension du Territoire (tous ne l'ont pas).",
    weight: 1.6,
    drawCount: 4,
  },
  {
    id: "versatility",
    label: "Polyvalence",
    description: "Diversité des outils et adaptabilité.",
    weight: 0.9,
    drawCount: 4,
  },
  {
    id: "endurance",
    label: "Endurance",
    description: "Résistance et capacité à tenir dans la durée.",
    weight: 0.9,
    drawCount: 4,
  },
];

/** Accès rapide à une catégorie par son ID. */
export const CATEGORY_BY_ID: Record<CategoryId, CategoryConfig> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, CategoryConfig>;
