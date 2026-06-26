/**
 * Types du jeu « Jujutsu Draft ».
 *
 * Tout est pur (aucune dépendance React/Prisma) pour rester réutilisable côté
 * client, côté serveur (anti-triche) et par un futur mode multijoueur.
 */

/** Les 8 catégories de stats du draft (slugs kebab, façon repo). */
export type DraftCategoryId =
  | "occult-energy"
  | "physical-strength"
  | "speed"
  | "battle-iq"
  | "innate-technique"
  | "domain-expansion"
  | "black-flash"
  | "teammate";

/** Tier du draft (échelle propre, distincte du roster builder). */
export type DraftTier = "S" | "A" | "B" | "C";

export interface DraftCharacter {
  id: string;
  name: string;
  /** Chemin statique (/assets/...) ou undefined → placeholder (initiales). */
  image?: string;
  /** Catégorie d'excellence : bonus de placement si draftÉ ici. */
  excellenceCategory: DraftCategoryId;
  tier: DraftTier;
  /** Coût en points de budget. */
  cost: number;
  /** Valeur de stat de base (contribue au score global caché). */
  statValue: number;
}

/** Sélection du joueur : un id de perso par catégorie (8 quand complète). */
export type DraftSelection = Partial<Record<DraftCategoryId, string>>;

/** Tirage : 5 personnages proposés par catégorie. */
export type DraftPick = Record<DraftCategoryId, DraftCharacter[]>;

export interface Boss {
  id: string;
  name: string;
  image?: string;
  /** Seuil de score global caché à dépasser pour le vaincre. */
  threshold: number;
}

export type DraftOutcome = "VICTORY" | "DEFEAT";

/** Résultat d'un duel, consommé par l'animation (sans exposer de score chiffré). */
export interface DuelResult {
  boss: Boss;
  /** Le joueur a-t-il vaincu ce boss ? */
  survived: boolean;
  /**
   * Marge = scoreGlobal − seuil (peut être négative). Sert UNIQUEMENT à doser
   * l'animation (ex. Black Flash si marge large) ; jamais affichée telle quelle.
   */
  margin: number;
}

export interface CombatResult {
  /** Score global caché final — logique/serveur uniquement, jamais rendu. */
  globalScore: number;
  enemiesKilled: number;
  outcome: DraftOutcome;
  /** Déroulé boss par boss (s'arrête au 1er boss non vaincu). */
  duels: DuelResult[];
}
