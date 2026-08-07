import { cardValue, type Card } from "./cards";

/**
 * Évaluation d'une main de blackjack. Module PUR.
 */

export interface HandValue {
  /** Meilleur total ne dépassant pas 21 si c'est possible. */
  total: number;
  /** Vrai si un as compte encore 11 (main « soft » : elle ne peut pas sauter). */
  soft: boolean;
}

/**
 * Valeur d'une main.
 *
 * Tous les as valent d'abord 11, puis on les rétrograde à 1 UN PAR UN tant que
 * le total dépasse 21. C'est la formulation la plus courte du « meilleur total
 * possible » : rétrograder un as de plus que nécessaire ferait perdre des mains
 * (A+6 vaut 17, pas 7).
 *
 * `soft` dit s'il reste un as compté 11 — ce qui signifie qu'une carte de plus
 * ne peut pas faire sauter la main, et c'est aussi ce qui distingue un 17 soft
 * d'un 17 dur pour le croupier.
 */
export function handValue(cards: readonly Card[]): HandValue {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    const value = cardValue(card);
    total += value;
    if (value === 11) aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return { total, soft: aces > 0 };
}

/**
 * Blackjack NATUREL : 21 en EXACTEMENT deux cartes.
 *
 * La distinction compte doublement : un naturel paie 3:2 là où un 21 en trois
 * cartes paie 1:1, et il bat un 21 ordinaire.
 */
export function isBlackjack(cards: readonly Card[]): boolean {
  return cards.length === 2 && handValue(cards).total === 21;
}

/** La main dépasse 21. */
export function isBust(cards: readonly Card[]): boolean {
  return handValue(cards).total > 21;
}

/**
 * Peut-on doubler ? Uniquement sur les DEUX premières cartes, une seule fois, et
 * jamais sur un blackjack (doubler un 3:2 pour un 1:1 n'aurait aucun sens).
 */
export function canDouble(cards: readonly Card[], doubled: boolean): boolean {
  return cards.length === 2 && !doubled && !isBlackjack(cards);
}
