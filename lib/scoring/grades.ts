/**
 * Paliers de grade appliqués au score global (normalisé sur 1000).
 *
 * Table configurable : pour ajuster un seuil, il suffit d'éditer `GRADE_TIERS`.
 * Les paliers sont ordonnés du plus exigeant au moins exigeant ; `getGrade`
 * renvoie le premier dont `min` est atteint.
 *
 *   Score        Grade
 *   < 500        Grade 4−
 *   ≥ 500        Grade 4
 *   ≥ 600        Grade 3
 *   ≥ 700        Grade 2
 *   ≥ 900        Grade 1
 *   980–1000     Grade S
 */

export type GradeId = "s" | "1" | "2" | "3" | "4" | "4minus";

export interface GradeTier {
  id: GradeId;
  label: string;
  /** Score minimum inclusif pour atteindre ce grade. */
  min: number;
  /** Clé de couleur correspondante dans le thème Tailwind (`grade.*`). */
  color: string;
}

/** Ordonné du plus haut au plus bas — l'ordre est utilisé par `getGrade`. */
export const GRADE_TIERS: GradeTier[] = [
  { id: "s", label: "Grade S", min: 980, color: "#f43f5e" },
  { id: "1", label: "Grade 1", min: 900, color: "#f59e0b" },
  { id: "2", label: "Grade 2", min: 700, color: "#a78bfa" },
  { id: "3", label: "Grade 3", min: 600, color: "#38bdf8" },
  { id: "4", label: "Grade 4", min: 500, color: "#9ca3af" },
  { id: "4minus", label: "Grade 4−", min: 0, color: "#6b7280" },
];

/**
 * Renvoie le palier de grade correspondant à un score (0–1000).
 * Un score inférieur à 0 retombe sur le grade le plus bas.
 */
export function getGrade(score: number): GradeTier {
  const tier = GRADE_TIERS.find((t) => score >= t.min);
  // Le dernier palier a min=0, donc on trouve toujours quelque chose ;
  // le fallback couvre les scores négatifs par sécurité.
  return tier ?? GRADE_TIERS[GRADE_TIERS.length - 1];
}
