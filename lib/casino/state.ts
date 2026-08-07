import "server-only";
import type { Card } from "./cards";
import { handValue, isBlackjack } from "./hand";
import { hasBet } from "./machine";
import type { TableWithSeats } from "./store";
import type {
  BjHand,
  CasinoPhaseValue,
  CasinoTableView,
  DealerView,
  SeatResult,
  SeatState,
  SeatView,
  TableMode,
  TableState,
} from "./types";

/**
 * Traduction entre la ligne en base et les deux formes qu'elle prend :
 * l'état interne consommé par la machine (`toMachineState`) et la vue envoyée au
 * client (`serializeTable`).
 *
 * ⚠️ `serializeTable` est le SEUL endroit du code où une table devient une
 * donnée client. Tout ce qui doit rester secret doit être retiré ICI, et
 * nulle part ailleurs — même discipline que `CodenamesGame.colorKey`, qui n'est
 * jamais diffusé tant que la partie est active. Deux secrets à protéger :
 *
 *   1. Le SABOT : jamais envoyé, réduit à un compte de cartes restantes.
 *      L'envoyer donnerait la suite exacte de la partie.
 *   2. La CARTE CACHÉE du croupier : littéralement remplacée par `null` avant la
 *      phase DEALER. Pas chiffrée, pas obfusquée — absente. Un client qui
 *      inspecte la réponse réseau ne peut pas la deviner parce qu'elle n'y est
 *      pas.
 *
 * Note : les sièges n'affichent PAS d'avatar. Les avatars viennent de
 * `UserUniverseProfile` (donc d'un univers), et le casino n'en a pas. Pseudo et
 * niveau, tous deux globaux, suffisent à identifier un joueur à la table.
 */

/** Les mains stockées en Json, avec un repli sûr si la colonne est vide. */
function readHands(value: unknown): BjHand[] {
  return Array.isArray(value) ? (value as BjHand[]) : [];
}

function readCards(value: unknown): Card[] {
  return Array.isArray(value) ? (value as Card[]) : [];
}

/** Convertit une ligne + ses sièges en état consommable par la machine. */
export function toMachineState(table: TableWithSeats): TableState {
  return {
    mode: table.mode as TableMode,
    phase: table.phase as CasinoPhaseValue,
    handNumber: table.handNumber,
    activeSeat: table.activeSeat,
    dealerCards: readCards(table.dealerCards),
    shoe: readCards(table.shoe),
    seats: table.seats.map(
      (seat): SeatState => ({
        id: seat.id,
        seat: seat.seat,
        userId: seat.userId,
        username: seat.user.username,
        level: seat.user.level,
        hands: readHands(seat.hands),
        activeHand: seat.activeHand,
        bet: seat.bet,
        betHandNumber: seat.betHandNumber,
        settledHandNumber: seat.settledHandNumber,
        lastResult: (seat.lastResult as SeatResult | null) ?? null,
        missedRounds: seat.missedRounds,
        leaving: seat.leaving,
      }),
    ),
  };
}

/** La carte cachée est-elle encore secrète à cette phase ? */
function holeCardHidden(phase: CasinoPhaseValue): boolean {
  return phase === "BETTING" || phase === "DEALING" || phase === "PLAYER_TURNS";
}

/**
 * Vue du croupier. Avant la phase DEALER, seule l'upcard existe et le total
 * annoncé ne compte QUE cette carte — sinon le total trahirait la carte cachée.
 */
function dealerView(cards: Card[], phase: CasinoPhaseValue): DealerView {
  if (holeCardHidden(phase) && cards.length > 0) {
    const upcard = cards[0];
    const visible = handValue([upcard]);
    return {
      cards: [upcard, ...cards.slice(1).map(() => null)],
      visibleTotal: visible.total,
      soft: visible.soft,
      bust: false,
      blackjack: false,
    };
  }
  const value = handValue(cards);
  return {
    cards: [...cards],
    visibleTotal: value.total,
    soft: value.soft,
    bust: value.total > 21,
    blackjack: isBlackjack(cards),
  };
}

/**
 * Snapshot client d'une table.
 *
 * `serverNowMs` accompagne toujours `phaseDeadlineMs` : l'horloge du navigateur
 * peut être décalée de plusieurs minutes, donc le client ne doit jamais comparer
 * l'échéance à son propre `Date.now()`. Il calcule un DELTA à partir de
 * l'horloge serveur — même contrat que components/Countdown.tsx.
 */
export function serializeTable(
  table: TableWithSeats,
  viewerId: string | null,
  options: { cardBack: string; yourCoins: number },
): CasinoTableView {
  const phase = table.phase as CasinoPhaseValue;
  const seats: SeatView[] = table.seats.map((seat) => ({
    seat: seat.seat,
    userId: seat.userId,
    username: seat.user.username,
    level: seat.user.level,
    bet: seat.bet,
    hands: readHands(seat.hands),
    activeHand: seat.activeHand,
    hasBet: seat.betHandNumber === table.handNumber && seat.bet > 0,
    lastResult: (seat.lastResult as SeatResult | null) ?? null,
    leaving: seat.leaving,
    isYou: viewerId !== null && seat.userId === viewerId,
  }));

  return {
    code: table.code,
    game: table.game,
    mode: table.mode as TableMode,
    phase,
    handNumber: table.handNumber,
    version: table.version,
    phaseDeadlineMs: table.phaseDeadline ? table.phaseDeadline.getTime() : null,
    serverNowMs: Date.now(),
    activeSeat: table.activeSeat,
    minBet: table.minBet,
    maxSeats: table.maxSeats,
    cardBack: options.cardBack,
    // Un COMPTE, pas le contenu : savoir qu'il reste 180 cartes n'aide personne
    // à deviner lesquelles.
    shoeRemaining: readCards(table.shoe).length,
    dealer: dealerView(readCards(table.dealerCards), phase),
    seats,
    yourCoins: options.yourCoins,
  };
}

/** Le siège du joueur à cette table, ou null s'il n'y est pas assis. */
export function seatOf(
  table: TableWithSeats,
  userId: string,
): TableWithSeats["seats"][number] | null {
  return table.seats.find((seat) => seat.userId === userId) ?? null;
}

/** Ce siège a-t-il misé pour la manche en cours ? (réexport lisible) */
export function seatHasBet(
  seat: { betHandNumber: number; bet: number },
  handNumber: number,
): boolean {
  return hasBet(seat as SeatState, handNumber);
}
