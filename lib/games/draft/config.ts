/**
 * Configuration d'univers du draft — module PUR.
 *
 * Même motif que `lib/games/tower/config.ts` : tout ce qui est propre à un
 * anime sort du moteur. Un univers déclare ici QUELLES de ses catégories de
 * builder composent le plateau de draft, et laquelle désigne l'avatar de
 * combat. Les libellés et descriptions, eux, viennent de la table `Category` :
 * une seule source de vérité, éditable depuis l'admin.
 *
 * Les catégories sont désignées par leur **slug** (clé stable par univers,
 * `@@unique([universeId, slug])`), pas par leur `id` global qui porte le
 * préfixe de l'univers.
 */
export interface DraftConfig {
  /**
   * Les `DRAFT_CATEGORY_COUNT` catégories du plateau, dans l'ordre d'affichage.
   *
   * Choisies parmi les catégories les mieux notées de l'univers : chaque ligne
   * a besoin d'au moins 5 personnages notés, et de 15 pour un pool complet.
   */
  categories: readonly string[];
  /**
   * Catégorie dont le personnage draftÉ sert d'avatar de combat face aux boss.
   * Doit faire partie de `categories`.
   */
  avatarCategory: string;
}

/** Config JJK, qui fait office de DÉFAUT (même convention que `gameCopy`). */
export const JJK_DRAFT_CONFIG: DraftConfig = {
  categories: [
    "innate-technique",
    "cursed-energy",
    "physical-strength",
    "speed",
    "battle-iq",
    "domain-expansion",
    "curse-status",
    "endurance",
  ],
  avatarCategory: "innate-technique",
};

/**
 * Surcharge partielle déclarée par un univers dans `UniverseConfig.draft`.
 * Tout champ absent garde la valeur JJK.
 */
export type DraftConfigOverride = Partial<DraftConfig>;

/** Config effective d'un univers. */
export function resolveDraftConfig(override?: DraftConfigOverride): DraftConfig {
  return { ...JJK_DRAFT_CONFIG, ...override };
}
