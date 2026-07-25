import { gameTitleForUniverse } from "@/lib/games/registry";
import { getUniverseBySlug } from "@/lib/universes/registry";

/**
 * Titre d'un jeu DANS UN UNIVERS donné, pour les catalogues de cosmétiques.
 *
 * Les descriptions de badges/titres/cadres nomment les jeux (« Jouer à CSMdle
 * pour la première fois ») : les figer en dur les ferait diverger dès qu'un jeu
 * est renommé dans `lib/universes/<slug>.ts`. Elles passent donc par ici.
 *
 * Module PUR (client + serveur) : les sélecteurs de profil sont des composants
 * client. Volontairement hors de `lib/universes/csm.ts` pour ne pas tirer le
 * registre des jeux dans le bundle du middleware (Edge).
 */
export function gameTitleIn(slug: string, id: string): string {
  return gameTitleForUniverse(id, getUniverseBySlug(slug)?.gameCopy);
}
