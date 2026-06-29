import type { Character } from "@/data/roster/characters";
import { eligibleRoster, pickDailyTarget, todayKey } from "./daily";
import { compareGuess } from "./scoring";
import type { JjkdleState } from "./state";
import type { GuessRow } from "./types";

/**
 * Helpers serveur partagés entre la page (lecture seule) et les Server Actions
 * (lecture + écriture). Aucune écriture de cookie ici.
 */

/**
 * Vrai si l'état stocké correspond toujours à la partie en cours.
 *
 * Dans TOUS les modes, l'état expire au changement de jour (`state.date` doit
 * être aujourd'hui). Ainsi un admin qui a lancé une partie aléatoire retrouve,
 * le lendemain, le perso quotidien commun à tous les joueurs.
 *  - mode admin : valable tant qu'on est le même jour (cible figée par l'admin) ;
 *  - mode daily : en plus, la cible déterministe du jour doit être celle du
 *    cookie (sinon le pool a changé).
 */
export function isStateFresh(state: JjkdleState, roster: Character[]): boolean {
  const today = todayKey();
  if (state.date !== today) return false;
  // Parties bonus (admin illimité / VIP plafonné) : cible figée pour la journée.
  if (state.mode === "admin" || state.mode === "vip") return true;
  const target = pickDailyTarget(today, eligibleRoster(roster));
  return target != null && target.id === state.targetId;
}

/** Reconstruit les lignes d'indices à partir des propositions stockées. */
export function buildRows(
  state: JjkdleState,
  map: Record<string, Character>,
): GuessRow[] {
  const target = map[state.targetId];
  if (!target) return [];
  return state.guesses
    .map((id) => map[id])
    .filter((c): c is Character => Boolean(c))
    .map((guess) => compareGuess(guess, target));
}
