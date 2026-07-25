import type { Character } from "@/data/roster/characters";
import {
  attributeDisplayFor,
  attributeValue,
  type AttributeSchema,
  type AttributeSpec,
} from "./attribute-schema";
import type { AttributeHint, GuessRow, HintDirection } from "./types";

/**
 * Comparaison d'une proposition à la cible — cœur de la logique d'indices JJKdle.
 * Module PUR (aucun accès base/cookie) → testable et réutilisable.
 *
 * DATA-DRIVEN (étape 3) : les colonnes comparées, leur ordre et leurs règles
 * viennent du SCHÉMA D'ATTRIBUTS de l'univers courant, plus des enums JJK. Le
 * même code sert donc n'importe quel anime.
 *
 * Règles par `kind` :
 *  - CATEGORICAL / BOOLEAN : correct si égal, sinon wrong. Jamais de flèche.
 *  - ORDINAL : correct si égal, sinon wrong + flèche ↑/↓ selon le rang
 *    (`AttributeOption.order`) de la cible vs la proposition. Une valeur de rang
 *    `null` est NON ORDONNÉE : elle ne produit jamais de flèche (c'est la règle
 *    historique de « pas de grade »).
 *  - NUMERIC : correct si égal, close si |écart| ≤ `tolerance`, sinon wrong ;
 *    flèche ↑/↓ dans tous les cas non corrects.
 *
 * La cible est toujours un perso COMPLET (cf. eligibleRoster) ; une proposition
 * peut être incomplète (attribut absent) → statut wrong neutre + display "?".
 */
export function compareGuess(
  guess: Character,
  target: Character,
  schema: AttributeSchema,
): GuessRow {
  const hints: AttributeHint[] = schema.columns.map((spec) =>
    compareAttribute(spec, guess, target, schema),
  );
  return {
    characterId: guess.id,
    characterName: guess.name,
    ...(guess.image ? { image: guess.image } : {}),
    hints,
  };
}

function compareAttribute(
  spec: AttributeSpec,
  guess: Character,
  target: Character,
  schema: AttributeSchema,
): AttributeHint {
  const key = spec.key;
  const display = attributeDisplayFor(schema, guess, key);
  const g = attributeValue(guess, key);
  const t = attributeValue(target, key);

  if (spec.kind === "NUMERIC") return numericHint(spec, display, g, t);
  if (spec.kind === "ORDINAL") return orderedHint(spec, display, g, t, schema);

  // CATEGORICAL / BOOLEAN : égalité stricte, jamais de flèche.
  const correct = g != null && g === t;
  return { key, status: correct ? "correct" : "wrong", display, direction: null };
}

/** Indice d'un attribut ORDINAL : flèche selon le rang des options. */
function orderedHint(
  spec: AttributeSpec,
  display: string,
  guessVal: string | number | undefined,
  targetVal: string | number | undefined,
  schema: AttributeSchema,
): AttributeHint {
  const key = spec.key;
  if (guessVal != null && guessVal === targetVal) {
    return { key, status: "correct", display, direction: null };
  }
  let direction: HintDirection = null;
  if (typeof guessVal === "string" && typeof targetVal === "string") {
    const gi = schema.optionOrder(key, guessVal);
    const ti = schema.optionOrder(key, targetVal);
    // `null` = valeur non ordonnée (ou option inconnue) → aucune flèche.
    if (gi != null && ti != null && gi !== ti) {
      direction = ti > gi ? "up" : "down";
    }
  }
  return { key, status: "wrong", display, direction };
}

/** Indice d'un attribut NUMERIC : correct / close (tolérance) / wrong + flèche. */
function numericHint(
  spec: AttributeSpec,
  display: string,
  guessVal: string | number | undefined,
  targetVal: string | number | undefined,
): AttributeHint {
  const key = spec.key;
  if (typeof guessVal !== "number" || typeof targetVal !== "number") {
    return { key, status: "wrong", display, direction: null };
  }
  if (guessVal === targetVal) {
    return { key, status: "correct", display, direction: null };
  }
  const direction: HintDirection = targetVal > guessVal ? "up" : "down";
  // Pas de tolérance définie ⇒ aucun palier « proche ».
  const tolerance = spec.tolerance ?? 0;
  const status =
    Math.abs(targetVal - guessVal) <= tolerance ? "close" : "wrong";
  return { key, status, display, direction };
}
