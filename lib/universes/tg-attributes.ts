import type {
  AttributeOptionSpec,
  AttributeSpec,
} from "@/lib/games/jjkdle/attribute-schema";

/**
 * ATTRIBUTS de l'univers TG (Tokyo Ghoul) — données d'amorçage.
 *
 * Même patron que `kny-attributes.ts` / `aot-attributes.ts` : la source de vérité
 * au RUNTIME reste la base (`Attribute`/`AttributeOption`, éditables depuis
 * /admin). Ce fichier ne sert qu'à AMORCER l'univers via
 * `scripts/seed-attributes-tg.ts` (idempotent).
 *
 * L'ORDRE du tableau = l'ordre des colonnes de la grille (`position`).
 * L'ORDRE des options d'un attribut ORDINAL = l'indice ↑/↓.
 *
 * `tgpower` sert DEUX jeux : la colonne chiffrée de TGdle, et la comparaison de
 * Higher/Lower (`tg.ts` → `higherLower.attributeKey`). `tggender` alimente en
 * plus le filtre booru. Les renommer casserait ces deux configs.
 *
 * ⚠️ NEUF attributs là où les autres univers en ont huit : Tokyo Ghoul fait
 * cohabiter DEUX hiérarchies qui ne se comparent pas — le classement de menace
 * des goules (C → SSS) et le grade des enquêteurs du CCG (Rang 3 → Classe
 * Spéciale). Les fondre en une seule colonne ORDINAL donnerait des flèches ↑/↓
 * mensongères (une goule de classe A n'est ni au-dessus ni en dessous d'un
 * enquêteur de rang 1). Elles restent donc séparées, chacune avec sa valeur
 * NON ORDONNÉE (`NO_RATE` / `NO_RANK`) pour les personnages de l'autre camp —
 * même règle que `NO_GRADE` en JJK. La grille de TGdle calcule son nombre de
 * colonnes à l'exécution : aucune adaptation de code n'est nécessaire.
 */

/** Options d'une liste NON ordonnée (aucune flèche possible). */
function categorical(entries: [string, string][]): AttributeOptionSpec[] {
  return entries.map(([value, label]) => ({ value, label, order: null }));
}

/**
 * Options d'une liste ORDONNÉE : `order` = index dans le tableau. Les valeurs
 * listées dans `unordered` reçoivent `order: null` — elles ne se comparent à rien
 * (cas de « non classé », qui ne peut être ni au-dessus ni en dessous d'une
 * classe C).
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
 * ⚠️ L'échelle de `tgpower` se fixe AVEC le roster (aucun personnage n'est encore
 * saisi). La valeur ci-dessous suppose une étendue du même ordre que KNY
 * (~10^6) : la tolérance vaut alors ~1,3 % de l'étendue, le ratio retenu sur
 * AOT et KNY. Si le roster est finalement noté sur une autre échelle (0–100,
 * 0–10 000…), RÉAJUSTER cette constante en conséquence, sinon toute comparaison
 * ressortira « proche » — ou aucune.
 *
 * Cette échelle n'a rien à voir avec `Character.battleValue`, qui reste borné
 * 0–100 et sert au jeu Battle. Les deux coexistent volontairement.
 */
export const TG_POWER_TOLERANCE = 12_000;

