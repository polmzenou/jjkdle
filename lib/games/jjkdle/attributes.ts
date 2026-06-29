/**
 * Attributs JJKdle — miroir TypeScript des enums Prisma (cf. schema.prisma).
 *
 * Module PUR (aucun import serveur) : utilisable côté client ET serveur.
 * On redéclare ici les valeurs d'enum sous forme de types littéraux + tableaux
 * ordonnés, afin de :
 *   - garantir l'ORDRE pour les indices ↑/↓ (grade, arc) ;
 *   - fournir des libellés FR pour l'affichage ;
 *   - définir la complétude (`isComplete`) qui conditionne l'éligibilité au pool
 *     quotidien et l'indicateur « incomplet » dans l'admin.
 *
 * IMPORTANT : garder ces tableaux synchronisés avec `prisma/schema.prisma`.
 */

import type { Character } from "@/data/roster/characters";

// ── Types littéraux (valeurs identiques aux enums Prisma) ──────────────────

export type JjkRace = "HUMAN" | "CURSED_SPIRIT" | "SHIKIGAMI" | "CURSED_CORPSE" | "OTHER";
export type JjkGender = "MALE" | "FEMALE" | "OTHER";
export type JjkGrade =
  | "GRADE_4"
  | "SEMI_GRADE_3"
  | "GRADE_3"
  | "SEMI_GRADE_2"
  | "GRADE_2"
  | "SEMI_GRADE_1"
  | "GRADE_1"
  | "SPECIAL_GRADE";
export type JjkAffiliation =
  | "TOKYO_SCHOOL"
  | "KYOTO_SCHOOL"
  | "CULLING_GAME"
  | "SHIBUYA"
  | "CURSED_SPIRITS_FACTION"
  | "OTHER";
export type JjkClan = "ZENIN" | "KAMO" | "GOJO" | "NONE";
export type JjkArc =
  | "JJK_0"
  | "FEARSOME_WOMB"
  | "VS_MAHITO"
  | "KYOTO_GOODWILL_EVENT"
  | "DEATH_PAINTING"
  | "GOJOS_PAST"
  | "SHIBUYA_INCIDENT"
  | "ITADORI_EXTERMINATION"
  | "CULLING_GAME"
  | "SHINJUKU_SHOWDOWN"
  | "FINAL"
  | "MODULO";

// ── Listes ordonnées (ordre = celui de l'enum Prisma) ──────────────────────

export const RACES: JjkRace[] = ["HUMAN", "CURSED_SPIRIT", "SHIKIGAMI", "CURSED_CORPSE", "OTHER"];
export const GENDERS: JjkGender[] = ["MALE", "FEMALE", "OTHER"];
export const AFFILIATIONS: JjkAffiliation[] = [
  "TOKYO_SCHOOL",
  "KYOTO_SCHOOL",
  "CULLING_GAME",
  "SHIBUYA",
  "CURSED_SPIRITS_FACTION",
  "OTHER",
];
export const CLANS: JjkClan[] = ["ZENIN", "KAMO", "GOJO", "NONE"];

/** Grades du plus faible au plus fort. L'INDEX sert à l'indice ↑/↓. */
export const GRADES_ORDER: JjkGrade[] = [
  "GRADE_4",
  "SEMI_GRADE_3",
  "GRADE_3",
  "SEMI_GRADE_2",
  "GRADE_2",
  "SEMI_GRADE_1",
  "GRADE_1",
  "SPECIAL_GRADE",
];

/** Arcs dans l'ordre chronologique (= ordre de l'enum). L'INDEX sert à l'indice ↑/↓. */
export const ARCS_ORDER: JjkArc[] = [
  "JJK_0",
  "FEARSOME_WOMB",
  "VS_MAHITO",
  "KYOTO_GOODWILL_EVENT",
  "DEATH_PAINTING",
  "GOJOS_PAST",
  "SHIBUYA_INCIDENT",
  "ITADORI_EXTERMINATION",
  "CULLING_GAME",
  "SHINJUKU_SHOWDOWN",
  "FINAL",
  "MODULO",
];

// ── Libellés FR ────────────────────────────────────────────────────────────

export const RACE_LABELS: Record<JjkRace, string> = {
  HUMAN: "Humain",
  CURSED_SPIRIT: "Fléau",
  SHIKIGAMI: "Shikigami",
  CURSED_CORPSE: "Embryon maudit",
  OTHER: "Autre",
};

export const GENDER_LABELS: Record<JjkGender, string> = {
  MALE: "Homme",
  FEMALE: "Femme",
  OTHER: "Autre",
};

