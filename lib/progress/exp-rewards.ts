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

/** « Qui est-ce ? » : EXP fixe pour une victoire (victoire > défaite). */
export function guessWhoWinExp(): number {
  return 50;
}

/** « Qui est-ce ? » : EXP de consolation pour une défaite. */
export function guessWhoLossExp(): number {
  return 10;
}

/** « JJK Codenames » : EXP fixe par joueur de l'équipe gagnante. */
export function codenamesWinExp(): number {
  return 150;
}

/** « JJK Codenames » : EXP de consolation par joueur de l'équipe perdante. */
export function codenamesLossExp(): number {
  return 50;
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

/**
 * « The Culling Tower » : EXP CUMULÉE que vaut un étage atteint.
 *
 * Courbe quadratique — CHAQUE étage vaut plus que le précédent, et l'écart se
 * creuse en montant : l'étage 20 vaut 1600, le 15 en vaut 900, le 10 en vaut
 * 400. Un palier de plus près du sommet se paie donc bien plus cher qu'un
 * palier de plus au pied de la tour, ce qui est exactement l'effort demandé.
 *
 * ⚠️ Le détail par étage n'est pas cosmétique. Une première version à cinq
 * paliers grossiers (0 / 5 / 10 / 15 / 20) donnait la même EXP à tous les
 * étages d'un même palier : combinée à la règle du plus-haut-atteint, elle
 * faisait qu'un joueur passé de l'étage 10 à l'étage 14 ne gagnait
 * RIEN — une progression réelle, payée zéro, sans explication. Toute échelle
 * remplaçant celle-ci doit rester STRICTEMENT croissante.
 */
export function towerExp(floor: number): number {
  const f = Number.isFinite(floor) ? Math.max(0, Math.floor(floor)) : 0;
  return 4 * f * f;
}

/** Part de l'EXP servie par une tour aléatoire (VIP/ADMIN, hors classement). */
export const TOWER_RANDOM_RATIO = 0.4;

/**
 * EXP réellement due pour une run, AU PLUS-HAUT-ATTEINT DU JOUR.
 *
 * Les essais sur la tour du jour étant illimités, payer chaque essai en ferait
 * la machine à farmer du site : rejouer trente fois rapporterait trente fois
 * l'EXP. On ne paie donc que la PROGRESSION — atteindre l'étage 17 après un 12
 * rapporte la différence, retomber à l'étage 8 ne rapporte rien. C'est la même
 * sémantique que la table `Score` (meilleur en upsert), appliquée à la journée.
 *
 * Une tour aléatoire n'a pas de mémoire d'un essai à l'autre (`bestFloorBefore`
 * vaut 0) mais son barème est réduit : c'est le garde-fou anti-farm côté VIP.
 */
export function towerRunExp(params: {
  floorReached: number;
  bestFloorBefore: number;
  daily: boolean;
}): number {
  const earned = towerExp(params.floorReached);
  const already = params.daily ? towerExp(params.bestFloorBefore) : 0;
  const delta = Math.max(0, earned - already);
  return params.daily ? delta : Math.round(delta * TOWER_RANDOM_RATIO);
}

/**
 * Ce qu'il faut dire au joueur sur son EXP, en une phrase.
 *
 * Indispensable et pas décoratif : la règle du plus-haut-atteint fait qu'une
 * run de quinze minutes peut ne rien rapporter. Sans explication, le joueur
 * conclut à un bug — c'est exactement ce qui s'est produit.
 */
export function towerExpNote(params: {
  gained: number;
  floorReached: number;
  bestFloorBefore: number;
  daily: boolean;
}): string {
  if (!params.daily) {
    return params.gained > 0
      ? "Tour libre : l'XP y est réduite, et elle ne compte pas au classement."
      : "Tour libre : hors classement, et sans XP à la clé ici.";
  }

  if (params.gained > 0) {
    return params.bestFloorBefore > 0
      ? `Nouveau record du jour : étage ${params.floorReached}, contre ${params.bestFloorBefore} auparavant.`
      : `Premier passage du jour : étage ${params.floorReached}.`;
  }

  return `Tu étais déjà monté à l'étage ${params.bestFloorBefore} aujourd'hui. L'XP ne se gagne qu'en allant plus haut — il faut dépasser l'étage ${params.bestFloorBefore} pour en regagner.`;
}

/** Combien d'EXP vaut 1 coin. Unique curseur d'équilibrage de l'économie. */
export const XP_PER_COIN = 10;

/**
 * Coins gagnés par une partie, dérivés de l'EXP qu'elle rapporte (arrondi à
 * l'inférieur). Une petite partie (< 10 XP) peut donc ne rien rapporter.
 * Appelée depuis `awardExp` : aucun jeu n'a son propre barème de coins.
 */
export function coinsForExp(gainedExp: number): number {
  const exp = Number.isFinite(gainedExp) ? gainedExp : 0;
  return Math.floor(Math.max(0, exp) / XP_PER_COIN);
}
