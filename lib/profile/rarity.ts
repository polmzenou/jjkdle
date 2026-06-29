/**
 * Échelle de rareté partagée par les titres et les cadres. Purement cosmétique :
 * ne change aucune logique de déblocage, sert seulement au style (couleur du
 * texte d'un titre, accent d'un cadre dans les sélecteurs).
 */
export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface RarityStyle {
  /** Libellé affiché (FR). */
  label: string;
  /** Couleur d'accent (hex). */
  color: string;
}

export const RARITY_STYLES: Record<Rarity, RarityStyle> = {
  common: { label: "Commun", color: "#9ca3af" },
  rare: { label: "Rare", color: "#38bdf8" },
  epic: { label: "Épique", color: "#a78bfa" },
  legendary: { label: "Légendaire", color: "#f59e0b" },
};

/** Style d'une rareté (repli sur `common` si valeur inconnue). */
export function rarityStyle(rarity: Rarity): RarityStyle {
  return RARITY_STYLES[rarity] ?? RARITY_STYLES.common;
}
