/**
 * Courbe de niveau d'un compte (module PUR, testable).
 *
 * L'XP est ACCUMULATIVE : `User.totalXp` grandit de l'EXP gagnée par partie
 * (barème dans `lib/progress/exp-rewards`, application via `lib/progress/recompute`).
 * Ce module ne s'occupe QUE de la conversion XP totale ↔ niveau, via une courbe
 * à seuil croissant.
 */

/**
 * Niveau « maximum » conceptuel, utilisé par les paliers cosmétiques (dernière
 * bannière, titre/cadre légendaires « niveau max »). La courbe d'XP reste
 * infinie : ce cap ne borne pas la progression, il sert uniquement de seuil de
 * déblocage partagé (bannières, titres, cadres).
 */
export const MAX_LEVEL = 50;

/** XP nécessaire pour PASSER du niveau `level` au suivant. */
export function xpForLevel(level: number): number {
  return Math.round(100 * Math.pow(Math.max(1, level), 1.5));
}

export interface LevelInfo {
  /** Niveau atteint (≥ 1). */
  level: number;
  /** XP accumulée dans le niveau courant. */
  current: number;
  /** XP totale requise pour passer au niveau suivant. */
  needed: number;
}

/** Convertit une XP totale en niveau + progression vers le suivant. */
export function xpToLevel(totalXp: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalXp));
  // Soustrait les paliers tant que l'XP couvre le niveau courant.
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level += 1;
  }
  return { level, current: remaining, needed: xpForLevel(level) };
}

/**
 * XP totale minimale pour ATTEINDRE `level` (somme des paliers 1..level-1).
 * Inverse de `xpToLevel` — sert à l'édition admin "fixer un niveau" (§9).
 */
export function levelToMinXp(level: number): number {
  const target = Math.max(1, Math.floor(level));
  let xp = 0;
  for (let l = 1; l < target; l++) xp += xpForLevel(l);
  return xp;
}
