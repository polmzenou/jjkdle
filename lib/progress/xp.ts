import type { UserStatsContext } from "./context";

/**
 * Calcul de l'XP et du niveau d'un compte (module PUR, testable).
 *
 * L'XP agrège les scores de TOUS les jeux en normalisant leurs échelles
 * hétérogènes (builder /1000, ranking /10000, draft = nb de boss, streak JJKdle)
 * pour les ramener à des ordres de grandeur comparables. Le niveau dérive de
 * l'XP via une courbe à seuil croissant.
 *
 * Source de vérité = les scores : `computeTotalXp` est pur et idempotent. Le
 * bonus admin (`User.xpBonus`) est ajouté par-dessus dans recomputeUserProgress.
 */

/**
 * Niveau « maximum » conceptuel, utilisé par les paliers cosmétiques (dernière
 * bannière, titre/cadre légendaires « niveau max »). La courbe d'XP reste
 * infinie : ce cap ne borne pas la progression, il sert uniquement de seuil de
 * déblocage partagé (bannières, titres, cadres).
 */
export const MAX_LEVEL = 50;

/** Poids par jeu (documentés, ajustables). Objectif : grandeurs comparables. */
export const XP_WEIGHTS = {
  builder: 1, // score 0–1000
  ranking: 0.1, // score 0–10000 → 0–1000
  draftKill: 200, // 0–6 boss → 0–1200
  jjkdleBestStreak: 100, // par jour de meilleur streak
} as const;

/** XP dérivée des scores (hors bonus admin). Toujours ≥ 0, entière. */
export function computeTotalXp(ctx: UserStatsContext): number {
  const xp =
    ctx.builderBest * XP_WEIGHTS.builder +
    ctx.rankingBest * XP_WEIGHTS.ranking +
    ctx.draftKills * XP_WEIGHTS.draftKill +
    ctx.jjkdleBestStreak * XP_WEIGHTS.jjkdleBestStreak;
  return Math.max(0, Math.round(xp));
}

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
