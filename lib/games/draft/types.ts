/**
 * Types du jeu « Jujutsu Draft ».
 *
 * Tout est pur (aucune dépendance React/Prisma) pour rester réutilisable côté
 * client, côté serveur (anti-triche) et par un futur mode multijoueur.
 */

/**
 * Seuils de viabilité du roster de draft : en dessous, `getDraftRoster` retombe
 * sur la liste maître en code pour que le jeu reste jouable.
 *
 * Définis ICI (module pur) et non dans `queries.ts` : l'admin les affiche depuis
 * un composant CLIENT, qui ne doit pas importer un module serveur (`queries.ts`
 * tire Prisma et la résolution d'univers, donc `next/headers`).
 */
export const MIN_DRAFT_ROSTER = 40;
export const MIN_DRAFT_TIER_C = 8;

/**
 * Identifiant d'une catégorie du plateau = **slug de la `Category`** du builder
 * dans l'univers courant (`souffle`, `kagune`, `hax`…).
 *
 * C'était naguère une union figée des huit axes de Jujutsu Kaisen, qui
 * s'affichait telle quelle sur les cinq autres animes. Une chaîne libre : la
 * liste effective vit en base et est résolue par `getDraftCategories`.
 */
export type DraftCategoryId = string;

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
  /**
   * Personnage du roster dont cette carte est dérivée (import automatique).
   *
   * Un même personnage alimente PLUSIEURS catégories (une carte par catégorie
   * où il est noté) : sans cette clé, rien n'empêcherait de le drafter deux
   * fois dans la même équipe, une fois par ligne où il apparaît. Absent sur les
   * cartes écrites à la main, dont l'`id` fait alors office d'identité.
   */
  sourceId?: string;
}

/** Identité de PERSONNE d'une carte : `sourceId` s'il existe, sinon son `id`. */
export function personOf(character: DraftCharacter): string {
  return character.sourceId ?? character.id;
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
