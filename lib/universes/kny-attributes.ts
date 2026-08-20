import type {
  AttributeOptionSpec,
  AttributeSpec,
} from "@/lib/games/jjkdle/attribute-schema";

/**
 * ATTRIBUTS de l'univers KNY — données d'amorçage.
 *
 * Même patron que `jjk-attributes.ts` / `aot-attributes.ts` : la source de vérité
 * au RUNTIME reste la base (`Attribute`/`AttributeOption`, éditables depuis
 * /admin). Ce fichier ne sert qu'à AMORCER l'univers via
 * `scripts/seed-attributes-kny.ts` (idempotent).
 *
 * L'ORDRE du tableau = l'ordre des colonnes de la grille (`position`).
 * L'ORDRE des options d'un attribut ORDINAL = l'indice ↑/↓.
 *
 * `knypower` sert DEUX jeux : la colonne chiffrée de KNYdle, et la comparaison de
 * Higher/Lower (`kny.ts` → `higherLower.attributeKey`). `knygender` alimente en
 * plus le filtre booru. Les renommer casserait ces deux configs.
 */

/** Options d'une liste NON ordonnée (aucune flèche possible). */
function categorical(entries: [string, string][]): AttributeOptionSpec[] {
  return entries.map(([value, label]) => ({ value, label, order: null }));
}

/**
 * Options d'une liste ORDONNÉE : `order` = index dans le tableau. Les valeurs
 * listées dans `unordered` reçoivent `order: null` — elles ne se comparent à rien
 * (cas de « sans grade », qui ne peut être ni au-dessus ni en dessous d'un grade).
 */
function ordinal(
  entries: [string, string][],
  unordered: string[] = [],
): AttributeOptionSpec[] {
  return entries.map(([value, label], index) => ({
    value,
    label,
    order: unordered.includes(value) ? null : index,
  }));
}

/**
 * Écart sous lequel la puissance passe en « proche » (orange).
 *
 * L'échelle du roster est celle du « CE » de kimetsudle.net, exactement comme
 * AOT reprend celle d'aotdle : elle va de 57 (un villageois) à 905 700 (le
 * sommet). La tolérance vaut ~1,3 % de l'étendue, le même ratio qu'AOT
 * (25 000 sur 1 824 047).
 *
 * ⚠️ Cette échelle n'a rien à voir avec `Character.battleValue`, qui reste borné
 * 0–100 et sert au jeu Battle. Les deux coexistent volontairement.
 */
export const KNY_POWER_TOLERANCE = 12_000;

