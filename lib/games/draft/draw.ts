import type { DraftCharacter, DraftPick, DraftTier } from "./types";
import { personOf } from "./types";
import type { DraftCategory } from "./categories";
import { DRAFT_ROSTER } from "./roster";
import { shuffle, type Rng } from "@/lib/draw/draw";

/**
 * Tirage du draft — CLOISONNÉ PAR CATÉGORIE : chaque catégorie ne propose que
 * des persos dont c'est la catégorie d'excellence (`excellenceCategory`). On en
 * tire `DRAW_PER_CATEGORY` (5).
 *
 * ── Le même visage ne doit pas revenir ────────────────────────────────────
 * Le roster importé crée une carte par couple personnage × catégorie : un même
 * personnage est donc éligible à plusieurs lignes sous des `id` différents, et
 * parfois deux fois à la même. Le tirage raisonne donc par PERSONNE
 * (`personOf`) et non par carte, avec un ordre de préférence :
 *   1. un visage encore absent du plateau ;
 *   2. sinon un visage déjà vu ailleurs, mais pas dans cette ligne ;
 *   3. en tout dernier recours, une seconde carte du même personnage.
 * Le cas 3 n'arrive que si la catégorie compte moins de 5 personnes — mieux
 * vaut alors un doublon qu'une ligne à moitié vide, qui prive le joueur de
 * choix et casse la lecture du plateau.
 *
 * QUOTAS DE TIER (par ligne) : 1 S, 1 A, 1 B, 2 C, appliqués AU MIEUX — si la
 * catégorie n'a pas assez de membres d'un tier, on prend ce qui existe et on
 * complète au hasard.
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
 * Tire une ligne de catégorie : quotas de tier, puis carte la moins chère, puis
 * complément au hasard — chaque étape servant d'abord les visages absents du
 * plateau (`placed`) avant de piocher dans le reste de la catégorie.
 */
function drawForCategory(
  members: DraftCharacter[],
  quota: TierQuota,
  rng: Rng,
  placed: Set<string>,
): DraftCharacter[] {
  const chosen: DraftCharacter[] = [];
  const usedIds = new Set<string>();
  const usedPersons = new Set<string>();

  const take = (c: DraftCharacter) => {
    chosen.push(c);
    usedIds.add(c.id);
    usedPersons.add(personOf(c));
  };
  const free = (c: DraftCharacter) =>
    !usedIds.has(c.id) && !usedPersons.has(personOf(c));

  /** Remplit la ligne depuis un vivier : quotas, carte la moins chère, hasard. */
  const fill = (pool: DraftCharacter[]) => {
    // 1. Quotas par tier (best-effort : plafonnés au nombre réellement dispo).
    for (const tier of TIER_ORDER) {
      const need =
        (quota[tier] ?? 0) - chosen.filter((c) => c.tier === tier).length;
      if (need <= 0) continue;
      const candidates = shuffle(
        pool.filter((c) => c.tier === tier && free(c)),
        rng,
      );
      for (const c of candidates.slice(0, need)) take(c);
    }
    if (chosen.length >= DRAW_PER_CATEGORY) return;

    // 2. Affordabilité : garantit la carte la moins chère du vivier.
    if (pool.length > 0) {
      const cheapest = pool.reduce((a, b) => (b.cost < a.cost ? b : a));
      if (free(cheapest)) take(cheapest);
    }

    // 3. Complète au hasard.
    for (const c of shuffle(pool.filter(free), rng)) {
      if (chosen.length >= DRAW_PER_CATEGORY) break;
      take(c);
    }
  };

  // Le vivier des visages NEUFS est épuisé en entier avant qu'on touche au
  // reste : la fraîcheur passe avant le quota de tier. L'inverse ramenait un
  // visage déjà vu pour honorer un « 1 S » alors qu'une carte inédite d'un
  // autre tier attendait — et deux fois le même personnage sur le plateau, le
  // joueur ne peut de toute façon pas les drafter tous les deux.
  fill(members.filter((c) => !placed.has(personOf(c))));
  if (chosen.length < DRAW_PER_CATEGORY) fill(members);

  // Quota mal réglé (somme > taille de ligne) : on tronque au hasard.
  if (chosen.length > DRAW_PER_CATEGORY) {
    return shuffle(chosen, rng).slice(0, DRAW_PER_CATEGORY);
  }

  // 4. Dernier recours : moins de 5 PERSONNES dans la catégorie. On accepte une
  //    seconde carte d'un personnage déjà pris plutôt qu'une ligne trouée.
  if (chosen.length < DRAW_PER_CATEGORY) {
    for (const c of shuffle(
      members.filter((m) => !usedIds.has(m.id)),
      rng,
    )) {
      if (chosen.length >= DRAW_PER_CATEGORY) break;
      chosen.push(c);
      usedIds.add(c.id);
    }
  }

  return shuffle(chosen, rng);
}

export function pickDraw(
  categories: DraftCategory[],
  rng: Rng = Math.random,
  roster: DraftCharacter[] = DRAFT_ROSTER,
): DraftPick {
  const draw = {} as DraftPick;
  // Personnes déjà posées sur le plateau, toutes lignes confondues.
  const placed = new Set<string>();

  // Les catégories les moins fournies d'abord : une ligne large trouvera encore
  // des visages neufs après coup, l'inverse n'est pas vrai.
  const eligible = categories.map((cat) => ({
    cat,
    members: roster.filter((c) => c.excellenceCategory === cat.id),
  })).sort((a, b) => a.members.length - b.members.length);

  for (const { cat, members } of eligible) {
    const row = drawForCategory(members, DEFAULT_TIER_QUOTA, rng, placed);
    for (const c of row) placed.add(personOf(c));
    draw[cat.id] = row;
  }

  return draw;
}
