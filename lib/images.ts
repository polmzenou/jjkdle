/**
 * Version d'AFFICHAGE d'une capture de jeu (`/assets/*.png` → `.webp`).
 *
 * Les captures PNG d'origine (~1 Mo) restent la source de vérité : elles servent
 * aux aperçus de partage (Open Graph / JSON-LD), où le WebP est mal supporté.
 * Le site affiche les `.webp` générés à côté par `scripts/optimize-images.mjs`
 * (10 à 20 fois plus légers). Tout autre chemin est renvoyé tel quel.
 */
export function previewDisplaySrc(src: string): string {
  return src.startsWith("/assets/") ? src.replace(/\.png$/i, ".webp") : src;
}
