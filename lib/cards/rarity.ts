import {
  normalizeTier,
  type CharacterTier,
} from "@/data/roster/characters";

/**
 * Échelle de rareté des CARTES à collectionner.
 *
 * Volontairement SÉPARÉE de `lib/profile/rarity.ts` (4 crans, titres et cadres) :
 * même mot, concept différent. Ici la rareté n'est pas une étiquette cosmétique,
 * elle pilote les taux de tirage, la valeur de revente et le bonus de deck.
 *
 * Règle fondatrice : **la rareté EST le tier du personnage** (`Character.tier`),
 * pas un champ à part. Retierer un perso depuis /admin reclasse donc aussi ses
 * cartes déjà distribuées — c'est le seul curseur, et il est déjà outillé.
 */

export type CardRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary"
  | "exotic";

/** Les 6 raretés, du plus commun au plus rare. Ordre des filtres et des tris. */
export const CARD_RARITIES: CardRarity[] = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "exotic",
];

/** Correspondance tier canonique → rareté de carte. Bijection, dans l'ordre. */
export const RARITY_BY_TIER: Record<CharacterTier, CardRarity> = {
  "4minus": "common",
  "4": "uncommon",
  "3": "rare",
  "2": "epic",
  "1": "legendary",
  s: "exotic",
};

export interface CardRarityStyle {
  /** Libellé affiché sous le nom, sur la carte. */
  label: string;
  /**
   * Couleur d'accent (hex) : contour de la carte ET couleur du libellé.
   * `common` reste neutre — la consigne est « pas de couleur ».
   */
  color: string;
  /**
   * `true` = contour et libellé en dégradé arc-en-ciel animé au lieu de `color`
   * (uniquement EXOTIC). `color` reste renseigné comme repli.
   */
  rainbow: boolean;
  /** Coins rendus par un doublon, et par une revente volontaire. */
  sellValue: number;
  /** Bonus d'XP (en %) apporté par la carte quand elle est dans le deck. */
  deckXpPct: number;
  /** Bonus de coins (en %) apporté par la carte quand elle est dans le deck. */
  deckCoinPct: number;
}

/**
 * Table de référence des raretés. C'est LE curseur d'équilibrage de la
 * collection : valeur de revente et puissance du deck se règlent ici.
 *
 * Deck plein d'EXOTIC = +75 % d'XP et +75 % de coins (les bonus des 3 slots
 * s'additionnent). Volontairement fort : c'est la carotte de la collection.
 */
export const CARD_RARITY_STYLES: Record<CardRarity, CardRarityStyle> = {
  common: {
    label: "COMMUN",
    color: "#9ca3af",
    rainbow: false,
    sellValue: 2,
    deckXpPct: 1,
    deckCoinPct: 0,
  },
  uncommon: {
    label: "UNCOMMON",
    color: "#22c55e",
    rainbow: false,
    sellValue: 5,
    deckXpPct: 2,
    deckCoinPct: 0,
  },
  rare: {
    label: "RARE",
    color: "#38bdf8",
    rainbow: false,
    sellValue: 8,
    deckXpPct: 4,
    deckCoinPct: 2,
  },
  epic: {
    label: "EPIC",
    color: "#a78bfa",
    rainbow: false,
    sellValue: 10,
    deckXpPct: 7,
    deckCoinPct: 5,
  },
  legendary: {
    label: "LEGENDARY",
    color: "#f59e0b",
    rainbow: false,
    sellValue: 15,
    deckXpPct: 12,
    deckCoinPct: 10,
  },
  exotic: {
    label: "EXOTIC",
    color: "#f472b6",
    rainbow: true,
    sellValue: 50,
    deckXpPct: 25,
    deckCoinPct: 25,
  },
};

/** Style d'une rareté (repli sur `common` si valeur inconnue). */
export function cardRarityStyle(rarity: CardRarity): CardRarityStyle {
  return CARD_RARITY_STYLES[rarity] ?? CARD_RARITY_STYLES.common;
}

/**
 * Rareté d'un tier écrit en base. Passe par `normalizeTier` (qui tolère « 4- »,
 * « S » majuscule, etc.) ; un tier illisible retombe sur `common` plutôt que de
 * jeter — une fiche mal remplie ne doit pas casser l'ouverture d'un booster.
 */
export function rarityOfTier(tier: unknown): CardRarity {
  const normalized = normalizeTier(tier);
  return normalized ? RARITY_BY_TIER[normalized] : "common";
}

/** Coins rendus par un doublon / une revente de cette rareté. */
export function sellValueOf(rarity: CardRarity): number {
  return cardRarityStyle(rarity).sellValue;
}

/** Garde anti-tamper : la valeur vient-elle bien de l'échelle connue ? */
export function isCardRarity(value: unknown): value is CardRarity {
  return (
    typeof value === "string" && (CARD_RARITIES as string[]).includes(value)
  );
}

/** Position dans l'échelle (0 = common). `-1` si inconnue. */
export function rarityRank(rarity: CardRarity): number {
  return CARD_RARITIES.indexOf(rarity);
}

/** Les raretés au moins aussi rares que `min` (bornes incluses). */
export function raritiesAtLeast(min: CardRarity): CardRarity[] {
  const from = rarityRank(min);
  return from < 0 ? [...CARD_RARITIES] : CARD_RARITIES.slice(from);
}