export const KNY_ATTRIBUTES: AttributeSpec[] = [
  {
    key: "knyspecies",
    label: "Espèce",
    kind: "CATEGORICAL",
    comparable: false,
    tolerance: null,
    // CATEGORICAL et non ORDINAL : un démon n'est pas « au-dessus » d'un humain.
    // `HYBRID` couvre les cas qui ne rentrent dans aucune des deux cases
    // (Nezuko, qui résiste au soleil et refuse le sang humain).
    options: categorical([
      ["HUMAN", "Humain"],
      ["DEMON", "Démon"],
      ["HYBRID", "Hybride"],
      ["OTHER", "Autre"],
    ]),
  },
  {
    key: "knygender",
    label: "Genre",
    kind: "CATEGORICAL",
    comparable: false,
    tolerance: null,
    // `FEMALE` est la valeur attendue par le filtre booru (cf. kny.ts).
    options: categorical([
      ["MALE", "Homme"],
      ["FEMALE", "Femme"],
      ["OTHER", "Autre"],
    ]),
  },
  {
    key: "knyaffiliation",
    label: "Affiliation",
    kind: "CATEGORICAL",
    comparable: false,
    tolerance: null,
    // Le CAMP uniquement. Le rang d'un pourfendeur vit dans `knyrank` ; celui
    // d'une Lune démoniaque n'est volontairement pas mêlé à cette échelle-là (les
    // deux hiérarchies ne se comparent pas), d'où `TWELVE_KIZUKI` ici.
    options: categorical([
      ["DEMON_SLAYER_CORPS", "Pourfendeurs de démons"],
      ["TWELVE_KIZUKI", "Douze Lunes démoniaques"],
      ["DEMON_UNRANKED", "Démon sans rang"],
      ["UBUYASHIKI", "Famille Ubuyashiki"],
      ["SWORDSMITH_VILLAGE", "Village des forgerons"],
      ["CIVILIAN", "Civil"],
      ["OTHER", "Autre"],
    ]),
  },
  {
    key: "knyrank",
    label: "Grade",
    kind: "ORDINAL",
    comparable: true,
    tolerance: null,
    // Échelle officielle des pourfendeurs, du plus bas (Mizunoto) au plus haut
    // (Pilier). NO_RANK est en tête mais NON ordonné : un démon ou un civil n'est
    // ni au-dessus ni en dessous d'un Mizunoto (même règle que NO_GRADE en JJK).
    options: ordinal(
      [
        ["NO_RANK", "Sans grade"],
        ["MIZUNOTO", "Mizunoto"],
        ["MIZUNOE", "Mizunoe"],
        ["KANOTO", "Kanoto"],
        ["KANOE", "Kanoe"],
        ["TSUCHINOTO", "Tsuchinoto"],
        ["TSUCHINOE", "Tsuchinoe"],
        ["HINOTO", "Hinoto"],
        ["HINOE", "Hinoe"],
        ["KINOTO", "Kinoto"],
        ["KINOE", "Kinoe"],
        ["HASHIRA", "Pilier"],
      ],
      ["NO_RANK"],
    ),
  },
  {
    key: "knybreathing",
    label: "Souffle",
    kind: "CATEGORICAL",
    comparable: false,
    tolerance: null,
    // Le pendant KNY de `aottitan` : l'attribut le plus discriminant de la grille.
    // Les souffles dérivés (Papillon, Serpent, Fleur…) sont listés à part de leur
    // souffle-mère, parce que c'est l'étiquette portée par le personnage.
    // `NONE` couvre les démons et les civils.
    options: categorical([
      ["NONE", "Aucun"],
      ["SUN", "Soleil"],
      ["WATER", "Eau"],
      ["FLAME", "Flamme"],
      ["THUNDER", "Foudre"],
      ["WIND", "Vent"],
      ["STONE", "Roche"],
      ["MIST", "Brume"],
      ["SOUND", "Son"],
      ["LOVE", "Amour"],
      ["SERPENT", "Serpent"],
      ["INSECT", "Insecte"],
      ["FLOWER", "Fleur"],
      ["BEAST", "Bête"],
      ["MOON", "Lune"],
      ["OTHER", "Autre"],
    ]),
  },
  {
    key: "knystatus",
    label: "Statut",
    kind: "CATEGORICAL",
    comparable: false,
    tolerance: null,
    // `UNKNOWN` est une VALEUR à part entière, pas un trou : le personnage reste
    // renseigné, donc éligible comme cible du jour (cf. `isCompleteFor`).
    options: categorical([
      ["ALIVE", "Vivant"],
      ["DEAD", "Mort"],
      ["UNKNOWN", "Inconnu"],
    ]),
  },
  {
    key: "knyAppearanceArc",
    label: "Arc",
    kind: "ORDINAL",
    comparable: true,
    tolerance: null,
    // Ordre du récit : c'est lui qui donne le sens des flèches ↑/↓.
    options: ordinal([
      ["FINAL_SELECTION", "Sélection finale"],
      ["ASAKUSA", "Asakusa"],
      ["TSUZUMI_MANSION", "Manoir des tambours"],
      ["NATAGUMO", "Mont Natagumo"],
      ["BUTTERFLY_MANSION", "Manoir des papillons"],
      ["MUGEN_TRAIN", "Train de l'infini"],
      ["ENTERTAINMENT_DISTRICT", "Quartier des plaisirs"],
      ["SWORDSMITH_VILLAGE", "Village des forgerons"],
      ["HASHIRA_TRAINING", "Entraînement des Piliers"],
      ["INFINITY_CASTLE", "Château de l'infini"],
      ["FINAL_BATTLE", "Bataille finale"],
    ]),
  },
  {
    key: "knypower",
    label: "Puissance",
    kind: "NUMERIC",
    comparable: true,
    tolerance: KNY_POWER_TOLERANCE,
    options: [],
  },
];
