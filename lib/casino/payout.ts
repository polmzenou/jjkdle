import type { Card } from "./cards";
import { handValue, isBlackjack } from "./hand";
import type { BjHand, HandResult, SeatResult, SeatState } from "./types";

/**
 * Résolution des mains et calcul des gains. Module PUR.
 *
 * ⚠️ CONVENTION CENTRALE : `payout` est le TOTAL RECRÉDITÉ AU JOUEUR, MISE
 * INCLUSE. La mise a déjà été débitée du solde au moment de miser (cf.
 * `placeBetAction`), donc un push doit rendre `bet` — pas 0 — et un gain simple
 * rend `2 × bet`, dont la moitié n'est que la restitution de la mise.
 *
 * Se tromper ici est l'erreur classique du blackjack : compter le payout en
 * GAIN NET tout en ayant déjà débité la mise revient à voler le joueur à chaque
 * main gagnée. Les tests de payout.test.ts verrouillent cette convention.
 */

/** Ce que rapporte un blackjack naturel : 3:2, soit 2,5 × la mise au total. */
const BLACKJACK_MULTIPLIER = 2.5;

/**
 * Résout UNE main contre celle du croupier.
 *
 * L'ordre des comparaisons compte : le bust du joueur est perdant même si le
 * croupier saute ensuite. C'est l'avantage de la maison, et c'est la seule
 * raison pour laquelle le casino gagne de l'argent au blackjack.
 */
export function resolveHand(hand: BjHand, dealerCards: readonly Card[]): HandResult {
  const bet = hand.bet;
  const player = handValue(hand.cards);
  const dealer = handValue(dealerCards);
  const playerBj = isBlackjack(hand.cards);
  const dealerBj = isBlackjack(dealerCards);

  const result = (outcome: HandResult["outcome"], payout: number): HandResult => ({
    outcome,
    payout: Math.floor(payout),
    net: Math.floor(payout) - bet,
  });

  // 1. Le joueur saute : perdu, quoi que fasse le croupier ensuite.
  if (player.total > 21) return result("LOSE", 0);

  // 2. Blackjacks naturels. Deux naturels se poussent ; un naturel seul paie 3:2
  //    et bat un 21 en trois cartes ou plus.
  if (playerBj && dealerBj) return result("PUSH", bet);
  if (playerBj) return result("BLACKJACK", bet * BLACKJACK_MULTIPLIER);
  if (dealerBj) return result("LOSE", 0);

  // 3. Le croupier saute : toutes les mains encore debout gagnent.
  if (dealer.total > 21) return result("WIN", bet * 2);

  // 4. Comparaison des totaux.
  if (player.total > dealer.total) return result("WIN", bet * 2);
  if (player.total === dealer.total) return result("PUSH", bet);
  return result("LOSE", 0);
}

/** Résout toutes les mains d'un siège et agrège son bilan de manche. */
export function resolveSeat(
  seat: SeatState,
  dealerCards: readonly Card[],
): SeatResult {
  const hands = seat.hands.map((hand) => resolveHand(hand, dealerCards));
  return {
    hands,
    net: hands.reduce((sum, hand) => sum + hand.net, 0),
  };
}

/** Total à recréditer au siège (somme des payouts, mises incluses). */
export function seatPayout(result: SeatResult): number {
  return result.hands.reduce((sum, hand) => sum + hand.payout, 0);
}

/** Total misé par un siège sur la manche (pour les stats de la maison). */
export function seatWagered(seat: SeatState): number {
  return seat.hands.reduce((sum, hand) => sum + hand.bet, 0);
}
