import type { DraftCharacter, DraftPick } from "./types";
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
 * Affordabilité : la carte la MOINS chère de chaque catégorie est toujours
 * proposée → une équipe légale sous budget 100 existe toujours. RNG injectable.
 */

export const DRAW_PER_CATEGORY = 5;

export function pickDraw(
  rng: Rng = Math.random,
  roster: DraftCharacter[] = DRAFT_ROSTER,
): DraftPick {
  const draw = {} as DraftPick;

  for (const cat of DRAFT_CATEGORIES) {
    const members = roster.filter((c) => c.excellenceCategory === cat.id);

    // Catégorie peu fournie : on montre tout ce qu'il y a.
    if (members.length <= DRAW_PER_CATEGORY) {
      draw[cat.id] = shuffle(members, rng);
      continue;
    }

    // Garantit la carte la moins chère (affordabilité), complète au hasard.
    const cheapest = members.reduce((a, b) => (b.cost < a.cost ? b : a));
    const others = shuffle(
      members.filter((c) => c.id !== cheapest.id),
      rng,
    ).slice(0, DRAW_PER_CATEGORY - 1);
    draw[cat.id] = shuffle([cheapest, ...others], rng);
  }

  return draw;
}
