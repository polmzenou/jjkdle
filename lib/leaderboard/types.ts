/**
 * Types partagés du classement / octroi d'XP.
 *
 * Isolés dans un module SANS `"use server"` pour pouvoir être importés librement
 * (les fichiers Server Actions ne peuvent exporter que des fonctions async).
 */

import type { BoosterKind } from "@/lib/cards/boosters";

export type ExpResult = {
  ok: boolean;
  needsAuth?: boolean;
  /** XP gagnée par cette partie (0 possible), bonus de deck inclus. */
  gainedExp?: number;
  /** Coins gagnés par cette partie (dérivés de l'XP ; 0 possible). */
  gainedCoins?: number;
  /** Badges nouvellement débloqués par l'octroi (toast). */
  newBadges?: string[];
  /**
   * Booster tombé en fin de partie (1 chance sur 2), déjà persisté NON OUVERT.
   * `null` = pas de drop. Ignorer l'écran de fin ne le perd pas : il reste
   * ouvrable depuis /account/deck.
   */
  droppedBooster?: { id: string; kind: BoosterKind } | null;
};
