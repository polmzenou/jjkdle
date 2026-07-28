/**
 * Types partagés du classement / octroi d'XP.
 *
 * Isolés dans un module SANS `"use server"` pour pouvoir être importés librement
 * (les fichiers Server Actions ne peuvent exporter que des fonctions async).
 */

export type ExpResult = {
  ok: boolean;
  needsAuth?: boolean;
  /** XP gagnée par cette partie (0 possible). */
  gainedExp?: number;
  /** Coins gagnés par cette partie (dérivés de l'XP ; 0 possible). */
  gainedCoins?: number;
  /** Badges nouvellement débloqués par l'octroi (toast). */
  newBadges?: string[];
};
