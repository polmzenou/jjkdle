import type {
  AttributeOptionSpec,
  AttributeSpec,
} from "@/lib/games/jjkdle/attribute-schema";

/**
 * ATTRIBUTS de l'univers JJK — données d'amorçage (étape 3).
 *
 * Source de vérité au RUNTIME = la base (`Attribute`/`AttributeOption`, éditables
 * depuis l'admin). Ce fichier ne sert qu'à AMORCER un univers :
 *   - `scripts/seed-attributes-jjk.ts` l'écrit en base (idempotent) ;
 *   - les tests s'en servent de schéma de référence, sans base.
 *
 * C'est le patron pour ajouter un anime : un fichier `<slug>-attributes.ts` de la
 * même forme + une ligne `Universe`, et JJKdle fonctionne pour cet univers sans
 * une ligne de code métier. Les VALEURS par personnage se saisissent ensuite via
 * /admin (elles n'ont jamais été dans les données de seed).
 *
 * L'ORDRE du tableau = l'ordre des colonnes de la grille (`position`).
 * L'ORDRE des options d'un attribut ORDINAL = l'indice ↑/↓.
 */

/** Options d'une liste NON ordonnée (aucune flèche possible). */
function categorical(entries: [string, string][]): AttributeOptionSpec[] {
  return entries.map(([value, label]) => ({ value, label, order: null }));
}

/**
 * Options d'une liste ORDONNÉE : `order` = index dans le tableau. Les valeurs
 * listées dans `unordered` reçoivent `order: null` — elles ne se comparent à rien
 * (cas de « pas de grade », qui ne peut être ni au-dessus ni en dessous d'un grade).
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

/** Écart sous lequel l'énergie occulte passe en « proche » (orange). */
export const JJK_CURSED_ENERGY_TOLERANCE = 20;

export const JJK_ATTRIBUTES: AttributeSpec[] = [
  {
    key: "race",
    label: "Race",
    kind: "CATEGORICAL",
    comparable: false,
    tolerance: null,
    options: categorical([
      ["HUMAN", "Humain"],
      ["CURSED_SPIRIT", "Fléau"],
      ["SHIKIGAMI", "Shikigami"],
      ["CURSED_CORPSE", "Embryon maudit"],
      ["OTHER", "Autre"],
    ]),
  },
  {
    key: "gender",
    label: "Genre",
    kind: "CATEGORICAL",
    comparable: false,
    tolerance: null,
    options: categorical([
      ["MALE", "Homme"],
      ["FEMALE", "Femme"],
      ["OTHER", "Autre"],
    ]),
  },
  {
    key: "grade",
    label: "Grade",
    kind: "ORDINAL",
    comparable: true,
    tolerance: null,
    // Du plus faible au plus fort. NO_GRADE est en tête mais NON ordonné.
    options: ordinal(
      [
        ["NO_GRADE", "Pas de grade"],
        ["GRADE_4", "Grade 4"],
        ["SEMI_GRADE_3", "Semi-grade 3"],
        ["GRADE_3", "Grade 3"],
        ["SEMI_GRADE_2", "Semi-grade 2"],
        ["GRADE_2", "Grade 2"],
        ["SEMI_GRADE_1", "Semi-grade 1"],
        ["GRADE_1", "Grade 1"],
        ["SPECIAL_GRADE", "Grade Spécial"],
      ],
      ["NO_GRADE"],
    ),
  },
  {
    key: "affiliation",
    label: "Affiliation",
    kind: "CATEGORICAL",
    comparable: false,
    tolerance: null,
    options: categorical([
      ["TOKYO_SCHOOL", "École de Tokyo"],
      ["KYOTO_SCHOOL", "École de Kyoto"],
      ["CULLING_GAME", "Culling Game"],
      ["SHIBUYA", "Shibuya"],
      ["CURSED_SPIRITS_FACTION", "Faction des fléaux"],
      ["OTHER", "Autre"],
    ]),
  },
  {
    key: "clan",
    label: "Clan",
    kind: "CATEGORICAL",
    comparable: false,
    tolerance: null,
    options: categorical([
      ["ZENIN", "Zen'in"],
      ["KAMO", "Kamo"],
      ["GOJO", "Gojo"],
      ["NONE", "Aucun"],
    ]),
  },
  {
    key: "appearanceArc",
    label: "Arc",
    kind: "ORDINAL",
    comparable: true,
    tolerance: null,
    // Ordre chronologique du récit (GOJOS_PAST est un flashback, placé à son arc
    // de première apparition à l'écran).
    options: ordinal([
      ["JJK_0", "Jujutsu Kaisen 0"],
      ["FEARSOME_WOMB", "Prologue"],
      ["VS_MAHITO", "Vs Mahito"],
      ["KYOTO_GOODWILL_EVENT", "Tournoi Tokyo-Kyoto"],
      ["DEATH_PAINTING", "Les frères de sang"],
      ["GOJOS_PAST", "Le passé de Gojo"],
      ["SHIBUYA_INCIDENT", "Incident de Shibuya"],
      ["ITADORI_EXTERMINATION", "Extermination d'Itadori"],
      ["CULLING_GAME", "Culling Game"],
      ["SHINJUKU_SHOWDOWN", "Bataille de Shinjuku"],
      ["FINAL", "Dénouement"],
      ["MODULO", "Jujutsu Kaisen Modulo"],
    ]),
  },
  {
    key: "hasDomain",
    label: "Territoire",
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
    key: "cursedEnergy",
    label: "Énergie occulte",
    kind: "NUMERIC",
    comparable: true,
    tolerance: JJK_CURSED_ENERGY_TOLERANCE,
    options: [],
  },
];
