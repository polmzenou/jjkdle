import { cardRarityStyle, type CardRarity } from "./rarity";

/**
 * Deck équipé : jusqu'à 3 cartes, stockées par univers dans
 * `UserUniverseProfile.deckCharacterIds`. Chaque carte applique un bonus d'XP
 * et/ou de coins selon sa rareté (barème dans `lib/cards/rarity.ts`).
 *
 * Module PUR : le calcul est réutilisé tel quel côté serveur (`awardExp`) et
 * côté client (aperçu du bonus dans l'onglet Deck), sans duplication de règle.
 */

/** Nombre de slots du deck. */
export const DECK_SIZE = 3;

export interface DeckMultipliers {
  /** Multiplicateur d'XP (1 = aucun bonus). */
  xp: number;
  /** Multiplicateur de coins, appliqué APRÈS l'XP (cf. `awardExp`). */
  coin: number;
  /** Bonus cumulés en %, pour l'affichage (`+37 % XP · +30 % coins`). */
  xpPct: number;
  coinPct: number;
}

export const NO_DECK_BONUS: DeckMultipliers = {
  xp: 1,
  coin: 1,
  xpPct: 0,
  coinPct: 0,
};

/**
 * Multiplicateurs apportés par un deck. Les bonus des cartes s'ADDITIONNENT
 * (3 × EXOTIC = +75 %), ils ne se multiplient pas : la progression reste
 * lisible pour le joueur et bornée pour l'économie.
 *
 * Les entrées au-delà de `DECK_SIZE` sont ignorées — le stockage est validé à
 * l'écriture, mais on ne fait pas confiance à une donnée relue.
 */
export function deckMultipliers(rarities: CardRarity[]): DeckMultipliers {
  let xpPct = 0;
  let coinPct = 0;

  for (const rarity of rarities.slice(0, DECK_SIZE)) {
    const style = cardRarityStyle(rarity);
    xpPct += style.deckXpPct;
    coinPct += style.deckCoinPct;
  }

  return {
    xp: 1 + xpPct / 100,
    coin: 1 + coinPct / 100,
    xpPct,
    coinPct,
  };
}

/**
 * Nettoie une liste de `Character.id` relue en base : borne à `DECK_SIZE`,
 * déduplique, et ne garde que les cartes réellement possédées dans l'univers.
 * Utilisé à la LECTURE (une carte vendue ou un perso supprimé laisse sinon un
 * id fantôme) comme à l'ÉCRITURE.
 */
export function sanitizeDeck(
  ids: readonly string[],
  ownedInUniverse: ReadonlySet<string>,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const id of ids) {
    if (typeof id !== "string" || !id) continue;
    if (seen.has(id) || !ownedInUniverse.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= DECK_SIZE) break;
  }

  return out;
}
