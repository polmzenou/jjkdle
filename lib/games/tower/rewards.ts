import { mulberry32 } from "@/lib/games/battle/rng";
import {
  ITEM_RARITY_STYLES,
  MIN_ITEMS,
  type ItemRarity,
  type TowerItem,
} from "./items";
import type { NodeKind } from "./types";

/**
 * Récompenses de fin d'étage et étal du marchand — module PUR et DÉTERMINISTE.
 *
 * Tout se dérive de `(seed, étage)` : deux joueurs sur la même tour du jour
 * voient les mêmes propositions, et le serveur peut recalculer une offre sans
 * rien avoir stocké. C'est la même règle que la génération des étages.
 */

/** Fragments proposés en alternative à un objet, par type d'étage. */
const FRAGMENT_REWARD: Record<string, number> = {
  combat: 25,
  elite: 45,
  boss: 80,
};

/** Part des PV max rendus par l'option « soin ». */
export const HEAL_REWARD_PCT = 35;

/** Raretés autorisées selon le type d'étage. Les épiques se méritent. */
const ALLOWED_RARITIES: Record<string, ItemRarity[]> = {
  combat: ["COMMON", "RARE"],
  elite: ["RARE", "EPIC"],
  boss: ["RARE", "EPIC"],
};

/** Une option présentée au joueur après un étage gagné. */
export type Reward =
  | { kind: "item"; item: TowerItem }
  | { kind: "fragments"; amount: number }
  | { kind: "heal"; pct: number };

/**
 * Les trois options d'un étage gagné : un objet, des fragments, un soin.
 *
 * Trois natures différentes plutôt que trois objets : le choix intéressant
 * n'est pas « lequel de ces trois objets » mais « ai-je plus besoin de
 * puissance, de monnaie ou de survie ». Les PV ne se régénérant jamais tout
 * seuls, le soin est un vrai concurrent.
 *
 * L'option objet disparaît si le catalogue est trop maigre (`MIN_ITEMS`) ou si
 * le joueur a déjà tout ramassé : on sert alors des fragments plutôt qu'un
 * doublon inerte.
 */
export function rollRewards(
  seed: number,
  floor: number,
  kind: NodeKind,
  catalog: readonly TowerItem[],
  ownedIds: readonly string[],
): Reward[] {
  const fragments = FRAGMENT_REWARD[kind] ?? FRAGMENT_REWARD.combat;
  const rewards: Reward[] = [
    { kind: "fragments", amount: fragments },
    { kind: "heal", pct: HEAL_REWARD_PCT },
  ];

  const item = pickItem(seed, floor, kind, catalog, ownedIds);
  if (item) rewards.unshift({ kind: "item", item });
  else rewards.unshift({ kind: "fragments", amount: Math.round(fragments * 1.5) });

  return rewards;
}

/** Tire un objet non possédé, pondéré par rareté, dans les raretés autorisées. */
function pickItem(
  seed: number,
  floor: number,
  kind: NodeKind,
  catalog: readonly TowerItem[],
  ownedIds: readonly string[],
): TowerItem | null {
  if (catalog.length < MIN_ITEMS) return null;

  const allowed = ALLOWED_RARITIES[kind] ?? ALLOWED_RARITIES.combat;
  const owned = new Set(ownedIds);
  const pool = catalog.filter(
    (i) => i.enabled && !owned.has(i.id) && allowed.includes(i.rarity),
  );
  if (pool.length === 0) return null;

  return weightedPick(rngFor(seed, floor, "reward"), pool);
}

// ──────────────────────────────────────────────────────────────────────────
// Marchand
// ──────────────────────────────────────────────────────────────────────────

/** Prix d'un objet chez le marchand, par rareté. */
export const ITEM_PRICES: Record<ItemRarity, number> = {
  COMMON: 40,
  RARE: 75,
  EPIC: 130,
};

/** Prix et effet du soin vendu par le marchand. */
export const MERCHANT_HEAL_PRICE = 50;
export const MERCHANT_HEAL_PCT = 40;

export interface ShopOffer {
  item: TowerItem;
  price: number;
}

/**
 * Étal du marchand : trois objets non possédés, toutes raretés confondues.
 *
 * C'est le seul endroit où une épique s'achète sans passer par une élite ou un
 * boss — d'où son prix, calibré pour représenter le gain de deux étages
 * entiers. Les fragments meurent avec la run : les garder ne sert à rien, les
 * dépenser au bon moment est tout l'intérêt du nœud.
 */
export function rollShop(
  seed: number,
  floor: number,
  catalog: readonly TowerItem[],
  ownedIds: readonly string[],
): ShopOffer[] {
  const owned = new Set(ownedIds);
  const pool = catalog.filter((i) => i.enabled && !owned.has(i.id));
  const rand = rngFor(seed, floor, "shop");

  const offers: ShopOffer[] = [];
  const taken = new Set<string>();

  for (let i = 0; i < 3; i += 1) {
    const available = pool.filter((p) => !taken.has(p.id));
    if (available.length === 0) break;
    const item = weightedPick(rand, available);
    taken.add(item.id);
    offers.push({ item, price: ITEM_PRICES[item.rarity] });
  }

  return offers;
}

/**
 * Objet offert par un ÉVÈNEMENT, d'une rareté imposée ou quelconque.
 *
 * `null` quand il ne reste rien à donner : l'appelant convertit alors la
 * récompense en fragments plutôt que de ne rien servir du tout.
 */
export function pickEventItem(
  seed: number,
  floor: number,
  rarity: ItemRarity | "any",
  catalog: readonly TowerItem[],
  ownedIds: readonly string[],
): TowerItem | null {
  const owned = new Set(ownedIds);
  const pool = catalog.filter(
    (i) => i.enabled && !owned.has(i.id) && (rarity === "any" || i.rarity === rarity),
  );
  if (pool.length === 0) return null;
  return weightedPick(rngFor(seed, floor, "event-item"), pool);
}

// ──────────────────────────────────────────────────────────────────────────
// Outils
// ──────────────────────────────────────────────────────────────────────────

/**
 * Générateur propre à un (étage, usage).
 *
 * Dériver la graine plutôt que de faire avancer un curseur partagé : une offre
 * doit pouvoir être recalculée à tout moment sans rejouer toute la run, y
 * compris après un rechargement de page.
 */
function rngFor(seed: number, floor: number, salt: string): () => number {
  let h = seed >>> 0;
  h = (h ^ (floor * 0x9e3779b1)) >>> 0;
  for (let i = 0; i < salt.length; i += 1) {
    h = (Math.imul(h ^ salt.charCodeAt(i), 0x01000193) >>> 0) as number;
  }
  return mulberry32(h);
}

/** Tirage pondéré par rareté, stable pour une graine donnée. */
function weightedPick(rand: () => number, pool: readonly TowerItem[]): TowerItem {
  // Tri par id : deux appels sur le même ensemble doivent parcourir les
  // candidats dans le même ordre, sinon le tirage n'est pas reproductible.
  const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id));
  const total = sorted.reduce(
    (sum, i) => sum + (ITEM_RARITY_STYLES[i.rarity]?.weight ?? 1),
    0,
  );

  let ticket = rand() * total;
  for (const item of sorted) {
    ticket -= ITEM_RARITY_STYLES[item.rarity]?.weight ?? 1;
    if (ticket <= 0) return item;
  }
  return sorted[sorted.length - 1];
}
