import type { RankingCondition } from "@/data/ranking/conditions";
import { CONDITIONS } from "@/data/ranking/conditions";
import { shuffle, type Rng } from "@/lib/draw/draw";

/**
 * Logique du jeu "JJK Pyramid", isolée de l'UI → testable unitairement.
 *
 * Règles :
 *  - 4 tentatives. Score si le classement devient entièrement correct à la
 *    tentative k : 1→10 000, 2→7 500, 3→5 000, 4→2 500. Sinon (échec) 0.
 *  - Une position correcte est verrouillée et le reste entre les tentatives.
 */

export const MAX_ATTEMPTS = 4;

/** Barème : points gagnés si le build est complété à la tentative `attempt` (1-based). */
const ATTEMPT_SCORES = [10000, 7500, 5000, 2500];

export function scoreForAttempt(attempt: number): number {
  return ATTEMPT_SCORES[attempt - 1] ?? 0;
}

/**
 * Compare un placement proposé à l'ordre correct.
 * `proposed[i]` = id du perso placé au slot i (ou null si vide).
 * Renvoie un booléen par position (true = bon perso au bon rang).
 */
export function checkPlacement(
  proposed: (string | null)[],
  order: string[],
): boolean[] {
  return order.map((correctId, i) => proposed[i] === correctId);
}

/** Vrai si toutes les positions sont correctes. */
export function isComplete(correctFlags: boolean[]): boolean {
  return correctFlags.length > 0 && correctFlags.every(Boolean);
}

/**
 * Tire une condition au hasard dans le pool.
 * `excludeId` permet d'éviter de retomber sur la condition précédente
 * (ignoré s'il ne reste plus qu'une condition possible).
 */
export function pickRandomCondition(
  rng: Rng = Math.random,
  excludeId?: string,
): RankingCondition {
  const pool =
    excludeId === undefined
      ? CONDITIONS
      : CONDITIONS.filter((c) => c.id !== excludeId);
  const from = pool.length > 0 ? pool : CONDITIONS;
  return from[Math.floor(rng() * from.length)];
}

/** Pool de départ : les 8 personnages de la condition, mélangés. */
export function shuffledPool(
  condition: RankingCondition,
  rng: Rng = Math.random,
): string[] {
  return shuffle(condition.order, rng);
}
