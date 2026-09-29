import { notFound } from "next/navigation";

/**
 * Attrape-tout des chemins INCONNUS d'un univers (`/jjk/nimportequoi`).
 *
 * Sans lui, une URL qui ne correspond à aucune route est rendue par la 404
 * RACINE, hors du layout de l'univers — donc sans sa palette ni sa nav. Lever
 * `notFound()` ici fait remonter l'erreur jusqu'à `app/[universe]/not-found.tsx`,
 * dans le chrome de l'anime. Les routes réelles restent prioritaires : un
 * segment catch-all ne matche qu'en dernier recours.
 */
export default function UnknownUniversePath() {
  notFound();
}
