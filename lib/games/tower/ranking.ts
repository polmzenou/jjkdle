/**
 * Règle de classement de la Tour — module PUR.
 *
 * Extraite parce qu'elle s'est révélée fausse en production : un joueur qui
 * avait atteint l'étage 12 à son deuxième essai voyait « 7 » au classement,
 * l'étage de son PREMIER essai. Le tri comparait le nombre d'essais avant
 * l'étage atteint, si bien qu'un essai précoce et raté battait un essai tardif
 * et abouti.
 *
 * Le nombre d'essais ne départage QUE des runs bouclées : c'est là qu'il
 * signifie « il lui en a fallu moins ». Entre deux runs inachevées, il ne veut
 * rien dire — seule compte la hauteur atteinte.
 *
 * La règle vit ici, seule, et sert aux DEUX endroits qui trient : la requête
 * SQL (qui retient la meilleure ligne par joueur) et le tri final en mémoire.
 */

export interface TowerRankable {
  cleared: boolean;
  /** N° d'essai du jour auquel ce résultat a été obtenu. */
  attempt: number;
  floor: number;
  score: number;
  createdAt: Date;
}

/**
 * Compare deux résultats : négatif si `a` passe devant `b`.
 *
 *  1. avoir bouclé la tour l'emporte toujours ;
 *  2. entre deux runs BOUCLÉES : le moins d'essais, puis le meilleur score ;
 *  3. entre deux runs INACHEVÉES : l'étage le plus haut, puis le score ;
 *  4. à égalité parfaite, le plus ancien — celui qui y est arrivé le premier.
 */
export function compareTowerRuns(a: TowerRankable, b: TowerRankable): number {
  if (a.cleared !== b.cleared) return a.cleared ? -1 : 1;

  if (a.cleared) {
    return (
      a.attempt - b.attempt ||
      b.score - a.score ||
      a.createdAt.getTime() - b.createdAt.getTime()
    );
  }

  return (
    b.floor - a.floor ||
    b.score - a.score ||
    a.createdAt.getTime() - b.createdAt.getTime()
  );
}

/**
 * Le même ordre, en SQL, pour le `DISTINCT ON ("userId")` qui retient la
 * meilleure ligne de chaque joueur.
 *
 * ⚠️ Doit rester le MIROIR EXACT de `compareTowerRuns`. Le `CASE` neutralise le
 * nombre d'essais pour les runs inachevées — c'était précisément le bug : sans
 * lui, l'essai n°1 d'un joueur battait son essai n°2 même s'il était monté deux
 * fois moins haut.
 */
export const TOWER_BEST_ORDER_SQL = `
  "cleared" DESC,
  CASE WHEN "cleared" THEN "attempt" ELSE 0 END ASC,
  "floor" DESC,
  "score" DESC,
  "createdAt" ASC
`;
