import type { DraftCharacter, DraftPick, DraftTier } from "./types";
import { personOf } from "./types";
import { DRAFT_CATEGORIES } from "./categories";
import { DRAFT_ROSTER } from "./roster";
import { shuffle, type Rng } from "@/lib/draw/draw";

/**
 * Tirage du draft — CLOISONNÉ PAR CATÉGORIE : chaque catégorie ne propose que
 * des persos dont c'est la catégorie d'excellence (`excellenceCategory`). On en
 * tire `DRAW_PER_CATEGORY` (5).
 *
 * DÉDOUBLONNAGE PAR PERSONNE : le roster importé crée une carte par couple
 * personnage × catégorie, si bien qu'un même personnage peut être éligible à
 * plusieurs lignes sous des `id` différents. Les lignes sont donc tirées EN
 * SÉQUENCE, chacune excluant les personnes déjà posées sur le plateau
 * (`personOf`) — le joueur ne voit jamais deux fois le même visage, et ne peut
 * donc pas le drafter deux fois. Il faut 8 × 5 = 40 personnes distinctes, ce
 * que tous les rosters fournissent.
 *
 * QUOTAS DE TIER (par ligne) : 1 S, 1 A, 1 B, 2 C, appliqués AU MIEUX — si la
 * catégorie n'a pas assez de membres d'un tier une fois les exclusions faites,
 * on prend ce qui existe et on complète au hasard.
 *
 * Affordabilité : la carte la MOINS chère de chaque catégorie est proposée dès
 * que le quota laisse une place libre → une équipe légale sous budget reste
 * atteignable. RNG injectable.
 */

export const DRAW_PER_CATEGORY = 5;

/** Tiers traités dans l'ordre lors de l'application des quotas. */
const TIER_ORDER: DraftTier[] = ["S", "A", "B", "C"];

/** Nombre minimum de cartes par tier dans une ligne. */
type TierQuota = Partial<Record<DraftTier, number>>;

/** Quota par défaut : 1 S, 1 A, 1 B, 2 C (= DRAW_PER_CATEGORY). */
const DEFAULT_TIER_QUOTA: TierQuota = { S: 1, A: 1, B: 1, C: 2 };

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
  // Personnes déjà posées sur le plateau, toutes lignes confondues.
  const placed = new Set<string>();

  // Les catégories les moins fournies d'abord : une ligne large se remplira
  // encore après coup, l'inverse n'est pas vrai. Sans cet ordre, une catégorie
  // étroite pourrait se retrouver vidée par les exclusions des précédentes.
  const eligible = DRAFT_CATEGORIES.map((cat) => ({
    cat,
    members: roster.filter((c) => c.excellenceCategory === cat.id),
  })).sort((a, b) => a.members.length - b.members.length);

  for (const { cat, members } of eligible) {
    const available = members.filter((c) => !placed.has(personOf(c)));
    // Exclusions trop agressives (roster minuscule) : on rouvre la ligne plutôt
    // que de la rendre vide — un doublon vaut mieux qu'une catégorie sans carte.
    const pool = available.length > 0 ? available : members;
    const row = drawForCategory(pool, DEFAULT_TIER_QUOTA, rng);
    for (const c of row) placed.add(personOf(c));
    draw[cat.id] = row;
  }

  return draw;
}
