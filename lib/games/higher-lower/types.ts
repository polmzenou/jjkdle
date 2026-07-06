/**
 * Types & logique pure du jeu « JJK Higher/Lower ».
 *
 * Module PUR (aucune dépendance React/Prisma) : réutilisable côté client, côté
 * serveur (anti-triche) et par les tests. Le principe : deux personnages, on
 * devine si celui de DROITE a plus (`higher`) ou moins (`lower`) d'énergie
 * occulte (`cursedEnergy`, valeur lore du roster) que celui de GAUCHE.
 */

export type HLChoice = "higher" | "lower";

/** Personnage du pool (usage SERVEUR uniquement — porte la valeur réelle). */
export interface HLCharacter {
  id: string;
  name: string;
  image?: string;
  /** Énergie occulte lore (Character.cursedEnergy). Toujours défini dans le pool. */
  cursedEnergy: number;
}

/** Carte de gauche : valeur RÉVÉLÉE (déjà devinée / point de comparaison). */
export interface HLRevealedCard {
  id: string;
  name: string;
  image?: string;
  cursedEnergy: number;
}

/** Carte de droite : valeur MASQUÉE — jamais envoyée au client avant réponse. */
export interface HLHiddenCard {
  id: string;
  name: string;
  image?: string;
}

/** Vue d'un tour envoyée au client (droite sans `cursedEnergy`). */
export interface HLTurnView {
  score: number;
  left: HLRevealedCard;
  right: HLHiddenCard;
}

/** Réponse du serveur après un choix. */
export interface HLGuessResult {
  correct: boolean;
  /** Valeur réelle du perso de droite, RÉVÉLÉE après la réponse (pour l'anim). */
  revealedCursedEnergy: number;
  score: number;
  /** Tour suivant si bonne réponse et partie non terminée. */
  next?: HLTurnView;
  gameOver: boolean;
}

/**
 * Réponse correcte pour un tour donné. Les égalités (`leftCE === rightCE`) sont
 * exclues EN AMONT par la repioche (cf. store.ts) : ici on considère la
 * comparaison stricte. Si par sécurité l'égalité survient, on l'accepte comme
 * `higher` (jamais atteint en pratique).
 */
export function computeCorrect(
  leftCE: number,
  rightCE: number,
  choice: HLChoice,
): boolean {
  if (rightCE === leftCE) return true; // garde-fou : égalité → toute réponse OK
  const actual: HLChoice = rightCE > leftCE ? "higher" : "lower";
  return choice === actual;
}

/**
 * XP octroyée en fin de partie, proportionnelle au score, avec un bonus par
 * palier de 5 bonnes réponses (formule de la spec).
 */
export function xpForScore(score: number): number {
  const s = Math.max(0, Math.floor(score));
  return s * 10 + Math.floor(s / 5) * 25;
}
