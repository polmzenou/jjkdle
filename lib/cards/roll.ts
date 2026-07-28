import {
  BOOSTER_DROP_RATES,
  BOOSTER_KINDS,
  type BoosterDefinition,
  type BoosterKind,
} from "./boosters";
import { rarityRank, type CardRarity } from "./rarity";
import {
  RATE_TABLES,
  normalizeWeights,
  type RarityWeights,
} from "./rates";

/**
 * Moteur de tirage des boosters. Module PUR : aucune I/O, `rng` injectable
 * (`Math.random` par défaut) pour être testable de façon déterministe.
 */

/** Générateur pseudo-aléatoire : renvoie un flottant dans [0, 1[. */
export type Rng = () => number;

/** Personnages tirables, groupés par rareté (`Character.id`). */
export type CardPool = Partial<Record<CardRarity, string[]>>;

/**
 * Tirage pondéré générique. Les poids n'ont pas besoin de sommer à 1 ni à 100 :
 * seul leur rapport compte. Renvoie `null` si aucun poids exploitable.
 */
function weightedPick<T extends string>(
  weights: Partial<Record<T, number>>,
  rng: Rng,
): T | null {
  const entries = Object.entries(weights).filter(
    ([, weight]) => Number.isFinite(weight) && (weight as number) > 0,
  ) as [T, number][];
  if (entries.length === 0) return null;

  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  // `rng()` est dans [0, 1[ → `roll` est dans [0, total[, jamais égal au total.
  let roll = rng() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll < 0) return value;
  }
  // Filet de sécurité contre les arrondis flottants : dernière entrée valide.
  return entries[entries.length - 1]![0];
}

/** Tire une rareté selon des poids déjà restreints/normalisés. */
export function pickRarity(
  weights: RarityWeights,
  rng: Rng = Math.random,
): CardRarity | null {
  return weightedPick(weights, rng);
}

/** Tire la rareté du booster qui tombe en fin de partie. */
export function rollBoosterKind(rng: Rng = Math.random): BoosterKind {
  return weightedPick(BOOSTER_DROP_RATES, rng) ?? BOOSTER_KINDS[0]!;
}

/** Copie du pool, pour retirer les personnages déjà tirés sans muter l'entrée. */
function clonePool(pool: CardPool): Map<CardRarity, string[]> {
  const out = new Map<CardRarity, string[]>();
  for (const [rarity, ids] of Object.entries(pool)) {
    if (Array.isArray(ids) && ids.length > 0) {
      out.set(rarity as CardRarity, [...ids]);
    }
  }
  return out;
}

/**
 * Tire UNE carte : d'abord la rareté (poids restreints aux raretés encore
 * pourvues), puis un personnage au hasard, uniformément, dans cette rareté.
 *
 * Le personnage tiré est RETIRÉ du pool de travail : un même booster ne peut
 * pas contenir deux fois le même personnage. Les doublons vis-à-vis de la
 * collection du joueur, eux, sont normaux — c'est la couche base qui les
 * convertit en coins.
 */
function drawOne(
  remaining: Map<CardRarity, string[]>,
  rates: RarityWeights,
  allowed: CardRarity[] | null,
  rng: Rng,
): string | null {
  const available = [...remaining.keys()].filter(
    (rarity) => !allowed || allowed.includes(rarity),
  );
  const weights = normalizeWeights(rates, available);
  const rarity = pickRarity(weights, rng);
  if (!rarity) return null;

  const ids = remaining.get(rarity)!;
  const index = Math.min(ids.length - 1, Math.floor(rng() * ids.length));
  const [picked] = ids.splice(index, 1);
  if (ids.length === 0) remaining.delete(rarity);
  return picked ?? null;
}

/**
 * Ouvre un booster : renvoie les `Character.id` tirés, triés par rareté
 * CROISSANTE.
 *
 * Ce tri final est un choix d'UX, pas de hasard : le défilement carte par carte
 * monte ainsi toujours en intensité et se termine sur la meilleure carte du
 * booster, au lieu de retomber à plat après un coup de chance en première
 * position.
 *
 * Les slots garantis sont tirés APRÈS les slots libres pour que la garantie ne
 * puisse pas être consommée par un slot libre déjà chanceux. Si le pool ne
 * contient aucun personnage de la rareté garantie (roster incomplet), le slot
 * retombe sur la table normale plutôt que de rendre un booster amputé.
 */
export function rollBooster(
  def: BoosterDefinition,
  pool: CardPool,
  rng: Rng = Math.random,
): string[] {
  const remaining = clonePool(pool);
  const rates = RATE_TABLES[def.table];
  const guaranteed = def.guaranteed ?? [];
  const freeSlots = Math.max(0, def.cardCount - guaranteed.length);

  const drawn: string[] = [];

  for (let i = 0; i < freeSlots; i += 1) {
    const id = drawOne(remaining, rates, null, rng);
    if (!id) break; // pool épuisé : booster plus court plutôt qu'une erreur
    drawn.push(id);
  }

  for (const slot of guaranteed) {
    const id =
      drawOne(remaining, slot.rates ?? rates, slot.pool, rng) ??
      drawOne(remaining, rates, null, rng);
    if (!id) break;
    drawn.push(id);
  }

  return drawn;
}

/**
 * Trie des cartes par rareté croissante (ordre de révélation). Extrait de
 * `rollBooster` car le tri s'applique aux cartes RÉSOLUES (avec leur rareté),
 * une fois le roster joint aux ids tirés.
 */
export function sortByRarityAsc<T extends { rarity: CardRarity }>(
  cards: T[],
): T[] {
  return [...cards].sort((a, b) => rarityRank(a.rarity) - rarityRank(b.rarity));
}
