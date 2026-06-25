/**
 * Formatage déterministe des scores (séparateur de milliers).
 *
 * ⚠️ Ne PAS utiliser `Number.toLocaleString("fr-FR")` dans du contenu rendu
 * côté serveur : selon la version d'ICU, le serveur (Node) produit une espace
 * fine insécable U+202F que le navigateur peut formater différemment → mismatch
 * d'hydratation → « client-side exception » en production.
 *
 * Ici on insère manuellement une espace insécable (U+00A0) via regex : pur JS,
 * donc sortie identique sur le serveur et le client.
 */
export function formatScore(n: number): string {
  return Math.trunc(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
