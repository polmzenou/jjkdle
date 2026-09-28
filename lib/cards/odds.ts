import type { BoosterDefinition } from "./boosters";
import { CARD_RARITIES, cardRarityStyle, type CardRarity } from "./rarity";
import { RATE_TABLES, normalizeWeights } from "./rates";

/**
 * TAUX DE DROP affichés en boutique. Module PUR, dérivé des MÊMES tables que le
 * moteur de tirage (`rollBooster`) : ce qui est affiché est ce qui est tiré.
 *
 * Les taux dépendent de l'univers : `normalizeWeights` redistribue la masse
 * d'une rareté absente du roster sur les autres. Il faut donc passer les raretés
 * réellement pourvues, sinon on afficherait des chances de tirer une rareté
 * introuvable.
 */

export interface RarityOdds {
  rarity: CardRarity;
  /** Chance (%) qu'une carte d'un slot LIBRE soit de cette rareté. */
  perCard: number;
  /** Chance (%) que le booster contienne AU MOINS une carte de cette rareté. */
  atLeastOne: number;
}

export interface BoosterOdds {
  odds: RarityOdds[];
  /** Libellé de la garantie (« 1 carte EPIC+ garantie »), `null` si aucune. */
  guarantee: string | null;
}

/**
 * Taux d'un booster pour un univers dont le roster pourvoit `available`.
 *
 * `atLeastOne = 1 − Π(1 − p_slot)` sur tous les slots (libres puis garantis).
 * Approximation assumée : le moteur tire SANS remise (un même personnage ne
 * sort pas deux fois d'un booster), ce qui ne change la rareté d'un slot que
 * lorsqu'un tier est épuisé — négligeable à l'échelle d'un booster de 3-4
 * cartes, sauf sur un roster minuscule.
 */
export function boosterOdds(
  def: BoosterDefinition,
  available: Iterable<CardRarity>,
): BoosterOdds {
  const pool = [...new Set(available)];
  const rates = RATE_TABLES[def.table];
  const guaranteed = def.guaranteed ?? [];
  const freeSlots = Math.max(0, def.cardCount - guaranteed.length);

  const free = normalizeWeights(rates, pool);
  // Même repli que `rollBooster` : une garantie impossible à honorer (aucun
  // perso de ces raretés dans l'univers) retombe sur la table normale.
  const slots = [
    ...Array.from({ length: freeSlots }, () => free),
    ...guaranteed.map((slot) => {
      const restricted = normalizeWeights(
        slot.rates ?? rates,
        pool.filter((r) => slot.pool.includes(r)),
      );
      return Object.keys(restricted).length > 0 ? restricted : free;
    }),
  ];

  const odds: RarityOdds[] = [];
  for (const rarity of CARD_RARITIES) {
    if (!pool.includes(rarity)) continue;
    const missAll = slots.reduce(
      (acc, weights) => acc * (1 - (weights[rarity] ?? 0) / 100),
      1,
    );
    odds.push({
      rarity,
      perCard: free[rarity] ?? 0,
      atLeastOne: (1 - missAll) * 100,
    });
  }

  return { odds, guarantee: guaranteeLabel(def, pool) };
}

/** « 1 carte EPIC+ garantie » à partir de la plus basse rareté du pool garanti. */
function guaranteeLabel(
  def: BoosterDefinition,
  available: CardRarity[],
): string | null {
  const slot = def.guaranteed?.[0];
  if (!slot) return null;
  const floor = CARD_RARITIES.find(
    (r) => slot.pool.includes(r) && available.includes(r),
  );
  if (!floor) return null;
  const count = def.guaranteed!.length;
  return `${count} carte${count > 1 ? "s" : ""} ${cardRarityStyle(floor).label}+ garantie${count > 1 ? "s" : ""}`;
}

/** Pourcentage lisible : « 46 % », « 3,5 % », « 0,2 % », « < 0,1 % ». */
export function formatOdds(pct: number): string {
  if (pct <= 0) return "0 %";
  if (pct >= 99.95) return "100 %";
  if (pct < 0.1) return "< 0,1 %";
  const digits = pct >= 10 ? 0 : 1;
  return `${pct.toLocaleString("fr-FR", { maximumFractionDigits: digits })} %`;
}
