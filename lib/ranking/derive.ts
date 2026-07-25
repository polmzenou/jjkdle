import type { Character } from "@/data/roster/characters";
import type { CategoryId } from "@/data/roster/categories";

/**
 * DÉRIVATION d'un classement Pyramid depuis les notes du roster : « le top 8 en
 * Vitesse », « le top 8 en Coéquipier »… Module PUR (aucune dépendance base/UI)
 * → testable unitairement.
 *
 * Le classement n'est jamais figé en base pour une consigne dérivée : il est
 * recalculé à la lecture (cf. `getConditions`). Rééquilibrer un personnage dans
 * l'admin reclasse donc la pyramid, sans réimport.
 *
 * ── Le tri, et pourquoi il a trois niveaux ────────────────────────────────
 *  1. NOTE décroissante — la donnée commande.
 *  2. Rang dans `tiebreak` — l'arbitrage rendu à la main par l'admin. Comme il
 *     n'intervient qu'après la note, il ne peut JAMAIS la contredire : c'est ce
 *     qui lui permet de survivre à une modification de notes au lieu d'être
 *     écrasé par le recalcul.
 *  3. `battleValue` puis nom — repli déterministe. Sans lui, deux personnages à
 *     note égale et non arbitrés pourraient changer de rang d'un chargement à
 *     l'autre : le joueur verrouillerait une position juste qui deviendrait
 *     fausse à la tentative suivante.
 */

export interface DerivedRanking {
  /** Les `slotCount` meilleurs, rang 1 (meilleure note) → rang N. */
  order: string[];
  /**
   * Groupes de personnages à note IDENTIQUE dans le top retenu (≥ 2 membres).
   * Un groupe = autant de rangs que le joueur ne peut pas déduire des notes ;
   * c'est ce que l'admin vient arbitrer.
   */
  ties: string[][];
  /** Personnages notés sur cette catégorie (donc éligibles au classement). */
  ratedCount: number;
}

/** Note du personnage sur la catégorie, ou `undefined` s'il n'est pas noté. */
function ratingOf(
  character: Character,
  categoryId: CategoryId,
): number | undefined {
  const value = character.ratings[categoryId];
  return typeof value === "number" ? value : undefined;
}

export function deriveRanking(
  characters: Character[],
  categoryId: CategoryId,
  tiebreak: string[],
  slotCount: number,
): DerivedRanking {
  // Une clé absente = personnage NON éligible à la catégorie (même règle que le
  // builder, cf. `eligibleFor`) : il ne doit pas apparaître avec un 0 implicite.
  const rated = characters.flatMap((c) => {
    const rating = ratingOf(c, categoryId);
    return rating === undefined ? [] : [{ character: c, rating }];
  });

  const tiebreakRank = new Map(tiebreak.map((id, i) => [id, i]));
  const rankOf = (id: string) => tiebreakRank.get(id) ?? Number.MAX_SAFE_INTEGER;

  const sorted = [...rated].sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    const byArbitration = rankOf(a.character.id) - rankOf(b.character.id);
    if (byArbitration !== 0) return byArbitration;
    const battle =
      (b.character.battleValue ?? 0) - (a.character.battleValue ?? 0);
    if (battle !== 0) return battle;
    return a.character.name.localeCompare(b.character.name, "fr");
  });

  const top = sorted.slice(0, slotCount);

  // Égalités DANS le top retenu seulement : deux ex æquo au-delà du 8e rang ne
  // gênent personne, ils ne sont jamais montrés au joueur.
  const ties: string[][] = [];
  let group: typeof top = [];
  for (const entry of top) {
    if (group.length > 0 && group[0].rating !== entry.rating) {
      if (group.length > 1) ties.push(group.map((g) => g.character.id));
      group = [];
    }
    group.push(entry);
  }
  if (group.length > 1) ties.push(group.map((g) => g.character.id));

  return {
    order: top.map((e) => e.character.id),
    ties,
    ratedCount: rated.length,
  };
}
