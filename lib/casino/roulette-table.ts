import type { RouletteBetOutcome } from "./roulette";

/**
 * TABLE DE ROULETTE À PLUSIEURS — constantes, vue client et lecture des
 * colonnes Json. Module PUR (aucun import serveur) : lisible depuis le moteur,
 * le composant client et les tests.
 *
 * ── Pas de nouvelle table en base ─────────────────────────────────────────
 * La roulette réutilise `CasinoTable` / `CasinoSeat` avec `game = "roulette"`.
 * Les colonnes génériques y prennent le sens suivant :
 *
 *   CasinoTable.phase        BETTING (mises ouvertes) | SETTLED (bille lancée,
 *                            gains déjà versés, puis récapitulatif)
 *   CasinoTable.handNumber   numéro du TOUR
 *   CasinoTable.dealerCards  `WheelState` : numéro tiré + historique
 *   CasinoSeat.hands         `SeatBets`  : jetons posés + « prêt »
 *   CasinoSeat.bet           total misé sur le tour
 *   CasinoSeat.betHandNumber tour auquel appartiennent ces jetons
 *   CasinoSeat.activeHand    RÉVISION du siège (compare-and-swap des mises)
 *   CasinoSeat.settledHandNumber  tour déjà réglé (idempotence du paiement)
 *   CasinoSeat.lastResult    `RouletteSeatResult` du dernier tour réglé
 */

/** Joueurs maximum autour d'un tapis. */
export const ROULETTE_MAX_SEATS = 8;
/** Fenêtre de mise. */
export const ROULETTE_BETTING_MS = 25_000;
/** Lancer de la bille (l'animation du cylindre dure ~6,2 s). */
export const ROULETTE_SPIN_MS = 7_000;
/** Récapitulatif après l'arrêt de la bille. */
export const ROULETTE_RECAP_MS = 6_000;
/** Fenêtres de mise consécutives sans jeton avant éviction (AFK). */
export const ROULETTE_AFK_MAX = 3;
/** Numéros sortis gardés en mémoire. */
export const ROULETTE_HISTORY_MAX = 18;

export interface SeatBets {
  bets: Record<string, number>;
  ready: boolean;
}

export interface WheelState {
  /** Tour pour lequel `pocket` a été tiré (`-1` : jamais tiré). */
  round: number;
  pocket: number | null;
  /** Derniers numéros sortis, le plus récent en premier. */
  history: number[];
}

export interface RouletteSeatResult {
  round: number;
  totalBet: number;
  payout: number;
  net: number;
  /** Mise sous le minimum de la table : rendue, pas jouée. */
  refunded: boolean;
  bets: RouletteBetOutcome[];
}

export function readSeatBets(value: unknown): SeatBets {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { bets: {}, ready: false };
  }
  const raw = value as Partial<SeatBets>;
  const bets: Record<string, number> = {};
  if (raw.bets && typeof raw.bets === "object") {
    for (const [key, amount] of Object.entries(raw.bets)) {
      if (typeof amount === "number" && amount > 0) bets[key] = amount;
    }
  }
  return { bets, ready: raw.ready === true };
}

export function readWheelState(value: unknown): WheelState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { round: -1, pocket: null, history: [] };
  }
  const raw = value as Partial<WheelState>;
  return {
    round: typeof raw.round === "number" ? raw.round : -1,
    pocket: typeof raw.pocket === "number" ? raw.pocket : null,
    history: Array.isArray(raw.history)
      ? raw.history.filter((n): n is number => typeof n === "number")
      : [],
  };
}

export const sumBets = (bets: Record<string, number>) =>
  Object.values(bets).reduce((a, b) => a + b, 0);

// ── Vue client ────────────────────────────────────────────────────────────

export interface RouletteSeatView {
  seat: number;
  userId: string;
  username: string;
  level: number;
  /** Jetons du tour affiché (vide s'ils datent d'un tour précédent). */
  bets: Record<string, number>;
  total: number;
  ready: boolean;
  lastResult: RouletteSeatResult | null;
  leaving: boolean;
  isYou: boolean;
}

export interface RouletteTableView {
  code: string;
  phase: "BETTING" | "SETTLED";
  round: number;
  version: number;
  /** Échéance absolue (epoch ms) ; null pendant qu'un tick règle le tour. */
  phaseDeadlineMs: number | null;
  serverNowMs: number;
  minBet: number;
  maxSeats: number;
  /** Numéro sorti — présent UNIQUEMENT en SETTLED. */
  pocket: number | null;
  history: number[];
  seats: RouletteSeatView[];
  yourCoins: number;
}