export const TG_ATTRIBUTES: AttributeSpec[] = [
  {
    key: "tgspecies",
    label: "Espèce",
    kind: "CATEGORICAL",
    comparable: false,
    tolerance: null,
    // CATEGORICAL et non ORDINAL : une goule n'est pas « au-dessus » d'un humain.
    // Les trois cas hybrides sont distingués parce que c'est exactement ce que le
    // récit distingue : né à un œil (Eto), transformé chirurgicalement (Kaneki),
    // ou humain porteur d'un kakuhou greffé (les Quinx).
    options: categorical([
      ["HUMAN", "Humain"],
      ["GHOUL", "Goule"],
      ["ONE_EYED_GHOUL", "Goule à un œil"],
      ["HALF_GHOUL", "Semi-goule"],
      ["QUINX", "Quinx"],
      ["OTHER", "Autre"],
    ]),
  },
  {
    key: "tggender",
    label: "Genre",
    kind: "CATEGORICAL",
    comparable: false,
    tolerance: null,
    // `FEMALE` est la valeur attendue par le filtre booru (cf. tg.ts).
    options: categorical([
      ["MALE", "Homme"],
      ["FEMALE", "Femme"],
      ["OTHER", "Autre"],
    ]),
  },
  {
    key: "tgaffiliation",
    label: "Affiliation",
    kind: "CATEGORICAL",
    comparable: false,
    tolerance: null,
    // Le CAMP / l'organisation uniquement. Les deux hiérarchies internes vivent
    // dans `tgrate` et `tgrank` : les mêler ici rendrait la colonne illisible.
    options: categorical([
      ["CCG", "CCG"],
      ["ANTEIKU", "Anteiku"],
      ["AOGIRI_TREE", "Arbre Aogiri"],
      ["CLOWNS", "Clowns"],
      ["TSUKIYAMA_FAMILY", "Famille Tsukiyama"],
      ["QUINX_SQUAD", "Escouade Quinx"],
      ["GOAT", "Goat"],
      ["V", "V"],
      ["CIVILIAN", "Civil"],
      ["OTHER", "Autre"],
    ]),
  },
  {
    key: "tgkagune",
    label: "Kagune",
    kind: "CATEGORICAL",
    comparable: false,
    tolerance: null,
    // L'attribut le PLUS discriminant de la grille (le pendant de `knybreathing`
    // ou d'`aottitan`). Convention retenue pour les humains du CCG : la valeur est
    // le type de leur QUINQUE de prédilection — une quinque est taillée dans un
    // kakuhou, elle appartient donc à la même taxonomie. `NONE` reste réservé aux
    // personnages qui n'ont ni kagune ni quinque (civils, non-combattants).
    // `CHIMERA` couvre les kagune mixtes ; `KAKUJA` est une ÉVOLUTION et non un
    // type — il se note dans les catégories du builder, pas ici.
    options: categorical([
      ["NONE", "Aucun"],
      ["UKAKU", "Ukaku"],
      ["KOUKAKU", "Kōkaku"],
      ["RINKAKU", "Rinkaku"],
      ["BIKAKU", "Bikaku"],
      ["CHIMERA", "Chimère"],
    ]),
  },
  {
    key: "tgrate",
    label: "Menace",
    kind: "ORDINAL",
    comparable: true,
    tolerance: null,
    // Classement de dangerosité attribué par le CCG aux goules, du plus bas au
    // plus haut. NO_RATE est en tête mais NON ordonné : un enquêteur humain n'est
    // ni au-dessus ni en dessous d'une classe C.
    options: ordinal(
      [
        ["NO_RATE", "Non classé"],
        ["C", "C"],
        ["B", "B"],
        ["A", "A"],
        ["S", "S"],
        ["S_PLUS", "S+"],
        ["SS", "SS"],
        ["SSS", "SSS"],
      ],
      ["NO_RATE"],
    ),
  },
  {
    key: "tgrank",
    label: "Grade CCG",
    kind: "ORDINAL",
    comparable: true,
    tolerance: null,
    // Échelle officielle des enquêteurs, du plus bas (Rang 3) au plus haut
    // (Classe Spéciale). NO_RANK, non ordonné, couvre les goules et les civils.
    options: ordinal(
      [
        ["NO_RANK", "Sans grade"],
        ["RANK_3", "Rang 3"],
        ["RANK_2", "Rang 2"],
        ["RANK_1", "Rang 1"],
        ["ASSOCIATE_SPECIAL", "Classe Spéciale associée"],
        ["SPECIAL_CLASS", "Classe Spéciale"],
      ],
      ["NO_RANK"],
    ),
  },
  {
    key: "tgstatus",
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
    key: "tgAppearanceArc",
    label: "Arc",
    kind: "ORDINAL",
    comparable: true,
    tolerance: null,
    // Ordre du récit, Tokyo Ghoul puis :re d'une seule traite : c'est lui qui
    // donne le sens des flèches ↑/↓, il ne doit donc jamais être réordonné
    // autrement que chronologiquement.
    options: ordinal([
      ["TRAGEDY", "Tragédie"],
      ["DOVES", "Colombes"],
      ["GOURMET", "Gourmet"],
      ["AOGIRI", "Arbre Aogiri"],
      ["OWL_SUPPRESSION", "Chasse au Hibou"],
      ["QUINX", "Escouade Quinx"],
      ["TSUKIYAMA_EXTERMINATION", "Extermination des Tsukiyama"],
      ["ROSE", "Opération Rose"],
      ["RUSHIMA", "Rushima"],
      ["DRAGON", "Dragon"],
    ]),
  },
  {
    key: "tgpower",
    label: "Puissance",
    kind: "NUMERIC",
    comparable: true,
    tolerance: TG_POWER_TOLERANCE,
    options: [],
  },
];
