import type { Character } from "@/data/roster/characters";
import {
  ATTRIBUTE_COLUMNS,
  ARCS_ORDER,
  GRADES_ORDER,
  CURSED_ENERGY_TOLERANCE,
  attributeDisplay,
  type AttributeKey,
} from "./attributes";
import type { AttributeHint, GuessRow, HintDirection } from "./types";

/**
 * Comparaison d'une proposition à la cible — cœur de la logique d'indices JJKdle.
 * Module PUR (aucun accès base/cookie) → testable et réutilisable.
 *
 * Règles :
 *  - attributs mono-valeur (race, gender, affiliation, clan, hasDomain) :
 *    correct si égal, sinon wrong ;
 *  - attributs ordonnés (grade, appearanceArc) : correct si égal, sinon wrong +
 *    flèche up/down selon l'index de la cible vs la proposition ;
 *  - cursedEnergy : correct si égal, close si |écart| ≤ tolérance, sinon wrong ;
 *    flèche up/down dans tous les cas non corrects.
 *
 * La cible est toujours un perso COMPLET (cf. eligibleRoster) ; une proposition
 * peut être incomplète (attribut undefined) → statut wrong neutre + display "?".
 */
export function compareGuess(guess: Character, target: Character): GuessRow {
  const hints: AttributeHint[] = ATTRIBUTE_COLUMNS.map((key) =>
    compareAttribute(key, guess, target),
  );
  return {
    characterId: guess.id,
    characterName: guess.name,
    ...(guess.image ? { image: guess.image } : {}),
    hints,
  };
}

function compareAttribute(
  key: AttributeKey,
  guess: Character,
  target: Character,
): AttributeHint {
  const display = attributeDisplay(key, guess);

  if (key === "grade") {
    // NO_GRADE n'est pas ordonné : égalité stricte, jamais de flèche.
    if (guess.grade === "NO_GRADE" || target.grade === "NO_GRADE") {
      const correct = guess.grade != null && guess.grade === target.grade;
      return { key, status: correct ? "correct" : "wrong", display, direction: null };
    }
    return orderedHint(key, display, guess.grade, target.grade, GRADES_ORDER);
  }
  if (key === "appearanceArc") {
    return orderedHint(
      key,
      display,
      guess.appearanceArc,
      target.appearanceArc,
      ARCS_ORDER,
    );
  }
  if (key === "cursedEnergy") {
    return cursedEnergyHint(display, guess.cursedEnergy, target.cursedEnergy);
  }

  // Attributs mono-valeur : égalité stricte.
  const g = scalarValue(key, guess);
  const t = scalarValue(key, target);
  const correct = g != null && g === t;
  return { key, status: correct ? "correct" : "wrong", display, direction: null };
}

/** Valeur scalaire comparable d'un attribut mono-valeur. */
function scalarValue(key: AttributeKey, c: Character): string | boolean | undefined {
  switch (key) {
    case "race":
      return c.race;
    case "gender":
      return c.gender;
    case "affiliation":
      return c.affiliation;
    case "clan":
      return c.clan;
    case "hasDomain":
      return c.hasDomain;
    default:
      return undefined;
  }
}

/** Indice pour un attribut ordonné (grade, arc) : flèche selon l'index. */
function orderedHint<T extends string>(
  key: AttributeKey,
  display: string,
  guessVal: T | undefined,
  targetVal: T | undefined,
  order: T[],
): AttributeHint {
  if (guessVal != null && guessVal === targetVal) {
    return { key, status: "correct", display, direction: null };
  }
  let direction: HintDirection = null;
  if (guessVal != null && targetVal != null) {
    const gi = order.indexOf(guessVal);
    const ti = order.indexOf(targetVal);
    if (gi !== -1 && ti !== -1 && gi !== ti) {
      direction = ti > gi ? "up" : "down";
    }
  }
  return { key, status: "wrong", display, direction };
}

/** Indice numérique pour cursedEnergy : correct / close / wrong + flèche. */
function cursedEnergyHint(
  display: string,
  guessVal: number | undefined,
  targetVal: number | undefined,
): AttributeHint {
  const key: AttributeKey = "cursedEnergy";
  if (guessVal == null || targetVal == null) {
    return { key, status: "wrong", display, direction: null };
  }
  if (guessVal === targetVal) {
    return { key, status: "correct", display, direction: null };
  }
  const direction: HintDirection = targetVal > guessVal ? "up" : "down";
  const status = Math.abs(targetVal - guessVal) <= CURSED_ENERGY_TOLERANCE
    ? "close"
    : "wrong";
  return { key, status, display, direction };
}
