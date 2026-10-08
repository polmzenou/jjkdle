/**
 * Tiers canoniques du roster, SANS aucune donnée de personnage.
 *
 * Isolés de `characters.ts` (qui importe `characters.json` et construit des
 * index au chargement du module) pour que les composants client qui n'ont
 * besoin que des tiers (rareté des cartes, cf. lib/cards/rarity.ts)
 * n'embarquent pas tout le roster de seed dans le bundle navigateur.
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
