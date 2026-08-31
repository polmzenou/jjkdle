import type { Character } from "@/data/roster/characters";
import { ARCHETYPES, DEFAULT_ARCHETYPE, type Archetype } from "./types";

/**
 * Passifs, techniques et ultime — module PUR.
 *
 * Règle fondatrice du jeu : **aucune capacité n'est écrite personnage par
 * personnage.** Avec une centaine de personnages par univers, ce serait une
 * impasse de contenu. On dérive à la place :
 *
 *   Character.ratings → catégorie d'excellence → archétype → passif + technique
 *
 * Il y a donc 9 passifs et 8 techniques à maintenir (l'archétype `domain` n'a
 * pas de technique : il a l'ultime), et le roster entier est couvert à vie.
 * Un personnage ajouté demain en /admin arrive avec ses capacités.
 *
 * La table catégorie → archétype est de la CONFIG D'UNIVERS (cf. `config.ts`) :
 * les slugs de catégories sont propres à chaque anime (`innate-technique` en
 * JJK, `csm-hax` en CSM), les archétypes ne le sont pas.
 */

// ──────────────────────────────────────────────────────────────────────────
// Passifs
// ──────────────────────────────────────────────────────────────────────────

/**
 * Un passif est une FICHE DE DONNÉES, pas une fonction : le moteur de combat
 * lit ces champs au montage. Une capacité qui serait un callback ne pourrait
 * ni se sérialiser dans l'état de run, ni s'afficher dans l'UI sans duplication.
 */
export interface PassiveSpec {
  archetype: Archetype;
  name: string;
  description: string;

  /** Énergie retirée au coût des techniques de ce personnage. */
  techniqueDiscount: number;
  /** Jauge d'action au premier tick, en % (100 = frappe immédiate). */
  startGaugePct: number;
  /** PV max rendus à ce personnage quand il abat un ennemi, en %. */
  healOnKillPct: number;
  /**
   * Allonge les fenêtres ennemies, en %. Effet d'ESCOUADE : il s'applique tant
   * que le porteur est vivant, même s'il n'attaque pas.
   */
  telegraphBonusPct: number;
  /** Bonus de frappe, en %, actif au-dessus de `strikeBonusHpPct` de PV. */
  strikeBonusPct: number;
  strikeBonusHpPct: number;
  /** Bonus de génération d'énergie de ce personnage, en %. */
  fluxBonusPct: number;
  /** Remplace le seuil de la jauge d'ultime (100 = valeur par défaut). */
  ultimateThreshold: number;
  /** Ignore le plafond de recrutement de la strate (hors combat, cf. floors). */
  ignoresRecruitCap: boolean;
  /** Survit à un coup fatal avec 1 PV, une fois par combat. */
  survivesFatal: boolean;
}

/** Passif neutre : sert de base à chaque fiche, pour n'écrire que l'écart. */
const NEUTRAL: Omit<PassiveSpec, "archetype" | "name" | "description"> = {
  techniqueDiscount: 0,
  startGaugePct: 0,
  healOnKillPct: 0,
  telegraphBonusPct: 0,
  strikeBonusPct: 0,
  strikeBonusHpPct: 0,
  fluxBonusPct: 0,
  ultimateThreshold: 100,
  ignoresRecruitCap: false,
  survivesFatal: false,
};

