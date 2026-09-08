import type {
  AttributeOptionSpec,
  AttributeSpec,
} from "@/lib/games/jjkdle/attribute-schema";

/**
 * ATTRIBUTS de l'univers Bleach — données d'amorçage.
 *
 * Même patron que `tg-attributes.ts` / `kny-attributes.ts` : la source de vérité
 * au RUNTIME reste la base (`Attribute`/`AttributeOption`, éditables depuis
 * /admin). Ce fichier ne sert qu'à AMORCER l'univers via
 * `scripts/seed-attributes-bleach.ts` (idempotent).
 *
 * L'ORDRE du tableau = l'ordre des colonnes de la grille (`position`).
 * L'ORDRE des options d'un attribut ORDINAL = l'indice ↑/↓.
 *
 * `bleachpower` sert DEUX jeux : la colonne chiffrée de Bleachdle, et la
 * comparaison de Higher/Lower (`bleach.ts` → `higherLower.attributeKey`).
 * `bleachrelease` porte en plus le palier d'ultime de la Tour, et
 * `bleachAppearanceArc` son échelle narrative. `bleachgender` alimente le filtre
 * booru. Les renommer casserait ces configs, sans erreur de compilation.
 *
 * ── Pourquoi HUIT attributs et pas neuf ──
 *
 * Bleach fait cohabiter plusieurs hiérarchies de faction, et la tentation est de
 * les dédoubler comme Tokyo Ghoul l'a fait (menace des goules / grade CCG). Ici
 * ce n'est pas nécessaire : une seule d'entre elles est une VRAIE échelle
 * ordonnée et lisible, le grade au Gotei 13 (`bleachrank`). Les deux autres n'en
 * sont pas :
 *   · le numéro d'Espada est un identifiant décroissant qui ne concerne que dix
 *     personnages — une colonne quasi vide, donc muette ;
 *   · la lettre de Schrift d'un Sternritter n'est pas ordonnée du tout.
 * Elles sont donc notées dans les CATÉGORIES du builder (« Hollows & Arrancar »,
 * « Quincy »), qui sont faites pour ça, et `bleachrank` suit la convention
 * `NO_RANK` de TG pour tout le reste du roster.
 */

/** Options d'une liste NON ordonnée (aucune flèche possible). */
function categorical(entries: [string, string][]): AttributeOptionSpec[] {
  return entries.map(([value, label]) => ({ value, label, order: null }));
}

/**
 * Options d'une liste ORDONNÉE : `order` = index dans le tableau. Les valeurs
 * listées dans `unordered` reçoivent `order: null` — elles ne se comparent à rien
 * (cas de « sans grade », qui ne peut être ni au-dessus ni en dessous d'un
 * officier gradé).
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
 * Écart sous lequel le reiatsu passe en « proche » (orange).
 *
 * ⚠️ ESTIMATION posée AVANT le roster, comme l'était celle de TG : elle suppose
 * l'échelle retenue sur KNY et TG, ~10^2 pour un humain lambda → ~10^6 pour le
 * sommet (Yhwach, Aizen transcendé). La tolérance vaut alors ~1,3 % de
 * l'étendue, le ratio utilisé sur AOT, KNY et TG. À RÉAJUSTER une fois
 * `bleachpower` saisi : sur une autre échelle (0–100, 0–10 000…), toute
 * comparaison ressortirait « proche » — ou aucune.
 *
 * Cette échelle n'a rien à voir avec `Character.battleValue`, qui reste borné
 * 0–100 et sert au jeu Battle. Les deux coexistent volontairement.
 */
export const BLEACH_POWER_TOLERANCE = 12_000;

