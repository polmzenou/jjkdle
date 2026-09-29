/**
 * COULEURS DE PSEUDO : cosmétique débloqué par le pourcentage de complétion de
 * la collection de cartes de l'UNIVERS COURANT (cartes possédées / roster).
 * Comme le reste du loadout, la couleur équipée est propre à chaque univers
 * (`UserUniverseProfile.nameColorKey`).
 *
 * Module neutre (ni client ni serveur) : la modale l'affiche, les server actions
 * re-vérifient le palier, et `PlayerName` applique la classe CSS
 * (`.name-color-<key>`, cf. app/globals.css).
 */

export interface NameColor {
  key: string;
  label: string;
  /** Pourcentage de complétion de la collection de l'univers requis. */
  threshold: number;
  /** Couleur représentative (pastille du picker). */
  swatch: string;
}

export const NAME_COLORS = [
  { key: "lime", label: "Vert lime", threshold: 50, swatch: "#a3ff12" },
  { key: "azure", label: "Bleu azur", threshold: 60, swatch: "#1e9bff" },
  { key: "turquoise", label: "Turquoise", threshold: 70, swatch: "#2de2d0" },
  { key: "incandescent", label: "Orange incandescent", threshold: 80, swatch: "#ff7a1a" },
  { key: "scarlet", label: "Rouge écarlate", threshold: 90, swatch: "#ff1f3d" },
  {
    key: "rainbow",
    label: "Arc-en-ciel",
    threshold: 100,
    swatch: "linear-gradient(90deg,#ff1f3d,#ff7a1a,#ffe600,#a3ff12,#1e9bff,#b44dff)",
  },
] as const satisfies readonly NameColor[];

export type NameColorKey = (typeof NAME_COLORS)[number]["key"];

export function isNameColorKey(value: unknown): value is NameColorKey {
  return NAME_COLORS.some((c) => c.key === value);
}

export function getNameColor(key: string | null | undefined): NameColor | undefined {
  return NAME_COLORS.find((c) => c.key === key);
}

/**
 * Une couleur est débloquée si la complétion atteint son palier (les admins
 * ignorent les paliers, comme pour titres/cadres/bannières).
 */
export function isNameColorUnlocked(
  key: string,
  completionPct: number,
  isAdmin = false,
): boolean {
  const color = getNameColor(key);
  if (!color) return false;
  return isAdmin || completionPct >= color.threshold;
}

/**
 * Pourcentage de complétion ARRONDI À L'INFÉRIEUR : 49,9 % ne doit pas passer
 * le palier de 50 %, et seul un roster complet donne 100 %.
 */
export function completionPercent(owned: number, total: number): number {
  if (total <= 0) return 0;
  return Math.floor((owned / total) * 100);
}
