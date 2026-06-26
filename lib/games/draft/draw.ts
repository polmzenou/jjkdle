import type { DraftCharacter, DraftPick } from "./types";
import { DRAFT_CATEGORIES } from "./categories";
import { DRAFT_ROSTER } from "./roster";
import { shuffle, type Rng } from "@/lib/draw/draw";

/**
 * Tirage du draft : 5 personnages par catégorie (8 × 5 = 40 cartes), **toutes
 * distinctes** (sans remise sur tout le plateau → 8 picks finaux uniques, jamais
 * de doublon entre catégories).
 *
 * Faisabilité budget garantie : chaque catégorie reçoit **au moins une carte
 * Tier C** (coût ≤ 6). Comme le roster compte 16 Tier C, le budget 100 est
 * toujours tenable (8 × 6 = 48 ≤ 100). RNG injectable pour des tests stables.
 */

export const DRAW_PER_CATEGORY = 5;

export function pickDraw(
  rng: Rng = Math.random,
  roster: DraftCharacter[] = DRAFT_ROSTER,
): DraftPick {
  const cats = DRAFT_CATEGORIES;
  const cheap = shuffle(
    roster.filter((c) => c.tier === "C"),
    rng,
  );
  const others = shuffle(
    roster.filter((c) => c.tier !== "C"),
    rng,
  );

  const draw = {} as DraftPick;
  let cheapIdx = 0;

  // 1) Une carte Tier C garantie par catégorie (affordabilité).
  for (const cat of cats) {
    draw[cat.id] = [cheap[cheapIdx++]];
  }

  // 2) Complète chaque catégorie à DRAW_PER_CATEGORY depuis le reste du pool
  //    (Tier C restants + non-C), toujours sans remise.
  const pool = shuffle([...others, ...cheap.slice(cheapIdx)], rng);
  let poolIdx = 0;
  for (const cat of cats) {
    while (draw[cat.id].length < DRAW_PER_CATEGORY) {
      draw[cat.id].push(pool[poolIdx++]);
    }
    // Mélange l'ordre d'affichage de la ligne (la carte C garantie n'est pas
    // toujours en tête).
    draw[cat.id] = shuffle(draw[cat.id], rng);
  }

  return draw;
}
