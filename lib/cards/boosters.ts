import { raritiesAtLeast, type CardRarity } from "./rarity";
import type { RarityWeights, RateTable } from "./rates";

/**
 * Catalogue des BOOSTERS. Métadonnée en code, possession en base
 * (`UserBooster`) — même architecture que les badges/titres/cadres.
 */

export type BoosterKind = "simple" | "bronze" | "silver" | "gold";

/** Les 4 boosters, du plus banal au plus rare. */
export const BOOSTER_KINDS: BoosterKind[] = [
  "simple",
  "bronze",
  "silver",
  "gold",
];

/**
 * Slot à tirage RESTREINT, qui remplace un slot libre du booster.
 * `pool` = raretés autorisées ; `rates` = poids dédiés, sinon la table du
 * booster est réutilisée puis restreinte au pool et renormalisée.
 */
export interface GuaranteedSlot {
  pool: CardRarity[];
  rates?: RarityWeights;
}

export interface BoosterDefinition {
  kind: BoosterKind;
  /** Libellé affiché (FR). */
  label: string;
  /** Couleur de l'enveloppe (hex). */
  accent: string;
  /** Nombre total de cartes, slots garantis inclus. */
  cardCount: number;
  /** Table de taux appliquée aux slots libres. */
  table: RateTable;
  /**
   * Slots garantis. Ils CONSOMMENT des slots du booster (ils ne s'ajoutent pas
   * à `cardCount`) et sont tirés en dernier, pour que la garantie ne puisse pas
   * être « gâchée » par un slot libre déjà chanceux.
   */
  guaranteed?: GuaranteedSlot[];
}

export const BOOSTERS: Record<BoosterKind, BoosterDefinition> = {
  simple: {
    kind: "simple",
    label: "Booster simple",
    accent: "#94a3b8",
    cardCount: 3,
    table: "base",
  },
  bronze: {
    kind: "bronze",
    label: "Booster bronze",
    accent: "#c2762f",
    cardCount: 3,
    // Taux de base, mais un slot ne peut pas descendre sous UNCOMMON.
    table: "base",
    guaranteed: [{ pool: raritiesAtLeast("uncommon") }],
  },
  silver: {
    kind: "silver",
    label: "Booster argent",
    accent: "#cbd5e1",
    cardCount: 3,
    table: "boost",
  },
  gold: {
    kind: "gold",
    label: "Booster doré",
    accent: "#fbbf24",
    cardCount: 4,
    table: "boost",
    // La signature du doré : une EPIC ou une LEGENDARY, garantie à 100 %.
    guaranteed: [
      { pool: ["epic", "legendary"], rates: { epic: 88, legendary: 12 } },
    ],
  },
};

/** Définition d'un booster (repli sur `simple` si la clé est inconnue). */
export function getBooster(kind: string): BoosterDefinition {
  return BOOSTERS[kind as BoosterKind] ?? BOOSTERS.simple;
}

/** Garde anti-tamper : la valeur est-elle une clé de booster connue ? */
export function isBoosterKind(value: unknown): value is BoosterKind {
  return typeof value === "string" && (BOOSTER_KINDS as string[]).includes(value);
}

/** Une partie terminée sur deux fait tomber un booster. */
export const BOOSTER_DROP_CHANCE = 0.5;

/**
 * Rareté du booster lui-même, tirée au moment du drop. Le doré est très rare :
 * ~1 drop sur 50, soit ~1 partie sur 100.
 */
export const BOOSTER_DROP_RATES: Record<BoosterKind, number> = {
  simple: 62,
  bronze: 25,
  silver: 11,
  gold: 2,
};