export const BLEACH_ATTRIBUTES: AttributeSpec[] = [
  {
    key: "bleachspecies",
    label: "Espèce",
    kind: "CATEGORICAL",
    comparable: false,
    tolerance: null,
    // CATEGORICAL et non ORDINAL : un quincy n'est pas « au-dessus » d'un
    // shinigami. Les hybrides ont leur propre valeur parce que c'est exactement
    // ce que le récit distingue — un Vizard (shinigami ayant acquis des pouvoirs
    // de hollow) et un Arrancar (hollow ayant retiré son masque) sont deux
    // trajectoires inverses, pas une seule catégorie « mixte ».
    options: categorical([
      ["HUMAN", "Humain"],
      ["SOUL", "Âme"],
      ["SHINIGAMI", "Shinigami"],
      ["VIZARD", "Vizard"],
      ["HOLLOW", "Hollow"],
      ["ARRANCAR", "Arrancar"],
      ["QUINCY", "Quincy"],
      ["FULLBRINGER", "Fullbringer"],
      ["ZANPAKUTO_SPIRIT", "Esprit de zanpakutō"],
      ["OTHER", "Autre"],
    ]),
  },
  {
    key: "bleachgender",
    label: "Genre",
    kind: "CATEGORICAL",
    comparable: false,
    tolerance: null,
    // `FEMALE` est la valeur attendue par le filtre booru (cf. bleach.ts).
    options: categorical([
      ["MALE", "Homme"],
      ["FEMALE", "Femme"],
      ["OTHER", "Autre"],
    ]),
  },
  {
    key: "bleachaffiliation",
    label: "Affiliation",
    kind: "CATEGORICAL",
    comparable: false,
    tolerance: null,
    // Le CAMP / l'organisation uniquement. La hiérarchie interne du Gotei vit
    // dans `bleachrank` : la mêler ici rendrait la colonne illisible.
    options: categorical([
      ["GOTEI_13", "Gotei 13"],
      ["ROYAL_GUARD", "Division Zéro"],
      ["VISORED", "Visored"],
      ["KARAKURA", "Karakura"],
      ["XCUTION", "Xcution"],
      ["ESPADA", "Espada"],
      ["WANDENREICH", "Wandenreich"],
      ["HUECO_MUNDO", "Hueco Mundo"],
      ["SOUL_SOCIETY", "Soul Society"],
      ["OTHER", "Autre"],
    ]),
  },
  {
    key: "bleachrelease",
    label: "Libération",
    kind: "CATEGORICAL",
    comparable: false,
    tolerance: null,
    // L'attribut le PLUS discriminant de la grille (le pendant de `knybreathing`
    // ou de `tgkagune`). Convention : la valeur est la libération LA PLUS HAUTE
    // atteinte par le personnage — un capitaine qui a un bankai vaut `BANKAI`,
    // pas `SHIKAI`. `NONE` reste réservé aux personnages sans libération du tout
    // (humains ordinaires, âmes, hollows de base).
    //
    // CATEGORICAL et non ORDINAL, volontairement : un Vollständig n'est pas
    // « au-dessus » d'un Bankai, ce sont deux sommets de factions différentes.
    // Les flèches ↑/↓ seraient donc mensongères.
    //
    // ⚠️ C'est aussi l'attribut de PALIER D'ULTIME de la Tour : les valeurs qui
    // l'ouvrent sont listées dans `bleach.ts` (`tower.ultimateAttributeValues`).
    // Renommer une valeur ici sans la reporter là-bas prive silencieusement
    // toute une faction de son ultime.
    options: categorical([
      ["NONE", "Aucune"],
      ["SHIKAI", "Shikai"],
      ["BANKAI", "Bankai"],
      ["HOLLOWFICATION", "Hollowfication"],
      ["RESURRECCION", "Resurrección"],
      ["SEGUNDA_ETAPA", "Segunda Etapa"],
      ["VOLLSTANDIG", "Vollständig"],
      ["FULLBRING", "Fullbring"],
    ]),
  },
  {
    key: "bleachrank",
    label: "Grade au Gotei 13",
    kind: "ORDINAL",
    comparable: true,
    tolerance: null,
    // Échelle officielle du Gotei, du plus bas (élève de l'Académie) au plus haut
    // (Division Zéro, qui répond au Roi des Âmes et non au Sereitei). NO_RANK,
    // non ordonné, couvre tout le reste du roster : hollows, arrancar, quincy,
    // humains, fullbringers. Même règle que `NO_RANK` en TG et `NO_GRADE` en JJK.
    //
    // ⚠️ `SEATED` (officier gradé, 3e à 20e siège) est un échelon À PART ENTIÈRE
    // et non un détail : c'est là que se trouve la majeure partie des membres
    // nommés du Gotei. L'omettre écraserait tout ce monde sur « sans siège » ou
    // sur « vice-capitaine ».
    options: ordinal(
      [
        ["NO_RANK", "Sans grade"],
        ["ACADEMY", "Académie"],
        ["UNSEATED", "Sans siège"],
        ["SEATED", "Officier gradé"],
        ["LIEUTENANT", "Vice-capitaine"],
        ["CAPTAIN", "Capitaine"],
        ["CAPTAIN_COMMANDER", "Capitaine-commandant"],
        ["ROYAL_GUARD", "Division Zéro"],
      ],
      ["NO_RANK"],
    ),
  },
  {
    key: "bleachstatus",
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
    key: "bleachAppearanceArc",
    label: "Arc",
    kind: "ORDINAL",
    comparable: true,
    tolerance: null,
    // Ordre du récit : c'est lui qui donne le sens des flèches ↑/↓, et c'est
    // aussi l'échelle de strates de la Tour. Il ne doit donc jamais être
    // réordonné autrement que chronologiquement.
    //
    // Découpage retenu, et chapitres couverts (686 chapitres en huit cases) :
    //   AGENT           1–70     (Agent Shinigami)
    //   SOUL_SOCIETY    71–183   (infiltration + Sōkyoku + trahison d'Aizen)
    //   ARRANCAR        184–285  (Arrancar + Hueco Mundo I)
    //   HUECO_MUNDO     286–381  (Las Noches)
    //   FAKE_KARAKURA   382–423  (bataille du faux Karakura)
    //   DEICIDE         424–479  (chute d'Aizen + perte des pouvoirs)
    //   FULLBRING       480–541  (L'Agent perdu / Xcution)
    //   BLOOD_WAR       542–686  (Guerre Sanglante Millénaire)
    //
    // ⚠️ « Turn Back the Pendulum » (le flash-back des Visored, 110 ans plus tôt)
    // est volontairement ABSENT : publié au milieu de l'arc Arrancar mais situé
    // avant tout le reste, il n'a de place cohérente sur AUCUNE échelle
    // chronologique. Ses personnages se notent sur l'arc où ils agissent
    // vraiment dans le présent du récit.
    options: ordinal([
      ["AGENT", "Agent Shinigami"],
      ["SOUL_SOCIETY", "Soul Society"],
      ["ARRANCAR", "Arrancar"],
      ["HUECO_MUNDO", "Hueco Mundo"],
      ["FAKE_KARAKURA", "Faux Karakura"],
      ["DEICIDE", "Deicide"],
      ["FULLBRING", "Fullbring"],
      ["BLOOD_WAR", "Guerre Sanglante Millénaire"],
    ]),
  },
  {
    key: "bleachpower",
    label: "Reiatsu",
    kind: "NUMERIC",
    comparable: true,
    tolerance: BLEACH_POWER_TOLERANCE,
    options: [],
  },
];
