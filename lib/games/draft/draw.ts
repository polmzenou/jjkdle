import type { DraftCharacter, DraftPick, DraftTier } from "./types";
import { DRAFT_CATEGORIES } from "./categories";
import { DRAFT_ROSTER } from "./roster";
import { shuffle, type Rng } from "@/lib/draw/draw";

/**
 * Tirage du draft — CLOISONNÉ PAR CATÉGORIE : chaque catégorie ne propose que
 * des persos dont c'est la catégorie d'excellence (`excellenceCategory`). On en
 * tire `DRAW_PER_CATEGORY` (5 sur les 6 du roster maître).
 *
 * Comme chaque perso n'appartient qu'à une seule catégorie, les lignes sont
 * disjointes (jamais de doublon sur le plateau, sans logique « sans remise »).
 *
 * QUOTAS DE TIER (par partie) : chaque ligne garantit une composition minimale
 * par tier, choisie aléatoirement parmi les membres de la catégorie :
 *   - défaut : 1 S, 1 A, 1 B, 2 C ;
 *   - black-flash : 1 S minimum, le reste au hasard (roster trop juste pour le
 *     quota complet) ;
 *   - domain-expansion (Extension du territoire) : 1 S, 2 A, 2 B.
 * Les quotas sont appliqués au mieux : si une catégorie n'a pas assez de membres
 * d'un tier, on prend ce qui existe et on complète au hasard.
 *
 * Affordabilité : la carte la MOINS chère de chaque catégorie est proposée dès
 * que le quota laisse une place libre → une équipe légale sous budget 100 reste
 * atteignable. RNG injectable.
 */

export const DRAW_PER_CATEGORY = 5;

/** Tiers traités dans l'ordre lors de l'application des quotas. */
const TIER_ORDER: DraftTier[] = ["S", "A", "B", "C"];

/** Nombre minimum de cartes par tier dans une ligne. */
type TierQuota = Partial<Record<DraftTier, number>>;

/** Quota par défaut : 1 S, 1 A, 1 B, 2 C (= DRAW_PER_CATEGORY). */
const DEFAULT_TIER_QUOTA: TierQuota = { S: 1, A: 1, B: 1, C: 2 };

/** Quotas spécifiques (sinon `DEFAULT_TIER_QUOTA`). */
const TIER_QUOTA_BY_CATEGORY: Partial<Record<string, TierQuota>> = {
  // Roster trop juste pour le quota complet : on garantit juste 1 S.
  "black-flash": { S: 1 },
  // Extension du territoire : 1 S, 2 A, 2 B.
  "domain-expansion": { S: 1, A: 2, B: 2 },
};

/**
 * Tire une ligne de catégorie en respectant au mieux le quota de tier, puis en
 * garantissant la carte la moins chère, puis en complétant au hasard.
 */
function drawForCategory(
  members: DraftCharacter[],
  quota: TierQuota,
  rng: Rng,
): DraftCharacter[] {
  // Catégorie peu fournie : on montre tout ce qu'il y a.
  if (members.length <= DRAW_PER_CATEGORY) {
    return shuffle(members, rng);
  }

  const chosen: DraftCharacter[] = [];
  const used = new Set<string>();
  const take = (c: DraftCharacter) => {
    chosen.push(c);
    used.add(c.id);
  };

  // 1. Quotas par tier (best-effort : plafonnés au nombre réellement disponible).
  for (const tier of TIER_ORDER) {
    const need = quota[tier] ?? 0;
    if (need <= 0) continue;
    const pool = shuffle(
      members.filter((c) => c.tier === tier && !used.has(c.id)),
      rng,
    );
    for (const c of pool.slice(0, need)) take(c);
  }

  // Quota mal réglé (somme > taille de ligne) : on tronque au hasard.
  if (chosen.length > DRAW_PER_CATEGORY) {
    return shuffle(chosen, rng).slice(0, DRAW_PER_CATEGORY);
  }

  // 2. Affordabilité : garantit la carte la moins chère si une place reste libre.
  if (chosen.length < DRAW_PER_CATEGORY) {
    const cheapest = members.reduce((a, b) => (b.cost < a.cost ? b : a));
    if (!used.has(cheapest.id)) take(cheapest);
  }

  // 3. Complète au hasard jusqu'à DRAW_PER_CATEGORY.
  if (chosen.length < DRAW_PER_CATEGORY) {
    const rest = shuffle(
      members.filter((c) => !used.has(c.id)),
      rng,
    );
    for (const c of rest.slice(0, DRAW_PER_CATEGORY - chosen.length)) take(c);
  }

  return shuffle(chosen, rng);
}

export function pickDraw(
  rng: Rng = Math.random,
  roster: DraftCharacter[] = DRAFT_ROSTER,
): DraftPick {
  const draw = {} as DraftPick;

  for (const cat of DRAFT_CATEGORIES) {
    const members = roster.filter((c) => c.excellenceCategory === cat.id);
    const quota = TIER_QUOTA_BY_CATEGORY[cat.id] ?? DEFAULT_TIER_QUOTA;
    draw[cat.id] = drawForCategory(members, quota, rng);
  }

  return draw;
}
