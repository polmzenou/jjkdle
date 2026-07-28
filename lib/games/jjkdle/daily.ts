import type { Character } from "@/data/roster/characters";
import { dailyIndexes } from "@/lib/rotation";
import { isCompleteFor, type AttributeSchema } from "./attribute-schema";

/**
 * Sélection déterministe du personnage mystère du jour (module PUR, testable).
 *
 * Principe : un hash déterministe de la date "YYYY-MM-DD" donne un index dans le
 * pool éligible (persos complets, triés par id pour un ordre stable). Tous les
 * joueurs partagent donc la même cible un jour donné, sans aucun état persistant.
 * L'anti-répétition est assurée par `dailyIndexes` (cf. `lib/rotation.ts`), la
 * primitive partagée avec l'étal exotic de la boutique.
 */

const TIMEZONE = "Europe/Paris";

/**
 * Pool éligible : persos dont TOUS les attributs de l'univers sont renseignés,
 * triés par id (ordre stable indépendant du tri d'affichage).
 *
 * ⚠️ Le tri par `id` conditionne la cible du jour (`pickDailyTarget` indexe dans
 * ce tableau) : ne jamais le changer sans casser la continuité du daily.
 */
export function eligibleRoster(
  roster: Character[],
  schema: AttributeSchema,
): Character[] {
  return roster
    .filter((c) => isCompleteFor(schema, c))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Clé du jour "YYYY-MM-DD" dans le fuseau de référence (jour partagé par tous). */
export function todayKey(date: Date = new Date(), tz: string = TIMEZONE): string {
  // en-CA donne le format ISO YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Cible du jour pour `dateKey` parmi `eligible` (déjà filtré/trié).
 *
 * Le sel `"jjkdle"` est celui d'origine : le changer décalerait la phase et
 * casserait la continuité du daily.
 */
export function pickDailyTarget(
  dateKey: string,
  eligible: Character[],
): Character | null {
  const [index] = dailyIndexes(dateKey, eligible.length, "jjkdle");
  return index === undefined ? null : eligible[index];
}

/** Cible aléatoire (mode admin illimité) parmi le pool éligible. */
export function pickRandomTarget(
  eligible: Character[],
  rng: () => number = Math.random,
): Character | null {
  if (eligible.length === 0) return null;
  return eligible[Math.floor(rng() * eligible.length)];
}

/** Millisecondes restantes jusqu'au prochain minuit (fuseau de référence). */
export function msUntilMidnight(date: Date = new Date(), tz: string = TIMEZONE): number {
  // Heure locale courante dans le fuseau.
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const h = get("hour") % 24;
  const m = get("minute");
  const s = get("second");
  const elapsedMs = ((h * 60 + m) * 60 + s) * 1000;
  const dayMs = 24 * 60 * 60 * 1000;
  return dayMs - elapsedMs;
}
