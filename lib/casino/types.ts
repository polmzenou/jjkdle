import type { Card } from "./cards";

/**
 * Types partagés du casino. Module PUR : importable par le serveur, par les
 * composants client et par les tests.
 *
 * Deux familles à ne pas confondre :
 *  - `*State`  : l'état INTERNE, tel qu'il est persisté (contient les secrets).
 *  - `*View`   : ce qui est envoyé au client (carte cachée retirée, sabot réduit
 *                à un compte). Le passage de l'un à l'autre se fait en un seul
 *                endroit : `serializeTable` (lib/casino/state.ts).
 */

export type CasinoPhaseValue =
  | "BETTING"
  | "DEALING"
  | "PLAYER_TURNS"
  | "DEALER"
  | "SETTLED";

export type TableMode = "PUBLIC" | "SOLO";

export type HandStatus = "PLAYING" | "STAND" | "BUST" | "BLACKJACK";

export type Move = "HIT" | "STAND" | "DOUBLE";

export type HandOutcome = "BLACKJACK" | "WIN" | "PUSH" | "LOSE";

/**
 * Une main jouée par un siège.
 *
 * Un siège en porte un TABLEAU alors que le split n'est pas implémenté : c'est
 * la forme qui permettra de l'ajouter par un simple `push`, sans migration.
 */
export interface BjHand {
  cards: Card[];
  /** Mise engagée sur CETTE main (doublée après un DOUBLE). */
  bet: number;
  doubled: boolean;
  status: HandStatus;
}

/** Résultat d'une main, conservé pour l'affichage du récapitulatif. */
export interface HandResult {
  outcome: HandOutcome;
  /** Total recrédité, mise incluse. */
  payout: number;
  /** Gain NET (payout - mise) : négatif si perdu. C'est ce qu'on affiche. */
  net: number;
}

/** Ce que le siège rapporte au joueur sur la manche (toutes mains confondues). */
export interface SeatResult {
  hands: HandResult[];
  net: number;
}

// ── État interne (persisté) ───────────────────────────────────────────────

export interface SeatState {
  id: string;
  seat: number;
  userId: string;
  username: string;
  level: number;
  hands: BjHand[];
  activeHand: number;
  bet: number;
  betHandNumber: number;
  settledHandNumber: number;
  lastResult: SeatResult | null;
  missedRounds: number;
  leaving: boolean;
}

/** L'état d'une table, tel que la machine à états le consomme. */
export interface TableState {
  mode: TableMode;
  phase: CasinoPhaseValue;
  handNumber: number;
  activeSeat: number | null;
  dealerCards: Card[];
  shoe: Card[];
  seats: SeatState[];
}

/**
 * Ce que produit une transition. Volontairement DESCRIPTIF et non appliqué :
 * `nextPhase` calcule, `applyTransition` écrit. C'est ce qui rend toute la
 * boucle de manche testable sans base.
 */
export interface Transition {
  phase: CasinoPhaseValue;
  /** Délai avant la prochaine échéance, ou null si la phase attend le joueur. */
  deadlineMs: number | null;
  activeSeat: number | null;
  dealerCards: Card[];
  shoe: Card[];
  seats: SeatState[];
  handNumber: number;
  /** Sièges à créditer (paiements). Vide hors de l'entrée dans SETTLED. */
  credits: { seatId: string; userId: string; amount: number; handNumber: number }[];
  /** Ids des sièges à supprimer (départ, AFK). */
  evict: string[];
}

// ── Vue client (sérialisée) ───────────────────────────────────────────────

export interface SeatView {
  seat: number;
  userId: string;
  username: string;
  level: number;
  bet: number;
  hands: BjHand[];
  activeHand: number;
  /** A misé pour la manche en cours (donc sera servi). */
  hasBet: boolean;
  lastResult: SeatResult | null;
  leaving: boolean;
  /** Vrai pour le siège du spectateur courant. */
  isYou: boolean;
}

export interface DealerView {
  /** `null` = carte cachée, littéralement ABSENTE du payload avant DEALER. */
  cards: (Card | null)[];
  /** Total des seules cartes visibles. */
  visibleTotal: number;
  soft: boolean;
  bust: boolean;
  blackjack: boolean;
}

export interface CasinoTableView {
  code: string;
  game: string;
  mode: TableMode;
  phase: CasinoPhaseValue;
  handNumber: number;
  /** Garde optimiste : le client la renvoie dans chacune de ses actions. */
  version: number;
  /** Échéance absolue (epoch ms), ou null si la phase attend le joueur. */
  phaseDeadlineMs: number | null;
  /** Horloge SERVEUR : le client calcule son décompte relativement à elle. */
  serverNowMs: number;
  activeSeat: number | null;
  minBet: number;
  maxSeats: number;
  cardBack: string;
  /** Un COMPTE de cartes restantes — jamais leur contenu. */
  shoeRemaining: number;
  dealer: DealerView;
  seats: SeatView[];
  /** Solde à jour du spectateur, pour ne pas refetch tout l'arbre RSC. */
  yourCoins: number;
}
