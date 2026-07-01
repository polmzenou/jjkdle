import type { GradeId } from "@/lib/scoring/grades";

/**
 * Barème d'EXP par partie (module PUR, testable) — modèle ACCUMULATIF.
 *
 * Chaque partie terminée rapporte un montant fixe et lisible, ajouté au total
 * du joueur (`User.totalXp`) via `awardExp`. Contrairement à l'ancien calcul
 * dérivé des meilleurs scores, l'EXP se gagne à CHAQUE partie (farm assumé).
 *
 * Tous les montants sont des entiers ≥ 0.
 */

/** Builder : EXP par grade (Grade 4− ne rapporte rien). */
const BUILDER_EXP_BY_GRADE: Record<GradeId, number> = {
  s: 50,
  "1": 30,
  "2": 20,
  "3": 15,
  "4": 10,
  "4minus": 0,
};

/**
 * Builder : EXP du grade, DOUBLÉE en cas de nouveau record perso.
 * (Réutilisable tel quel pour un éventuel Builder multijoueur.)
 */
export function builderExp(gradeId: GradeId, isNewRecord: boolean): number {
  const base = BUILDER_EXP_BY_GRADE[gradeId] ?? 0;
  return isNewRecord ? base * 2 : base;
}

/** JJK Pyramid : paliers de points (0–10000) → EXP. Ordonné du + haut au + bas. */
const RANKING_TIERS: ReadonlyArray<{ min: number; exp: number }> = [
  { min: 10000, exp: 100 },
  { min: 7500, exp: 75 },
  { min: 5000, exp: 50 },
  { min: 2500, exp: 25 },
  { min: 0, exp: 0 },
];

/** JJK Pyramid : EXP selon le nombre de points marqués sur la partie. */
export function rankingExp(points: number): number {
  const p = Number.isFinite(points) ? points : 0;
  const tier = RANKING_TIERS.find((t) => p >= t.min);
  return tier?.exp ?? 0;
}

/**
 * Jujutsu Draft : EXP selon le nombre de boss vaincus (0–6). Progression
 * continue au-delà de 4 boss. L'index hors bornes est clampé sur [0, 6].
 */
const DRAFT_EXP_BY_KILLS: readonly number[] = [0, 10, 20, 100, 500, 1000, 2000];

export function draftExp(enemiesKilled: number): number {
  const k = Math.max(0, Math.min(DRAFT_EXP_BY_KILLS.length - 1, Math.floor(enemiesKilled)));
  return DRAFT_EXP_BY_KILLS[k];
}

/** JJK Random Battle : EXP fixe pour une victoire contre un joueur. */
export function battleWinExp(): number {
  return 25;
}

/** JJKdle : EXP de base selon le nombre d'essais (moins = mieux). */
function jjkdleBaseExp(attempts: number): number {
  if (attempts <= 1) return 500;
  if (attempts <= 4) return 100;
  if (attempts <= 7) return 50;
  return 10;
}

/**
 * JJKdle : EXP de base × multiplicateur de streak.
 *
 * Le multiplicateur suit `1 streak = ×2, 2 = ×3, …, N = ×(N+1)`, non plafonné.
 * `streak` est le streak quotidien APRÈS la victoire du jour (≥ 1 dès la 1ʳᵉ).
 * Un streak ≤ 0 (cas dégénéré) retombe sur un multiplicateur de ×1.
 */
export function jjkdleExp(attempts: number, streak: number): number {
  const base = jjkdleBaseExp(Math.max(1, Math.floor(attempts)));
  const multiplier = Math.max(1, Math.floor(streak) + 1);
  return base * multiplier;
}