export const PASSIVES: Record<Archetype, PassiveSpec> = {
  technique: {
    ...NEUTRAL,
    archetype: "technique",
    name: "Sort inné",
    description: "Sa technique coûte 10 d'énergie de moins.",
    techniqueDiscount: 10,
  },
  swift: {
    ...NEUTRAL,
    archetype: "swift",
    name: "Devance",
    description: "Entre en combat avec sa jauge d'action à moitié pleine.",
    startGaugePct: 50,
  },
  beast: {
    ...NEUTRAL,
    archetype: "beast",
    name: "Fléau",
    description: "Récupère 8 % de ses PV max à chaque ennemi abattu.",
    healOnKillPct: 8,
  },
  tactician: {
    ...NEUTRAL,
    archetype: "tactician",
    name: "Lecture",
    description: "Les fenêtres ennemies durent 40 % plus longtemps.",
    telegraphBonusPct: 40,
  },
  brute: {
    ...NEUTRAL,
    archetype: "brute",
    name: "Poigne",
    description: "+20 % de dégâts tant qu'il est au-dessus de 70 % de PV.",
    strikeBonusPct: 20,
    strikeBonusHpPct: 70,
  },
  channeler: {
    ...NEUTRAL,
    archetype: "channeler",
    name: "Flux",
    description: "+50 % d'énergie occulte générée.",
    fluxBonusPct: 50,
  },
  domain: {
    ...NEUTRAL,
    archetype: "domain",
    name: "Territoire",
    description: "Sa jauge d'ultime se déclenche à 60 au lieu de 100.",
    ultimateThreshold: 60,
  },
  adaptive: {
    ...NEUTRAL,
    archetype: "adaptive",
    name: "Polyvalence",
    description: "Peut être recruté au-delà du plafond de sa strate.",
    ignoresRecruitCap: true,
  },
  stalwart: {
    ...NEUTRAL,
    archetype: "stalwart",
    name: "Ténacité",
    description: "Survit à un coup fatal avec 1 PV, une fois par combat.",
    survivesFatal: true,
  },
};

// ──────────────────────────────────────────────────────────────────────────
// Techniques
// ──────────────────────────────────────────────────────────────────────────

/**
 * Résolution d'une technique. Union fermée : le moteur de combat fait un
 * `switch` exhaustif dessus, ce qui garantit à la compilation qu'aucun
 * archétype ajouté plus tard ne restera sans effet.
 */
export type TechniqueEffect =
  /** Un coup lourd sur le premier ennemi vivant. */
  | { type: "burst"; mult: number }
  /** Plusieurs coups rapides sur le premier ennemi vivant. */
  | { type: "multi"; mult: number; hits: number }
  /** Invoque un allié autonome, non adressable par le joueur. */
  | { type: "summon"; hpPct: number; ticks: number }
  /** Marque : la PROCHAINE frappe de l'escouade est multipliée. */
  | { type: "mark"; mult: number }
  /** Coup qui repousse : dégâts + annulation de la charge adverse. */
  | { type: "shove"; mult: number }
  /** Frappe tous les ennemis vivants. */
  | { type: "sweep"; mult: number }
  /** Rejoue la dernière technique utilisée par l'escouade. */
  | { type: "mimic" }
  /** Défensif : absorbe la prochaine attaque reçue. */
  | { type: "guard"; refundPct: number };

export interface TechniqueSpec {
  archetype: Archetype;
  name: string;
  description: string;
  /** Coût en énergie occulte, avant remise du passif et des objets. */
  cost: number;
  /**
   * Offensive = « contre » si jouée pendant une fenêtre (dégâts ×2, charge
   * annulée). Défensive = « parade » (absorbe le coup chargé, rend de
   * l'énergie). C'est ce booléen qui décide de la lecture d'une fenêtre.
   */
  offensive: boolean;
  effect: TechniqueEffect;
}

/**
 * `domain` n'a pas de technique : ces personnages misent tout sur l'ultime.
 * C'est aussi ce qui garde l'interface à trois boutons — un personnage n'a
 * jamais qu'UNE action, la technique cédant la place à l'ultime quand la jauge
 * est pleine.
 */
export const TECHNIQUES: Record<Archetype, TechniqueSpec | null> = {
  technique: {
    archetype: "technique",
    name: "Sort inné",
    description: "Un coup lourd sur l'ennemi en face.",
    cost: 50,
    offensive: true,
    effect: { type: "burst", mult: 2.5 },
  },
  swift: {
    archetype: "swift",
    name: "Fauchage",
    description: "Trois frappes rapides sur l'ennemi en face.",
    cost: 25,
    offensive: true,
    effect: { type: "multi", mult: 0.6, hits: 3 },
  },
  beast: {
    archetype: "beast",
    name: "Invocation",
    description: "Un shikigami combat seul pendant 10 secondes.",
    cost: 50,
    offensive: true,
    effect: { type: "summon", hpPct: 30, ticks: 100 },
  },
  tactician: {
    archetype: "tactician",
    name: "Point faible",
    description: "La prochaine frappe de l'escouade fait le triple.",
    cost: 25,
    offensive: true,
    effect: { type: "mark", mult: 3 },
  },
  brute: {
    archetype: "brute",
    name: "Charge",
    description: "Un coup qui repousse et interrompt la charge adverse.",
    cost: 25,
    offensive: true,
    effect: { type: "shove", mult: 1.8 },
  },
  channeler: {
    archetype: "channeler",
    name: "Décharge",
    description: "Frappe tous les ennemis à la fois.",
    cost: 50,
    offensive: true,
    effect: { type: "sweep", mult: 1.2 },
  },
  domain: null,
  adaptive: {
    archetype: "adaptive",
    name: "Adaptation",
    description: "Rejoue la dernière technique employée par l'escouade.",
    cost: 25,
    offensive: true,
    effect: { type: "mimic" },
  },
  stalwart: {
    archetype: "stalwart",
    name: "Encaisse",
    description: "Absorbe la prochaine attaque et rend de l'énergie.",
    cost: 25,
    offensive: false,
    effect: { type: "guard", refundPct: 50 },
  },
};

