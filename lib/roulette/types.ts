import type { CardView } from "@/lib/cards/types";

/**
 * Types de VUE de la roulette, isolés de `lib/roulette/store.ts` (server-only,
 * importe Prisma) pour que les composants client puissent les importer.
 */

/** Dernier lot gagné, pour le panneau « Dernier gain ». */
export interface RouletteLastWin {
  slotId: string;
  /** Coins réellement crédités (lot coins, ou doublon converti). */
  coinsWon: number;
  /** Nom du personnage si le lot était une carte. */
  cardName: string | null;
  paid: boolean;
  createdAt: string;
}

/** État de la roue pour un joueur dans l'univers courant. */
export interface RouletteState {
  /** 0 = le tour gratuit est disponible. */
  msUntilFree: number;
  lastWin: RouletteLastWin | null;
}

/** Résultat d'un tour, renvoyé au client APRÈS livraison du lot. */
export interface SpinOutcome {
  /** Case sur laquelle la roue doit s'arrêter (décidée par le serveur). */
  slotIndex: number;
  slotId: string;
  paid: boolean;
  coinsWon: number;
  /** Booster créé NON OUVERT si le lot était un booster. */
  boosterId?: string;
  /** Carte tirée si le lot était une carte. */
  card?: CardView & { duplicate: boolean };
  /** Délai avant le prochain tour gratuit, recalculé après ce tour. */
  msUntilFree: number;
}
