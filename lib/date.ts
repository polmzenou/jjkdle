import { todayKey } from "@/lib/games/jjkdle/daily";

/**
 * Bornes de la semaine courante (lundi 00:00 → lundi suivant 00:00) dans le
 * fuseau de référence Europe/Paris, calé sur la même définition de "jour" que
 * JJKdle (`todayKey`). Sert au leaderboard hebdomadaire (filtre `createdAt`/
 * `updatedAt >= start`).
 */

const TIMEZONE = "Europe/Paris";
const DAY_MS = 86_400_000;

/** Décalage du fuseau (ms) à un instant donné, ex. +2h l'été à Paris. */
function tzOffsetMs(date: Date, tz: string): number {
  // Heure "murale" dans le fuseau, réinterprétée comme UTC, moins l'instant réel.
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const asUTC = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return asUTC - date.getTime();
}

export interface WeekBounds {
  /** Instant du lundi 00:00 (Europe/Paris) de la semaine de `date`. */
  start: Date;
  /** Instant du lundi 00:00 suivant (borne haute exclusive). */
  end: Date;
}

/** Bornes de la semaine ISO (lundi → lundi) contenant `date`. */
export function getWeekBounds(date: Date = new Date()): WeekBounds {
  // Minuit du jour courant dans le fuseau.
  const key = todayKey(date, TIMEZONE); // "YYYY-MM-DD"
  const [y, m, d] = key.split("-").map(Number);
  // Minuit local Europe/Paris exprimé en instant réel (UTC).
  const localMidnightUTC = Date.UTC(y, m - 1, d);
  const startOfTodayMs = localMidnightUTC - tzOffsetMs(new Date(localMidnightUTC), TIMEZONE);

  // Jour de la semaine (0 = dimanche) de la DATE CIVILE (pas de l'instant UTC,
  // qui tombe la veille à 22:00 et fausserait le jour).
  const dow = new Date(localMidnightUTC).getUTCDay();
  // Recul jusqu'au lundi (lundi = 1 ; dimanche compte comme +6 jours de recul).
  const daysSinceMonday = (dow + 6) % 7;
  const start = new Date(startOfTodayMs - daysSinceMonday * DAY_MS);
  const end = new Date(start.getTime() + 7 * DAY_MS);
  return { start, end };
}

/** Les 7 clés "YYYY-MM-DD" (Europe/Paris) de la semaine de `date`, lundi→dimanche. */
export function weekDateKeys(date: Date = new Date()): string[] {
  const { start } = getWeekBounds(date);
  return Array.from({ length: 7 }, (_, i) =>
    todayKey(new Date(start.getTime() + i * DAY_MS + DAY_MS / 2), TIMEZONE),
  );
}