// ──────────────────────────────────────────────────────────────────────────
// Ultime
// ──────────────────────────────────────────────────────────────────────────

/**
 * L'ultime, réservé aux personnages dont l'attribut BOOLEAN de l'univers
 * (`hasDomain` en JJK) vaut vrai. Sa jauge se remplit avec les dégâts SUBIS,
 * pas infligés : elle arrive donc quand ça va mal, ce qui en fait un
 * retournement de situation plutôt qu'une récompense de domination.
 */
export const ULTIMATE = {
  name: "Extension de Territoire",
  description:
    "Frappe tous les ennemis et suspend leurs attaques chargées 5 secondes.",
  /** Multiplicateur de frappe, sur tous les ennemis. */
  mult: 4,
  /** Ticks pendant lesquels aucun ennemi ne peut télégraphier. */
  suppressTicks: 50,
  /** Seuil de jauge par défaut (le passif `domain` l'abaisse à 60). */
  threshold: 100,
} as const;

// ──────────────────────────────────────────────────────────────────────────
// Dérivation
// ──────────────────────────────────────────────────────────────────────────

/**
 * Catégorie où le personnage a sa note la plus haute — sa « catégorie
 * d'excellence ».
 *
 * `ratings` est PARTIEL par construction (une clé présente signifie « éligible
 * à cette catégorie » dans le builder, pas « note connue »), donc l'absence
 * totale de notes est un cas NORMAL et non une erreur : on renvoie `null`, et
 * l'appelant retombe sur l'archétype par défaut.
 *
 * Les ex æquo sont tranchés par l'ordre alphabétique des clés : arbitraire,
 * mais STABLE — deux exécutions doivent donner le même archétype, sans quoi la
 * re-simulation serveur diverge de l'animation client.
 */
export function excellenceCategory(character: Character): string | null {
  const ratings = character.ratings ?? {};
  let best: string | null = null;
  let bestValue = -Infinity;

  for (const key of Object.keys(ratings).sort()) {
    const value = ratings[key];
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    if (value > bestValue) {
      bestValue = value;
      best = key;
    }
  }

  return best;
}

/**
 * Archétype d'un personnage : sa catégorie d'excellence traduite par la table
 * de l'univers. Toute inconnue (pas de notes, catégorie non mappée) retombe sur
 * `DEFAULT_ARCHETYPE` plutôt que de jeter — une fiche mal remplie ne doit
 * jamais empêcher un combat de se jouer.
 */
export function archetypeOf(
  character: Character,
  categoryArchetypes: Readonly<Record<string, Archetype>>,
): Archetype {
  const category = excellenceCategory(character);
  if (!category) return DEFAULT_ARCHETYPE;
  const mapped = categoryArchetypes[category];
  return mapped && ARCHETYPES.includes(mapped) ? mapped : DEFAULT_ARCHETYPE;
}

/** Passif d'un archétype. */
export function passiveOf(archetype: Archetype): PassiveSpec {
  return PASSIVES[archetype] ?? PASSIVES[DEFAULT_ARCHETYPE];
}

/** Technique d'un archétype (`null` pour `domain`, qui n'a que l'ultime). */
export function techniqueOf(archetype: Archetype): TechniqueSpec | null {
  return TECHNIQUES[archetype] ?? null;
}