export const GRADE_LABELS: Record<JjkGrade, string> = {
  GRADE_4: "Grade 4",
  SEMI_GRADE_3: "Semi-grade 3",
  GRADE_3: "Grade 3",
  SEMI_GRADE_2: "Semi-grade 2",
  GRADE_2: "Grade 2",
  SEMI_GRADE_1: "Semi-grade 1",
  GRADE_1: "Grade 1",
  SPECIAL_GRADE: "Grade Spécial",
};

export const AFFILIATION_LABELS: Record<JjkAffiliation, string> = {
  TOKYO_SCHOOL: "École de Tokyo",
  KYOTO_SCHOOL: "École de Kyoto",
  CULLING_GAME: "Culling Game",
  SHIBUYA: "Shibuya",
  CURSED_SPIRITS_FACTION: "Faction des fléaux",
  OTHER: "Autre",
};

export const CLAN_LABELS: Record<JjkClan, string> = {
  ZENIN: "Zen'in",
  KAMO: "Kamo",
  GOJO: "Gojo",
  NONE: "Aucun",
};

export const ARC_LABELS: Record<JjkArc, string> = {
  JJK_0: "Jujutsu Kaisen 0",
  FEARSOME_WOMB: "Prologue",
  VS_MAHITO: "Vs Mahito",
  KYOTO_GOODWILL_EVENT: "Tournoi Tokyo-Kyoto",
  DEATH_PAINTING: "Les frères de sang",
  GOJOS_PAST: "Le passé de Gojo",
  SHIBUYA_INCIDENT: "Incident de Shibuya",
  ITADORI_EXTERMINATION: "Extermination d'Itadori",
  CULLING_GAME: "Culling Game",
  SHINJUKU_SHOWDOWN: "Bataille de Shinjuku",
  FINAL: "Dénouement",
  MODULO: "Jujutsu Kaisen Modulo",
};

// ── Tolérance énergie occulte (indice « proche » orange) ───────────────────

/** Écart |cible − proposition| sous lequel l'indice cursedEnergy passe en orange. */
export const CURSED_ENERGY_TOLERANCE = 20;

// ── Colonnes de la grille (ordre d'affichage) ──────────────────────────────

export type AttributeKey =
  | "race"
  | "gender"
  | "grade"
  | "affiliation"
  | "clan"
  | "appearanceArc"
  | "hasDomain"
  | "cursedEnergy";

export const ATTRIBUTE_COLUMNS: AttributeKey[] = [
  "race",
  "gender",
  "grade",
  "affiliation",
  "clan",
  "appearanceArc",
  "hasDomain",
  "cursedEnergy",
];

export const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  race: "Race",
  gender: "Genre",
  grade: "Grade",
  affiliation: "Affiliation",
  clan: "Clan",
  appearanceArc: "Arc",
  hasDomain: "Territoire",
  cursedEnergy: "Énergie occulte",
};

/** Attributs ordonnés : l'indice ajoute une flèche ↑/↓. */
export const ORDERED_ATTRIBUTES: AttributeKey[] = ["grade", "appearanceArc", "cursedEnergy"];

// ── Complétude (éligibilité au pool quotidien) ─────────────────────────────

/**
 * Un personnage est « complet » (donc éligible comme cible du jour) si TOUS les
 * attributs JJKdle sont renseignés. `hasDomain` est traité à part car `false`
 * est une valeur valide (≠ null = non renseigné).
 */
export function isComplete(c: Character): boolean {
  return (
    c.race != null &&
    c.gender != null &&
    c.grade != null &&
    c.affiliation != null &&
    c.clan != null &&
    c.appearanceArc != null &&
    c.cursedEnergy != null &&
    c.hasDomain != null
  );
}

/** Libellé FR affichable d'une valeur d'attribut (pour la grille). */
export function attributeDisplay(key: AttributeKey, c: Character): string {
  switch (key) {
    case "race":
      return c.race ? RACE_LABELS[c.race] : "?";
    case "gender":
      return c.gender ? GENDER_LABELS[c.gender] : "?";
    case "grade":
      return c.grade ? GRADE_LABELS[c.grade] : "?";
    case "affiliation":
      return c.affiliation ? AFFILIATION_LABELS[c.affiliation] : "?";
    case "clan":
      return c.clan ? CLAN_LABELS[c.clan] : "?";
    case "appearanceArc":
      return c.appearanceArc ? ARC_LABELS[c.appearanceArc] : "?";
    case "hasDomain":
      return c.hasDomain == null ? "?" : c.hasDomain ? "Oui" : "Non";
    case "cursedEnergy":
      return c.cursedEnergy == null ? "?" : String(c.cursedEnergy);
  }
}
