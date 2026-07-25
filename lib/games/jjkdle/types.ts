/**
 * Types du jeu JJKdle (module pur, partagé client/serveur).
 */

/**
 * Statut d'un indice par attribut :
 *  - correct : valeur identique à la cible (vert)
 *  - wrong   : valeur différente (rouge/gris)
 *  - close   : numérique proche de la cible dans la tolérance (orange)
 * Pour les attributs ordonnés (grade, arc, cursedEnergy), `direction` indique
 * où se situe la cible par rapport à la proposition.
 */
export type HintStatus = "correct" | "wrong" | "close";
export type HintDirection = "up" | "down" | null;

/**
 * Colonne de la grille telle qu'elle est transmise au CLIENT : le strict
 * nécessaire au rendu (en-tête + infobulle), sérialisable. Dérivée du schéma
 * d'attributs de l'univers courant côté serveur — le nombre de colonnes varie
 * donc d'un univers à l'autre.
 */
export interface AttributeColumn {
  key: string;
  label: string;
}

export interface AttributeHint {
  /** Clé de l'attribut comparé (définie par univers, cf. attribute-schema.ts). */
  key: string;
  status: HintStatus;
  /** Libellé affichable de la valeur proposée (ex. "Grade Spécial", "120", "?"). */
  display: string;
  /** Flèche pour les attributs ordonnés : la cible est plus haute (up) / basse (down). */
  direction: HintDirection;
}

export interface GuessRow {
  characterId: string;
  characterName: string;
  /** URL d'image du perso proposé (pour la colonne avatar). */
  image?: string;
  hints: AttributeHint[];
}

export type GameStatus = "playing" | "won";
export type GameMode = "daily" | "admin" | "vip";

/** Nombre maximum de parties bonus quotidiennes pour un joueur VIP. */
export const VIP_MAX_REPLAYS = 8;

/** Résultat renvoyé au client après une proposition. */
export interface GuessResult {
  ok: boolean;
  error?: string;
  row?: GuessRow;
  status?: GameStatus;
  attempts?: number;
  /** Perso révélé uniquement quand la partie est gagnée. */
  revealed?: { id: string; name: string; title: string; image?: string } | null;
}
