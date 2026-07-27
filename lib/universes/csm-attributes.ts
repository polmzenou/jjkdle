import type {
  AttributeOptionSpec,
  AttributeSpec,
} from "@/lib/games/jjkdle/attribute-schema";

/**
 * ATTRIBUTS de l'univers CSM — données d'amorçage.
 *
 * ⚠️ Fichier VOLONTAIREMENT PARTIEL. Contrairement à `jjk-attributes.ts`, il ne
 * décrit PAS tout l'univers : les 5 premiers attributs CSM (`csmspecies`,
 * `csmgender`, `csmAppearanceArc`, `csmaffiliation`, `csmpower`, positions 0→4)
 * ont été créés directement via /admin et n'ont jamais eu de fichier de seed.
 * On ne les rétro-décrit pas ici : la source de vérité au runtime reste la base,
 * et un fichier qui les redéclarerait à moitié serait un piège (un `update`
 * d'upsert écraserait des libellés/ordres retouchés depuis l'admin).
 *
 * Ce fichier ne sert donc qu'à AMORCER le seul attribut ajouté par script :
 * `scripts/seed-attributes-csm-status.ts` l'écrit en base (idempotent).
 */

/** Options d'une liste NON ordonnée (aucune flèche possible). */
function categorical(entries: [string, string][]): AttributeOptionSpec[] {
  return entries.map(([value, label]) => ({ value, label, order: null }));
}

/**
 * Statut vital — 6e colonne de CSMdle (position 5).
 *
 * CATEGORICAL et non ORDINAL : « mort » et « réincarné » ne sont pas plus haut
 * ou plus bas que « vivant », donc jamais de flèche ↑/↓.
 *
 * `REINCARNATED` est le cas propre à Chainsaw Man : un démon tué dans le monde
 * humain repart en Enfer, et tué en Enfer il renaît ici sous une autre forme.
 * Il vaut pour le personnage dont le démon EST revenu (Makima → Nayuta), pas
 * pour la réincarnation elle-même, qui a son propre statut.
 *
 * `UNKNOWN` est une VALEUR à part entière, pas un trou : un personnage dont le
 * sort n'est pas tranché reste renseigné, donc éligible comme cible du jour
 * (cf. `isCompleteFor`, qui ne regarde que la présence d'une valeur).
 */
export const CSM_STATUS: AttributeSpec = {
  key: "csmstatus",
  label: "Statut",
  kind: "CATEGORICAL",
  comparable: false,
  tolerance: null,
  options: categorical([
    ["ALIVE", "Vivant"],
    ["DEAD", "Mort"],
    ["REINCARNATED", "Réincarné"],
    ["UNKNOWN", "Inconnu"],
  ]),
};
