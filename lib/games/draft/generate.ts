import type { DraftTier } from "./types";

/**
 * Barème du roster draft GÉNÉRÉ (bouton « Tout importer ») — module PUR.
 *
 * Découpe le top d'une catégorie en tiers puis attribue coût et `statValue`.
 * Séparé de `lib/admin/draft-import.ts` (qui tire Prisma) pour rester testable
 * sans base : c'est ici que vit l'équilibrage, donc c'est ici qu'on le vérifie.
 */

/** Taille visée d'un pool de catégorie : 2 S + 3 A + 5 B + 5 C. */
export const DRAFT_POOL_SIZE = 15;

/** Tiers du plus fort au plus faible — ordre de remplissage du pool. */
export const TIER_ORDER: DraftTier[] = ["S", "A", "B", "C"];

/** Composition cible d'un pool complet. */
export const TIER_SHARE: Record<DraftTier, number> = { S: 2, A: 3, B: 5, C: 5 };

/**
 * Bandes de valeurs par tier, reprises TELLES QUELLES du roster maître JJK
 * (`lib/games/draft/roster.ts`), qui reste la référence d'équilibrage : c'est
 * sur elle que les seuils des boss ont été calibrés. Les changer déplace toute
 * la courbe de difficulté des six univers d'un coup.
 */
export const TIER_BANDS: Record<
  DraftTier,
  { stat: readonly [number, number]; cost: readonly [number, number] }
> = {
  S: { stat: [22, 25], cost: [22, 28] },
  A: { stat: [16, 19], cost: [14, 18] },
  B: { stat: [11, 14], cost: [8, 12] },
  C: { stat: [6, 9], cost: [3, 6] },
};

/**
 * Répartit `count` personnages sur les quatre tiers.
 *
 * Au-delà de `DRAFT_POOL_SIZE` on tronque : un pool plus profond ne changerait
 * rien au plateau (5 cartes tirées par ligne) mais gonflerait la base.
 *
 * En dessous, deux garde-fous priment sur le prorata :
 *  1. un SOCLE d'un personnage par tier tant qu'il reste des places. Sans une
 *     carte de tier C, la ligne n'a plus rien de bon marché et le
 *     forward-checking de `canSelect` peut la rendre entièrement injouable ;
 *  2. les parts cibles font office de PLAFOND — jamais plus de 2 S.
 */
export function tierCounts(count: number): Record<DraftTier, number> {
  const out: Record<DraftTier, number> = { S: 0, A: 0, B: 0, C: 0 };
  const total = Math.min(Math.max(Math.trunc(count), 0), DRAFT_POOL_SIZE);
  if (total === 0) return out;

  // 1. Socle : un par tier, du plus fort au plus faible.
  let left = total;
  for (const tier of TIER_ORDER) {
    if (left === 0) break;
    out[tier] = 1;
    left -= 1;
  }
  if (left === 0) return out;

  // 2. Le reste au prorata des parts restantes, méthode du plus fort reste.
  const weights = TIER_ORDER.map((t) => TIER_SHARE[t] - 1);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const exact = TIER_ORDER.map((t, i) => (left * weights[i]) / weightSum);
  const floors = exact.map((v) => Math.floor(v));

  TIER_ORDER.forEach((tier, i) => {
    out[tier] += floors[i];
  });
  let remainder = left - floors.reduce((a, b) => a + b, 0);

  // Égalités départagées en faveur des tiers BAS (C avant B avant A avant S) :
  // une carte de plus en bas élargit les équipes finançables, une carte de plus
  // en haut ne fait que rendre la ligne plus chère.
  const byRemainder = TIER_ORDER.map((tier, i) => ({
    tier,
    frac: exact[i] - floors[i],
    rank: i,
  })).sort((a, b) => b.frac - a.frac || b.rank - a.rank);

  for (const entry of byRemainder) {
    if (remainder === 0) break;
    if (out[entry.tier] >= TIER_SHARE[entry.tier]) continue;
    out[entry.tier] += 1;
    remainder -= 1;
  }

  // Plafonds atteints partout alors qu'il reste des places : on les rend au
  // tier C, le seul dont un surplus ne déséquilibre rien.
  if (remainder > 0) out.C += remainder;

  return out;
}

/** Coût et `statValue` d'un personnage selon son tier et son rang DANS ce tier. */
export function statsFor(
  tier: DraftTier,
  indexInTier: number,
  tierSize: number,
): { statValue: number; cost: number } {
  const band = TIER_BANDS[tier];
  const span = Math.max(1, tierSize - 1);
  const ratio = Math.min(Math.max(indexInTier, 0), span) / span;
  // Le mieux noté du tier prend le HAUT de la bande, le dernier le bas.
  const at = ([lo, hi]: readonly [number, number]) =>
    hi - Math.round((hi - lo) * ratio);
  return { statValue: at(band.stat), cost: at(band.cost) };
}

/** Une place du pool généré, dans l'ordre des notes (rang 0 = meilleure note). */
export interface GeneratedSlot {
  tier: DraftTier;
  statValue: number;
  cost: number;
}

/**
 * Barème complet d'un pool de `count` personnages classés par note
 * DÉCROISSANTE : le i-ème élément décrit le i-ème mieux noté.
 */
export function generatePool(count: number): GeneratedSlot[] {
  const counts = tierCounts(count);
  const slots: GeneratedSlot[] = [];
  for (const tier of TIER_ORDER) {
    const size = counts[tier];
    for (let i = 0; i < size; i += 1) {
      slots.push({ tier, ...statsFor(tier, i, size) });
    }
  }
  return slots;
}
