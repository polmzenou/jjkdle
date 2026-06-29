import type { Character } from "@/data/roster/characters";
import { isComplete } from "./attributes";

/**
 * Sélection déterministe du personnage mystère du jour (module PUR, testable).
 *
 * Principe : un hash déterministe de la date "YYYY-MM-DD" donne un index dans le
 * pool éligible (persos complets, triés par id pour un ordre stable). Tous les
 * joueurs partagent donc la même cible un jour donné, sans aucun état persistant.
 * Anti-répétition : on évite de ressortir un perso choisi dans les K jours
 * précédents (recalculés par la même fonction).
 */

const TIMEZONE = "Europe/Paris";

/** Pool éligible : persos complets, triés par id (ordre stable indépendant du tri d'affichage). */
export function eligibleRoster(roster: Character[]): Character[] {
  return roster.filter(isComplete).sort((a, b) => a.id.localeCompare(b.id));
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

/** Hash déterministe FNV-1a 32 bits d'une chaîne. */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Nombre de jours (entier) depuis l'époque Unix pour une clé "YYYY-MM-DD". */
function dayNumber(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** PGCD. */
function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

/**
 * Pas premier avec `n`, proche du nombre d'or (≈0.618·n) pour une bonne
 * dispersion. Comme gcd(step, n) = 1, la suite `day·step mod n` parcourt les n
 * indices avant de se répéter.
 */
function coprimeStep(n: number): number {
  let step = Math.max(1, Math.round(n * 0.6180339887));
  while (gcd(step, n) !== 1) step = (step % n) + 1;
  return step;
}

/**
 * Cible du jour pour `dateKey` parmi `eligible` (déjà filtré/trié).
 *
 * Anti-répétition GARANTIE : `index = (phase + day·step) mod n` avec `step`
 * premier à `n`. Sur toute fenêtre glissante de `n` jours consécutifs, les n
 * indices sont distincts (suite arithmétique de raison première à n) → aucun
 * perso ne ressort tant que le pool n'a pas été entièrement parcouru. Pas de
 * jonction de blocs, pas de récursion, entièrement déterministe et sans état.
 */
export function pickDailyTarget(
  dateKey: string,
  eligible: Character[],
): Character | null {
  const n = eligible.length;
  if (n === 0) return null;
  if (n === 1) return eligible[0];

  const day = dayNumber(dateKey);
  const phase = hashString("jjkdle") % n;
  const step = coprimeStep(n);
  const index = (((phase + day * step) % n) + n) % n;
  return eligible[index];
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
