import { revalidateTag } from "next/cache";

/**
 * Tag du cache de données du CONTENU de jeu (roster, catégories, attributs,
 * consignes Pyramid), tous univers confondus.
 *
 * Ce contenu est lu à chaque partie (et à chaque essai JJKdle) mais n'est écrit
 * que depuis /admin : il est donc partagé entre requêtes via `unstable_cache`.
 * Toute écriture d'une de ces tables doit appeler `invalidateContent()` — la
 * lecture suivante repart alors de la base, sur toutes les instances.
 */
export const CONTENT_TAG = "content";

/** Durée de vie max (s) d'une entrée : filet de sécurité si une écriture oubliait d'invalider. */
export const CONTENT_REVALIDATE = 600;

/** À appeler après toute écriture du roster, des catégories, attributs ou consignes. */
export function invalidateContent(): void {
  revalidateTag(CONTENT_TAG);
}
