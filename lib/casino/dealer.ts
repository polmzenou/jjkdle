import { draw, type Card } from "./cards";
import { handValue } from "./hand";

/**
 * Jeu du CROUPIER. Module PUR.
 *
 * Règle de la maison retenue : le croupier tire à moins de 17 et **RESTE SUR
 * TOUS LES 17**, y compris un 17 soft (A+6). C'est la variante « dealer stands
 * on all 17 », légèrement plus favorable au joueur que « hits soft 17 » — et
 * c'est un choix, pas un défaut : la variante alternative se coderait
 * `total < 17 || (total === 17 && soft)`.
 */

/** Le croupier doit-il tirer une carte de plus ? */
export function dealerShouldHit(cards: readonly Card[]): boolean {
  return handValue(cards).total < 17;
}

/**
 * Déroule tout le jeu du croupier d'un coup, jusqu'à ce qu'il reste ou saute.
 *
 * En un seul appel plutôt que carte par carte : le croupier n'a aucune décision
 * à prendre, donc rien ne justifierait un aller-retour serveur par carte. Le
 * client anime la séquence à partir de la main finale.
 */
export function playDealer(
  cards: readonly Card[],
  shoe: readonly Card[],
): { cards: Card[]; shoe: Card[] } {
  let hand = [...cards];
  let rest = [...shoe];
  // Borne dure : une main de blackjack ne peut pas dépasser une dizaine de
  // cartes (que des as et des 2). Elle ne sert qu'à rendre la boucle
  // manifestement terminante, jamais atteinte en pratique.
  for (let i = 0; i < 24 && dealerShouldHit(hand); i++) {
    const pulled = draw(rest, 1);
    hand = [...hand, ...pulled.cards];
    rest = pulled.shoe;
  }
  return { cards: hand, shoe: rest };
}
