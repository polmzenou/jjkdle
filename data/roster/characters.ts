import type { CategoryId } from "./categories";
import rosterData from "./characters.json";

/**
 * Types du roster + données de SEED.
 *
 * La source de vérité au runtime est désormais la base (table `Character`,
 * éditable via /admin, lue par `lib/content/queries.ts`). Ce fichier ne sert
 * plus qu'à : (1) typer le roster, (2) fournir les données initiales au seed
 * (`prisma/seed.ts` importe `ROSTER`), (3) servir de fixture aux tests.
 * `characters.json` reste la donnée d'amorçage, ré-exportée typée ci-dessous.
 *
 * `ratings` est PARTIEL : la présence d'une clé = le personnage est éligible à
 * cette catégorie. L'absence = il ne sera jamais tiré dans cette catégorie.
 * Les notes vont de 0 à 100 (0 = éligible mais 0 point, ex. Toji/Maki en énergie).
 *
 * `tier` est un champ de flavor (rang canonique) ; il n'influence ni le score ni
 * la couleur des cartes. `image` pointe vers un fichier de public/assets/characters/
 * (sinon : initiales en placeholder, aucun visuel officiel copyrighté).
 */

export type CharacterTier = "4minus" | "4" | "3" | "2" | "1" | "s";

export interface Character {
  id: string;
  name: string;
  /** Étiquette de flavor affichée sur la carte (ex. "Special Grade"). */
  title: string;
  /** Tier visuel de la carte (n'influence pas le score). */
  tier: CharacterTier;
  /**
   * Chemin de l'image du personnage (dans public/, ex. "/assets/characters/gojo.png").
   * Si absent, la carte affiche les initiales en placeholder.
   */
  image?: string;
  /** Notes 0–100 par catégorie. Clé présente = éligible à la catégorie. */
  ratings: Partial<Record<CategoryId, number>>;
  /**
   * Score de combat utilisé par le jeu « JJK Random Battle » (cumul de fin de
   * partie). Optionnel : absent côté builder, qui l'ignore complètement. Si non
   * défini, le battle applique une valeur de secours (30).
   */
  battleValue?: number;
}

// Le JSON est validé/écrit par la couche admin ; cast direct vers le type métier.
export const ROSTER: Character[] = rosterData as unknown as Character[];

/** Accès rapide à un personnage par son ID. */
export const CHARACTER_BY_ID: Record<string, Character> = Object.fromEntries(
  ROSTER.map((c) => [c.id, c]),
);
