import { DECK_COUNT } from "./rules";

/**
 * Cartes à jouer standard. Module PUR.
 *
 * Une carte est une CHAÎNE DE 2 CARACTÈRES : rang puis couleur — `"AS"` (as de
 * pique), `"TD"` (10 de carreau), `"9H"` (9 de cœur). Ce format est délibéré :
 * un sabot de 312 cartes tient en un `Json` compact, il se compare et se
 * sérialise sans objet intermédiaire, et il se lit à l'œil nu dans la base quand
 * on débugue une main.
 */

export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
export type Suit = "S" | "H" | "D" | "C";
/** Rang + couleur, ex. "AS". Non typé plus finement : c'est du Json en base. */
export type Card = string;

export const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];
export const SUITS: Suit[] = ["S", "H", "D", "C"];

/** Symbole d'affichage d'une couleur. */
export const SUIT_SYMBOL: Record<Suit, string> = {
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
};

/** Une couleur rouge s'affiche en rouge (cœur, carreau). */
export function isRedSuit(suit: string): boolean {
  return suit === "H" || suit === "D";
}

/** Découpe une carte en rang + couleur. */
export function parseCard(card: Card): { rank: Rank; suit: Suit } {
  return { rank: card[0] as Rank, suit: card[1] as Suit };
}

/**
 * Valeur d'une carte au blackjack. L'as vaut 11 ICI, systématiquement : sa
 * rétrogradation à 1 est une décision qui appartient à la MAIN, pas à la carte
 * (cf. `handValue` dans ./hand).
 */
export function cardValue(card: Card): number {
  const rank = card[0];
  if (rank === "A") return 11;
  if (rank === "T" || rank === "J" || rank === "Q" || rank === "K") return 10;
  return Number(rank);
}

/** Un jeu de 52 cartes, dans l'ordre. */
export function newDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) deck.push(`${rank}${suit}`);
  }
  return deck;
}

/** Mélange de Fisher-Yates (copie), même forme que les autres jeux du repo. */
export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Sabot mélangé de `decks` jeux (6 par défaut). */
export function newShoe(decks: number = DECK_COUNT): Card[] {
  const cards: Card[] = [];
  for (let i = 0; i < decks; i++) cards.push(...newDeck());
  return shuffle(cards);
}

/** Taille d'un sabot neuf — sert au seuil de rebattage. */
export function fullShoeSize(decks: number = DECK_COUNT): number {
  return decks * 52;
}

/**
 * Tire `count` cartes par l'AVANT du sabot et renvoie le sabot restant.
 *
 * Le sabot n'est jamais muté : toute la machine à états est composée de
 * fonctions pures, ce qui permet de rejouer une transition après un crash sans
 * risquer de tirer des cartes différentes (cf. engine.ts).
 *
 * Si le sabot est à sec en pleine main — impossible en pratique avec 6 jeux et
 * 5 joueurs, mais la base peut contenir n'importe quoi — on en reconstitue un
 * plutôt que de renvoyer des `undefined` qui casseraient le calcul de main.
 */
export function draw(
  shoe: readonly Card[],
  count: number,
): { cards: Card[]; shoe: Card[] } {
  let rest = [...shoe];
  const cards: Card[] = [];
  for (let i = 0; i < count; i++) {
    if (rest.length === 0) rest = newShoe();
    cards.push(rest.shift()!);
  }
  return { cards, shoe: rest };
}
