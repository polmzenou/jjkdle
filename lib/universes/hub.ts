/**
 * HUB : la page de CHOIX d'univers. Module PUR (utilisable dans le middleware
 * Edge).
 *
 * Routage par PRÉFIXE DE CHEMIN — un seul domaine sert tous les animes :
 *
 *   /              → hub (choix de l'univers)
 *   /jjk/games     → univers JJK
 *   /csm/games     → univers CSM
 *
 * Le hub vit donc à la RACINE, sur n'importe quel domaine : rien à configurer
 * (ni env, ni DNS). La racine est réécrite vers `HUB_ROUTE` par le middleware,
 * ce qui garde une URL propre (`/` et non `/universes`).
 */

/** Route interne de la page hub. Accessible aussi directement. */
export const HUB_ROUTE = "/universes";

/** Vrai si le chemin rend le hub (racine ou route interne). */
export function isHubPath(pathname: string): boolean {
  return pathname === "/" || pathname === HUB_ROUTE;
}
