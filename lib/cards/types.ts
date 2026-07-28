import type { BoosterKind } from "./boosters";
import type { CardRarity } from "./rarity";

/**
 * Types de VUE des cartes, isolés de `lib/cards/store.ts` (qui importe Prisma
 * et est donc server-only). Les composants client peuvent les importer
 * librement — même motif que `lib/leaderboard/types.ts`.
 */

/** Une carte du point de vue de l'affichage (grille, deck, révélation). */
export interface CardView {
  characterId: string;
  name: string;
  /** Étiquette de flavor du personnage (ex. « Special Grade »). */
  title: string;
  image?: string;
  rarity: CardRarity;
  /** Coins rendus si le joueur la revend. */
  sellValue: number;
}

/** Une carte de la collection : la `CardView` + son statut de possession. */
export interface CollectionCard extends CardView {
  owned: boolean;
}

/** Une carte révélée à l'ouverture d'un booster. */
export interface RevealedCard extends CardView {
  /** Déjà possédée → convertie en coins au lieu d'entrer en collection. */
  duplicate: boolean;
  /** Coins effectivement crédités par cette carte (0 si nouvelle). */
  coins: number;
}

export interface OpenedBooster {
  boosterId: string;
  kind: BoosterKind;
  /** Cartes dans l'ordre de RÉVÉLATION (rareté croissante). */
  cards: RevealedCard[];
  /** Total des coins gagnés par les doublons. */
  coinsEarned: number;
}

export interface PendingBooster {
  id: string;
  kind: BoosterKind;
  createdAt: Date;
}
