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

/** Les 6 tiers, dans l'ordre canonique (du plus faible au plus fort). */
export const CHARACTER_TIERS: CharacterTier[] = [
  "4minus",
  "4",
  "3",
  "2",
  "1",
  "s",
];

/**
 * Ramène un tier écrit à la main / importé sur sa forme canonique, ou `null`.
 *
 * Indispensable des DEUX côtés (formulaire admin et validation serveur) : le
 * `<select>` de l'admin n'a d'option que pour ces 6 valeurs exactes. Une ligne
 * portant « S » majuscule ne correspondait à aucune option — le navigateur
 * affichait la première (« s ») pendant que l'état gardait « S », et
 * l'enregistrement était refusé avec « Tier invalide » sur une fiche qui
 * paraissait pourtant correcte.
 */
export function normalizeTier(raw: unknown): CharacterTier | null {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (value === "4-" || value === "4moins") return "4minus";
  return (CHARACTER_TIERS as string[]).includes(value)
    ? (value as CharacterTier)
    : null;
}

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

  /**
   * Attributs du personnage, DATA-DRIVEN et propres à l'univers (étape 3) :
   * `clé d'attribut → valeur`, où une valeur d'option est une `string` et un
   * attribut NUMERIC un `number`. Clé absente = attribut NON RENSEIGNÉ.
   *
   * Alimentent JJKdle (grille d'indices, éligibilité au pool quotidien) et
   * Higher/Lower. Le schéma qui donne le sens de ces clés vit en base par univers
   * (cf. lib/games/jjkdle/attribute-schema.ts, amorcé par
   * lib/universes/jjk-attributes.ts). Remplis via /admin, absents du seed.
   */
  attributes?: Record<string, string | number>;
}

// Le JSON est validé/écrit par la couche admin ; cast direct vers le type métier.
export const ROSTER: Character[] = rosterData as unknown as Character[];

/** Accès rapide à un personnage par son ID. */
export const CHARACTER_BY_ID: Record<string, Character> = Object.fromEntries(
  ROSTER.map((c) => [c.id, c]),
);
