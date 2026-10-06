import { CARD_RARITIES, rarityRank, type CardRarity } from "./rarity";
import type { CardPool } from "./roll";

/**
 * FUSION de cartes : 3 doublons d'une même rareté → 1 carte aléatoire de la
 * rareté juste au-dessus, dans le même univers.
 *
 * Module PUR (aucun accès base) : la validation est partagée entre le serveur
 * (`fuseCards`, qui la refait toujours) et le client (activation du bouton).
 *
 * Seuls des DOUBLONS sont consommés : pour chaque personnage, le nombre de
 * fois où il est choisi doit rester ≤ `count - 1`. On peut donc fusionner
 * 3 fois le même personnage s'il en a au moins 4 exemplaires.
 */

export const FUSION_SIZE = 3;

/** Rareté obtenue en fusionnant `rarity`, ou `null` au sommet de l'échelle. */
export function nextRarity(rarity: CardRarity): CardRarity | null {
  const rank = rarityRank(rarity);
  if (rank < 0) return null;
  return CARD_RARITIES[rank + 1] ?? null;
}

export type FusionCheck =
  | {
      ok: true;
      rarity: CardRarity;
      target: CardRarity;
      /** Exemplaires à retirer par personnage. */
      needed: Map<string, number>;
    }
  | { ok: false; error: string };

/**
 * Valide une sélection de fusion.
 *
 * @param picks       ids de personnages choisis (répétitions permises)
 * @param counts      exemplaires possédés par personnage
 * @param rarityById  rareté de chaque personnage de l'univers
 * @param pool        roster groupé par rareté (la rareté cible doit être pourvue)
 */
export function validateFusion(
  picks: readonly string[],
  counts: ReadonlyMap<string, number>,
  rarityById: ReadonlyMap<string, CardRarity>,
  pool: CardPool,
): FusionCheck {
  if (picks.length !== FUSION_SIZE) {
    return { ok: false, error: `Il faut exactement ${FUSION_SIZE} cartes.` };
  }

  const rarities = new Set<CardRarity>();
  const needed = new Map<string, number>();
  for (const id of picks) {
    const rarity = rarityById.get(id);
    if (!rarity) return { ok: false, error: "Carte inconnue." };
    rarities.add(rarity);
    needed.set(id, (needed.get(id) ?? 0) + 1);
  }

  if (rarities.size !== 1) {
    return { ok: false, error: "Les 3 cartes doivent être de la même rareté." };
  }
  const rarity = [...rarities][0]!;

  for (const [id, n] of needed) {
    if (n > (counts.get(id) ?? 0) - 1) {
      return {
        ok: false,
        error: "Seuls les doublons peuvent être fusionnés (garde au moins 1 exemplaire).",
      };
    }
  }

  const target = nextRarity(rarity);
  if (!target) {
    return { ok: false, error: "Impossible de fusionner la rareté la plus haute." };
  }
  if (!pool[target]?.length) {
    return { ok: false, error: "Aucune carte de la rareté supérieure dans cet univers." };
  }

  return { ok: true, rarity, target, needed };
}

/** Tirage uniforme d'un personnage de la rareté cible. */
export function rollFusion(
  pool: CardPool,
  target: CardRarity,
  rng: () => number = Math.random,
): string | null {
  const candidates = pool[target];
  if (!candidates?.length) return null;
  return candidates[Math.floor(rng() * candidates.length)] ?? null;
}
