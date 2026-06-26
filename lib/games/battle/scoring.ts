import type { RosterMap } from "@/lib/multiplayer/state";
import { battleValueOf } from "./battleValues";
import type { BattleResult } from "./types";

/** Cumul des battleValue d'un deck (ids → somme). */
export function scoreDeck(deckIds: string[], roster: RosterMap): number {
  return deckIds.reduce((sum, id) => sum + battleValueOf(roster[id]), 0);
}

/**
 * Calcule le résultat 1v1 : cumul de chaque deck, vainqueur = total le plus haut.
 * Égalité stricte → `tie: true`, `winnerUserId: null`.
 */
export function computeBattleResult(
  decks: Record<string, string[]>,
  roster: RosterMap,
): BattleResult {
  const scores: Record<string, number> = {};
  for (const [userId, deck] of Object.entries(decks)) {
    scores[userId] = scoreDeck(deck, roster);
  }

  const entries = Object.entries(scores);
  let winnerUserId: string | null = null;
  let best = -Infinity;
  let tie = false;
  for (const [userId, score] of entries) {
    if (score > best) {
      best = score;
      winnerUserId = userId;
      tie = false;
    } else if (score === best) {
      tie = true;
      winnerUserId = null;
    }
  }

  return { scores, winnerUserId, tie };
}
