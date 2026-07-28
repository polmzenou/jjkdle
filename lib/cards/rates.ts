import { CARD_RARITIES, type CardRarity } from "./rarity";

/**
 * Taux de tirage d'une carte, PAR RARETÉ (jamais par personnage).
 *
 * Conséquence directe : le nombre de personnages dans un tier ne change pas la
 * probabilité de tirer ce tier, seulement lequel de ses persos sort. Un tier à
 * 21 personnages n'est donc pas 21 fois plus probable qu'un tier à 1 — sans
 * quoi le roster JJK actuel (pyramide inversée) rendrait le légendaire banal.
 *
 * Les poids ci-dessous somment à 100 pour se lire comme des pourcentages, mais
 * `pickRarity` normalise de toute façon : seul le RAPPORT entre eux compte.
 */

/** Table de BASE — boosters simple et bronze. */
export const BASE_RATES: Record<CardRarity, number> = {
  common: 46,
  uncommon: 27,
  rare: 15,
  epic: 10,
  legendary: 1.8,
  exotic: 0.2,
};

/**
 * Table BOOSTÉE — boosters argent et doré. Décale la masse vers rare/epic sans
 * rendre le légendaire courant (×~2 seulement) : le doré tire sa valeur de son
 * slot garanti, pas de sa table.
 */
export const BOOST_RATES: Record<CardRarity, number> = {
  common: 20,
  uncommon: 30,
  rare: 26,
  epic: 20,
  legendary: 3.5,
  exotic: 0.5,
};

export type RateTable = "base" | "boost";

export const RATE_TABLES: Record<RateTable, Record<CardRarity, number>> = {
  base: BASE_RATES,
  boost: BOOST_RATES,
};

export type RarityWeights = Partial<Record<CardRarity, number>>;

/**
 * Restreint des poids aux raretés RÉELLEMENT disponibles puis les renormalise
 * sur 100.
 *
 * C'est le garde-fou central du système : un univers dont le roster n'a aucun
 * personnage d'un tier donné (le cas de JJK, sans aucun tier `4minus`) ne doit
 * ni planter, ni gaspiller la masse de probabilité de la rareté absente. Elle
 * est simplement redistribuée au prorata sur les raretés qui existent.
 *
 * Renvoie `{}` si plus rien n'est disponible — à l'appelant de traiter le cas
 * (roster vide), plutôt que de tirer une rareté fantôme.
 */
export function normalizeWeights(
  rates: RarityWeights,
  available: Iterable<CardRarity>,
): RarityWeights {
  const pool = new Set(available);
  const kept: RarityWeights = {};
  let total = 0;

  for (const rarity of CARD_RARITIES) {
    if (!pool.has(rarity)) continue;
    const weight = rates[rarity];
    if (weight == null || !Number.isFinite(weight) || weight <= 0) continue;
    kept[rarity] = weight;
    total += weight;
  }

  if (total <= 0) return {};

  const normalized: RarityWeights = {};
  for (const [rarity, weight] of Object.entries(kept)) {
    normalized[rarity as CardRarity] = (weight! / total) * 100;
  }
  return normalized;
}

/** Somme des poids d'une table (sert aux tests et à `pickRarity`). */
export function totalWeight(rates: RarityWeights): number {
  return Object.values(rates).reduce<number>(
    (sum, weight) => sum + (Number.isFinite(weight) && weight! > 0 ? weight! : 0),
    0,
  );
}
