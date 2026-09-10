import type { DraftCategoryId } from "./types";

/**
 * Configuration d'univers du draft — module PUR.
 *
 * Même motif que `lib/games/tower/config.ts` : tout ce qui est propre à un
 * anime sort du moteur. La seule chose qu'un univers doit déclarer ici, c'est
 * **d'où vient la note** qui classe chaque catégorie du draft — autrement dit à
 * quelle catégorie du builder correspond chaque axe du plateau.
 *
 * Sert au bouton « Tout importer » (`lib/admin/draft-import.ts`), qui range les
 * personnages du roster par note décroissante sur la catégorie source avant de
 * les découper en tiers. Sans cette table, l'import ne saurait pas qui est
 * « rapide » ou « fort » dans un univers donné.
 *
 * On mappe par **slug** de `Category` et non par `id` : le slug est la clé
 * stable par univers (`@@unique([universeId, slug])`), lisible, et il évite de
 * répéter le préfixe d'univers (`csm-hax` → `hax`).
 */
export interface DraftConfig {
  /** Catégorie du draft → slug de la `Category` du builder qui la classe. */
  categorySources: Readonly<Record<DraftCategoryId, string>>;
}

/**
 * Config JJK, qui fait office de DÉFAUT (même convention que `gameCopy` et
 * `tower`). Cinq axes ont un homonyme exact côté builder ; « Black Flash » et
 * « Coéquipier » n'en ont pas, et retombent sur les deux catégories restantes
 * (Polyvalence, Endurance) — le sens est proche, et surtout ce sont les deux
 * seules notes encore libres.
 */
export const JJK_DRAFT_CONFIG: DraftConfig = {
  categorySources: {
    "occult-energy": "cursed-energy",
    "physical-strength": "physical-strength",
    speed: "speed",
    "battle-iq": "battle-iq",
    "innate-technique": "innate-technique",
    "domain-expansion": "domain-expansion",
    "black-flash": "versatility",
    teammate: "endurance",
  },
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
