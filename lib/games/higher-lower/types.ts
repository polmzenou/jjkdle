/**
 * Types & logique pure du jeu « Higher/Lower ».
 *
 * Module PUR (aucune dépendance React/Prisma) : réutilisable côté client, côté
 * serveur (anti-triche) et par les tests. Le principe : deux personnages, on
 * devine si celui de DROITE a plus (`higher`) ou moins (`lower`) que celui de
 * GAUCHE sur l'attribut comparé de l'univers.
 *
 * L'attribut comparé est DATA-DRIVEN (cf. `UniverseConfig.higherLower`) :
 *  - JJK  : `cursedEnergy`, attribut NUMERIC → la valeur comparée EST le nombre
 *           affiché sur la carte ;
 *  - CSM  : `csmpower` (« Puissance »), attribut ORDINAL → la valeur comparée est
 *           le RANG de l'option (Minimum < Peu < … < Surpuissant) et la carte
 *           affiche son libellé.
 *
 * Un attribut ORDINAL n'a qu'une poignée de rangs : deux personnages tombent
 * souvent sur le même. D'où le `tiebreak` (= `Character.battleValue`), qui
 * départage les ex æquo. Les paires où même le départage est ex æquo ne sont
 * JAMAIS tirées (cf. `pickRight`) : elles n'auraient pas de bonne réponse.
 */

export type HLChoice = "higher" | "lower";

/** Couple (valeur comparée, départage) — ce sur quoi porte toute comparaison. */
export interface HLValue {
  /** Valeur NUMERIC du perso, ou rang de son option ORDINAL. */
  value: number;
  /** Départage des ex æquo (`Character.battleValue`). 0 = non renseigné. */
  tiebreak: number;
}

/** Personnage du pool (usage SERVEUR uniquement — porte la valeur réelle). */
export interface HLCharacter extends HLValue {
  id: string;
  name: string;
  image?: string;
  /** Libellé affiché de la valeur : « 87 » (NUMERIC) / « Puissant » (ORDINAL). */
  valueLabel: string;
}

/** Pool d'une partie : les personnages jouables + le libellé de l'attribut. */
export interface HLPool {
  /** Libellé de l'attribut comparé, tel que défini en base (« Puissance »). */
  attributeLabel: string;
  characters: HLCharacter[];
}

/** Carte de gauche : valeur RÉVÉLÉE (déjà devinée / point de comparaison). */
export interface HLRevealedCard extends HLValue {
  id: string;
  name: string;
  image?: string;
  valueLabel: string;
}

/** Carte de droite : valeur MASQUÉE — jamais envoyée au client avant réponse. */
export interface HLHiddenCard {
  id: string;
  name: string;
  image?: string;
}

/** Vue d'un tour envoyée au client (droite sans sa valeur). */
export interface HLTurnView {
  score: number;
  left: HLRevealedCard;
  right: HLHiddenCard;
}

/** Valeur du perso de droite, RÉVÉLÉE après la réponse (pour l'animation). */
export interface HLReveal extends HLValue {
  valueLabel: string;
}

/** Réponse du serveur après un choix. */
export interface HLGuessResult {
  correct: boolean;
  revealed: HLReveal;
  score: number;
  /** Tour suivant si bonne réponse et partie non terminée. */
  next?: HLTurnView;
  gameOver: boolean;
}

/**
 * Ordonne deux personnages : `> 0` si `a` passe devant `b`. La valeur comparée
 * prime ; à égalité, c'est le départage (`battleValue`) qui tranche. `0` =
 * strictement indépartageables — situation exclue en amont par la pioche.
 */
export function compareHL(a: HLValue, b: HLValue): number {
  return a.value - b.value || a.tiebreak - b.tiebreak;
}

/**
 * Réponse correcte pour un tour donné. Le `0` (ex æquo jusqu'au départage) est
 * exclu EN AMONT par la repioche (cf. store.ts) ; si par sécurité il survient,
 * on accepte les deux réponses plutôt que de sanctionner un choix impossible.
 */
export function computeCorrect(
  left: HLValue,
  right: HLValue,
  choice: HLChoice,
): boolean {
  const delta = compareHL(right, left);
  if (delta === 0) return true; // garde-fou : jamais atteint en pratique
  return choice === (delta > 0 ? "higher" : "lower");
}

/**
 * XP octroyée en fin de partie, proportionnelle au score, avec un bonus par
 * palier de 5 bonnes réponses (formule de la spec).
 */
export function xpForScore(score: number): number {
  const s = Math.max(0, Math.floor(score));
  return s * 10 + Math.floor(s / 5) * 25;
}
