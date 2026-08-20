import type {
  AttributeOptionSpec,
  AttributeSpec,
} from "@/lib/games/jjkdle/attribute-schema";

/**
 * ATTRIBUTS de l'univers AOT — données d'amorçage.
 *
 * Même patron que `jjk-attributes.ts` : la source de vérité au RUNTIME reste la
 * base (`Attribute`/`AttributeOption`, éditables depuis /admin). Ce fichier ne
 * sert qu'à AMORCER l'univers via `scripts/seed-attributes-aot.ts` (idempotent).
 *
 * L'ORDRE du tableau = l'ordre des colonnes de la grille (`position`).
 * L'ORDRE des options d'un attribut ORDINAL = l'indice ↑/↓.
 *
 * `aotpower` sert DEUX jeux : la colonne chiffrée d'AOTdle, et la comparaison de
 * Higher/Lower (`aot.ts` → `higherLower.attributeKey`). `aotgender` alimente en
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
 * L'échelle est celle d'aotdle.net (unité « CE »), qui s'étale de 347 à
 * 1 824 047 : le pendant AOT de `JJK_CURSED_ENERGY_TOLERANCE`, à trois ordres de
 * grandeur près. 25 000 sépare les gros paliers sans coller d'orange partout.
 */
export const AOT_POWER_TOLERANCE = 25_000;

export const AOT_ATTRIBUTES: AttributeSpec[] = [
  {
    key: "aotorigin",
    label: "Origine",
    kind: "CATEGORICAL",
    comparable: false,
    tolerance: null,
    // CATEGORICAL et non ORDINAL : ces origines ne se hiérarchisent pas.
    // `SHIFTER` coexiste avec `aottitan` (booléen) et ne fait pas doublon : ici
    // c'est la NATURE du personnage, là-bas le simple fait de porter un titan.
    options: categorical([
      ["ELDIAN", "Éldien"],
      ["SHIFTER", "Shifter"],
      ["ACKERMAN", "Ackerman"],
      ["MARLEYAN", "Marleyen"],
      ["ASIAN_CLAN", "Clan asiatique"],
      ["PURE_TITAN", "Titan pur"],
      ["OTHER", "Autre"],
    ]),
  },
  {
    key: "aotgender",
    label: "Genre",
    kind: "CATEGORICAL",
    comparable: false,
    tolerance: null,
    // `FEMALE` est la valeur attendue par le filtre booru (cf. aot.ts).
    options: categorical([
      ["MALE", "Homme"],
      ["FEMALE", "Femme"],
      ["OTHER", "Autre"],
    ]),
  },
  {
    key: "aotaffiliation",
    label: "Affiliation",
    kind: "CATEGORICAL",
    comparable: false,
    tolerance: null,
    options: categorical([
      ["SURVEY_CORPS", "Bataillon d'exploration"],
      ["GARRISON", "Brigades stationnaires"],
      ["MILITARY_POLICE", "Police militaire"],
      ["MARLEY_WARRIORS", "Guerriers de Marley"],
      ["ANTI_MARLEYAN", "Volontaires anti-marleyens"],
      ["JAEGERISTS", "Jägers"],
      ["ROYALTY", "Royauté / Noblesse"],
      ["CIVILIAN", "Civil"],
      ["OTHER", "Autre"],
    ]),
  },
  {
    key: "aotrank",
    label: "Grade",
    kind: "ORDINAL",
    comparable: true,
    tolerance: null,
    // Du plus bas au plus haut. NO_RANK est en tête mais NON ordonné : un civil
    // n'est ni au-dessus ni en dessous d'un cadet (même règle que NO_GRADE en JJK).
    options: ordinal(
      [
        ["NO_RANK", "Sans grade"],
        ["CADET", "Cadet"],
        ["SOLDIER", "Soldat"],
        ["SQUAD_LEADER", "Chef d'escouade"],
        ["CAPTAIN", "Capitaine"],
        ["SECTION_COMMANDER", "Commandant de section"],
        ["COMMANDER", "Commandant en chef"],
        ["MARSHAL", "Maréchal / Chef d'État"],
      ],
      ["NO_RANK"],
    ),
  },
  {
    key: "aottitan",
    label: "Titan",
    kind: "BOOLEAN",
    comparable: false,
    tolerance: null,
    // Un BOOLEAN est une liste fermée à 2 valeurs : les libellés restent de la
    // donnée (aucun "Oui"/"Non" codé en dur dans le rendu).
    options: categorical([
      ["true", "Oui"],
      ["false", "Non"],
    ]),
  },
  {
    key: "aotstatus",
    label: "Statut",
    kind: "CATEGORICAL",
    comparable: false,
    tolerance: null,
    // « Dévoré » est le cas propre à AOT (transmission du titan par ingestion) :
    // le ranger sous « Mort » perdrait l'information la plus discriminante.
    // `UNKNOWN` est une VALEUR à part entière, pas un trou : le personnage reste
    // renseigné, donc éligible comme cible du jour (cf. `isCompleteFor`).
    options: categorical([
      ["ALIVE", "Vivant"],
      ["DEAD", "Mort"],
      ["DEVOURED", "Dévoré"],
      ["UNKNOWN", "Inconnu"],
    ]),
  },
  {
    key: "aotAppearanceArc",
    label: "Arc",
    kind: "ORDINAL",
    comparable: true,
    tolerance: null,
    // Ordre du récit : c'est lui qui donne le sens des flèches ↑/↓. « 104e
    // Brigade » est un flashback interne à la Bataille de Trost, placé ici à sa
    // position narrative et non chronologique — comme GOJOS_PAST côté JJK.
    options: ordinal([
      ["SHIGANSHINA_FALL", "Chute de Shiganshina"],
      ["TROST_BATTLE", "Bataille de Trost"],
      ["TRAINING_CORPS_104", "104e Brigade d'entraînement"],
      ["FEMALE_TITAN", "Titan Féminin"],
      ["CLASH_OF_TITANS", "Choc des Titans"],
      ["UPRISING", "Soulèvement"],
      ["RETURN_TO_SHIGANSHINA", "Retour à Shiganshina"],
      ["MARLEY", "Mahr / Marley"],
      ["WAR_FOR_PARADIS", "Guerre pour Paradis"],
      ["RUMBLING", "Grand Terrassement"],
      ["FINAL_BATTLE", "Bataille finale"],
    ]),
  },
  {
    key: "aotpower",
    label: "Puissance",
    kind: "NUMERIC",
    comparable: true,
    tolerance: AOT_POWER_TOLERANCE,
    options: [],
  },
];
