import type { RosterMap } from "@/lib/multiplayer/state";
import { battleValueOf } from "./battleValues";
import { gauntletSurvivors } from "./combat";
import type { BattleMode, BattleResult } from "./types";

/** Cumul des battleValue d'un deck (ids → somme). */
export function scoreDeck(deckIds: string[], roster: RosterMap): number {
  return deckIds.reduce((sum, id) => sum + battleValueOf(roster[id]), 0);
}

/**
 * Résultat 1v1 selon le mode :
 * - `normal`   : vainqueur = cumul des battleValue le plus haut.
 * - `hardcore` : gauntlet « le vainqueur reste » ; vainqueur = équipe avec des
 *   survivants. Le cumul reste calculé à titre informatif.
 * Égalité → `tie: true`, `winnerUserId: null`.
 */
export function computeBattleResult(
  decks: Record<string, string[]>,
  roster: RosterMap,
  mode: BattleMode = "normal",
): BattleResult {
  const scores: Record<string, number> = {};
  for (const [userId, deck] of Object.entries(decks)) {
    scores[userId] = scoreDeck(deck, roster);
  }

  if (mode === "hardcore") {
    return hardcoreResult(decks, scores, roster);
  }
  return cumulativeResult(scores);
}

function cumulativeResult(scores: Record<string, number>): BattleResult {
  let winnerUserId: string | null = null;
  let best = -Infinity;
  let tie = false;
  for (const [userId, score] of Object.entries(scores)) {
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

function hardcoreResult(
  decks: Record<string, string[]>,
  scores: Record<string, number>,
  roster: RosterMap,
): BattleResult {
  const [a, b] = Object.keys(decks);
  // Gauntlet à deux joueurs : on attend exactement 2 decks.
  const { aRemaining, bRemaining } = gauntletSurvivors(
    decks[a] ?? [],
    decks[b] ?? [],
    roster,
  );
  const survivors = { [a]: aRemaining, [b]: bRemaining };

  let winnerUserId: string | null = null;
  let tie = false;
  if (aRemaining > 0 && bRemaining === 0) winnerUserId = a;
  else if (bRemaining > 0 && aRemaining === 0) winnerUserId = b;
  else tie = true; // double K.O. final : aucune équipe ne survit

  return { scores, survivors, winnerUserId, tie };
}
