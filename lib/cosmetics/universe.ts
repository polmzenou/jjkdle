/**
 * Portée d'UNIVERS d'un cosmétique (multi-univers, étape 2d).
 *
 * Les cosmétiques (badges, titres, cadres, bannières) restent définis en CODE :
 * chaque définition porte désormais le slug de l'univers qui la possède. Deux
 * conséquences, et deux seulement :
 *   - l'AFFICHAGE : un sélecteur/vitrine ne montre que le catalogue de l'univers
 *     courant (un titre CSM n'apparaît pas sur JJK) ;
 *   - l'ÉQUIPEMENT : le serveur refuse une clé qui n'appartient pas à l'univers
 *     courant (en plus de la validation de déblocage existante).
 *
 * La POSSESSION reste GLOBALE et inchangée (UserBadge / UserTitleGrant /
 * UserFrameGrant, cf. décision « compte global ») : un titre gagné sur JJK reste
 * acquis à vie, il n'est simplement pas équipable ailleurs.
 *
 * Module PUR (aucun import serveur) : importable depuis un composant client, qui
 * reçoit le slug de l'univers courant en prop et filtre le catalogue lui-même.
 */

/** Slug d'univers, ou `ANY_UNIVERSE` pour un cosmétique neutre. */
export type UniverseScope = string;

/**
 * Cosmétique NEUTRE : disponible dans tous les univers. Réservé aux valeurs
 * structurelles sans saveur d'anime — le cadre par défaut et la bannière
 * `default` (valeur `@default` du schéma : elle doit rester valide partout).
 */
export const ANY_UNIVERSE = "*";

/** Toute définition de cosmétique taguée par univers. */
export interface UniverseScoped {
  universe: UniverseScope;
}

/** Vrai si un cosmétique de portée `scope` est utilisable dans l'univers `slug`. */
export function isInUniverse(scope: UniverseScope, slug: string): boolean {
  return scope === ANY_UNIVERSE || scope === slug;
}

/** Sous-catalogue utilisable dans l'univers `slug` (neutres inclus). */
export function inUniverse<T extends UniverseScoped>(
  items: readonly T[],
  slug: string,
): T[] {
  return items.filter((item) => isInUniverse(item.universe, slug));
}

/**
 * Tague un catalogue mono-univers écrit sans le champ `universe` (cas des
 * catalogues JJK historiques). Un futur univers ajoute son propre tableau, tagué
 * de son slug, concaténé au même export.
 */
export function tagUniverse<T extends object>(
  items: readonly T[],
  universe: UniverseScope,
): (T & UniverseScoped)[] {
  return items.map((item) => ({ ...item, universe }));
}
