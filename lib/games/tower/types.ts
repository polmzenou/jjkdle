/**
 * Types du jeu « The Culling Tower » (roguelike d'ascension).
 *
 * Aucune dépendance serveur ni React : ces types sont partagés par le client
 * (animation du combat) et le serveur (re-simulation autoritative), exactement
 * comme `lib/games/battle/types.ts`.
 *
 * Vocabulaire (cf. doc de conception) :
 *  - STRATE : bloc de 5 étages, adossé à une plage d'arcs du récit.
 *  - FENÊTRE : phase de charge télégraphée d'un ennemi, seul moment où le
 *    joueur peut « contrer » ou « parer ».
 *  - INTERVENTION : action du joueur pendant un combat (le seul input du jeu).
 */

// ──────────────────────────────────────────────────────────────────────────
// Constantes de structure
// ──────────────────────────────────────────────────────────────────────────

/** Nombre de slots d'escouade. Recruter au-delà force un sacrifice. */
export const SQUAD_SIZE = 3;

/** Hauteur de la tour, en étages. */
export const TOWER_FLOORS = 20;

/** Étages par strate (4 strates de 5). */
export const FLOORS_PER_STRATE = 5;

/** Nombre de strates. */
export const STRATE_COUNT = TOWER_FLOORS / FLOORS_PER_STRATE;

/** Starters proposés à l'entrée. Le joueur en prend UN. */
export const STARTER_CHOICES = 3;

/**
 * Bornes de `battleValue` du vivier de starters (« jamais ultra puissants »).
 *
 * Le PLANCHER compte autant que le plafond : à 8, l'écart entre le starter le
 * plus faible et le plus fort était de 1 à 5, et tirer le plus faible rendait
 * les premiers étages ingagnables quoi qu'on fasse. Un choix entre trois
 * personnages n'a de sens que s'ils sont tous jouables.
 */
export const STARTER_MIN_VALUE = 18;
export const STARTER_MAX_VALUE = 40;

// ──────────────────────────────────────────────────────────────────────────
// Archétypes de capacités
// ──────────────────────────────────────────────────────────────────────────

/**
 * Les 9 archétypes de capacité. C'est l'échelle PIVOT du jeu : les passifs et
 * les techniques sont définis ici et nulle part ailleurs.
 *
 * Un personnage n'en porte pas un « en dur » : on le DÉRIVE de sa catégorie
 * d'excellence (l'entrée de `Character.ratings` où sa note est la plus haute),
 * puis on traduit cette catégorie en archétype via la table de l'univers.
 * C'est cette indirection qui rend le jeu portable : les slugs de catégories
 * sont propres à chaque anime (`innate-technique` en JJK, `csm-hax` en CSM),
 * les archétypes ne le sont pas.
 */
export type Archetype =
  | "technique" // sort inné / pouvoir signature
  | "swift" // vitesse
  | "beast" // fléau, invocation, shikigami
  | "tactician" // battle IQ
  | "brute" // force physique
  | "channeler" // réserve d'énergie
  | "domain" // extension de territoire
  | "adaptive" // polyvalence
  | "stalwart"; // endurance

export const ARCHETYPES: Archetype[] = [
  "technique",
  "swift",
  "beast",
  "tactician",
  "brute",
  "channeler",
  "domain",
  "adaptive",
  "stalwart",
];

/**
 * Archétype servi quand un personnage n'a AUCUNE note (`ratings` vide) : la
 * moitié du roster peut être dans ce cas selon l'univers, il faut donc une
 * valeur de repli et non une exception.
 */
export const DEFAULT_ARCHETYPE: Archetype = "brute";

// ──────────────────────────────────────────────────────────────────────────
// Combattants
// ──────────────────────────────────────────────────────────────────────────

/** Camp d'un combattant. */
export type Side = "squad" | "enemy";

/**
 * Statistiques de combat d'un personnage, dérivées de la base (cf. `stats.ts`).
 * Nombres bruts : la mise à l'échelle par les objets et les passifs se fait au
 * montage du combat, jamais ici.
 */
export interface FighterStats {
  /** Points de vie maximum. */
  maxHp: number;
  /** Dégâts d'une frappe ordinaire. */
  strike: number;
  /** Points de jauge d'action gagnés par tick (frappe à 100). */
  speed: number;
  /** Énergie occulte générée par tick (escouade uniquement). */
  flux: number;
}

/** Fiche d'un combattant AVANT le combat (entrée de la simulation). */
export interface FighterSpec {
  /** `Character.id`. Un shikigami invoqué porte l'id de son invocateur suffixé. */
  id: string;
  name: string;
  side: Side;
  stats: FighterStats;
  archetype: Archetype;
  /** Le personnage a-t-il accès à l'ultime (attribut BOOLEAN de l'univers) ? */
  hasDomain: boolean;
}

// ──────────────────────────────────────────────────────────────────────────
// Interventions
// ──────────────────────────────────────────────────────────────────────────

/**
 * Le seul input du joueur pendant un combat : « le slot `slot` agit au tick
 * `tick` ». Le client envoie CETTE liste au serveur, et rien d'autre — ni
 * dégâts, ni résultat (cf. §14 du doc).
 *
 * `slot` indexe l'escouade (0…SQUAD_SIZE-1). Les shikigami invoqués ne sont pas
 * adressables : ils agissent seuls.
 */
export interface Intervention {
  tick: number;
  /**
   * Slot de l'escouade — sauf pour les deux kinds qui ne visent personne :
   *   - `"guard"` : ignoré, la garde est d'escouade ;
   *   - `"focus"` : index de l'ENNEMI à prendre pour cible.
   */
  slot: number;
  /**
   * `"technique"` par défaut (et absent des anciens logs, d'où l'optionalité).
   *
   * `"guard"` lève la GARDE : une défense d'escouade, gratuite mais en temps de
   * recharge, qui donne au joueur quelque chose à faire ENTRE deux fenêtres.
   *
   * `"focus"` désigne l'ennemi que l'escouade attaque. Sans elle, les frappes
   * partaient toujours sur le premier ennemi vivant : à deux ou trois
   * adversaires, le joueur regardait son escouade achever un comparse pendant
   * que l'élite le taillait en pièces, sans pouvoir rien y faire. C'est une
   * INTERVENTION comme les autres — donc journalisée, donc rejouée à
   * l'identique par le serveur (§14).
   */
  kind?: "technique" | "guard" | "focus";
}

/** Pourquoi une intervention a été ignorée (utile au debug et aux tests). */
export type InterventionReject =
  | "dead" // le slot est mort
  | "empty" // aucun personnage dans ce slot
  | "no-ability" // ni technique ni ultime disponible
  | "energy" // énergie insuffisante
  | "cooldown" // garde encore en temps de recharge
  | "no-target" // cible de focus inconnue ou déjà tombée
  | "out-of-range"; // tick hors bornes ou non croissant

// ──────────────────────────────────────────────────────────────────────────
// Journal de combat
// ──────────────────────────────────────────────────────────────────────────

/**
 * Un évènement de combat, dans l'ordre. Le client rejoue ce journal pour
 * animer ; il n'a donc jamais à ré-implémenter une règle.
 *
 * `t` est le tick. Les champs `from` / `to` / `who` / `by` portent des **uid**
 * de combattants (cf. `FighterOutcome`), jamais des `Character.id`.
 */
export type CombatEvent =
  | { t: number; kind: "strike"; from: string; to: string; damage: number }
  | { t: number; kind: "telegraph-start"; from: string; endsAt: number }
  | { t: number; kind: "telegraph-hit"; from: string; to: string; damage: number }
  | { t: number; kind: "telegraph-cancel"; from: string }
  | {
      t: number;
      kind: "technique";
      from: string;
      archetype: Archetype;
      /** Joué pendant une fenêtre : contre (offensif) ou parade (défensif). */
      timed: boolean;
      cost: number;
    }
  | { t: number; kind: "ultimate"; from: string }
  /** Garde levée : l'escouade encaisse moins jusqu'à `until`. */
  | { t: number; kind: "guard"; until: number }
  /** L'escouade change de cible. `to` est l'uid de l'ennemi visé. */
  | { t: number; kind: "focus"; to: string }
  /** La jauge d'ultime d'un membre d'escouade vient de se remplir. Émis par
   * le MOTEUR pour que l'interface n'ait pas à recalculer le remplissage —
   * seule façon de garantir que le bouton affiché correspond à l'action qui
   * partira réellement. */
  | { t: number; kind: "domain-ready"; who: string }
  | { t: number; kind: "summon"; from: string; summonId: string }
  | { t: number; kind: "parry"; by: string; absorbed: number }
  | { t: number; kind: "heal"; to: string; amount: number }
  | { t: number; kind: "survive"; who: string }
  | { t: number; kind: "death"; who: string }
  | { t: number; kind: "reject"; slot: number; reason: InterventionReject };

/**
 * État final d'un combattant à la sortie du combat.
 *
 * `uid` et `id` sont distincts parce qu'un même personnage peut apparaître
 * DEUX FOIS dans un combat (deux fléaux identiques à l'étage 7). `id` reste le
 * `Character.id` pour retrouver nom et image ; `uid` est la clé stable et
 * unique du combattant DANS ce combat, et c'est elle que le journal référence.
 */
export interface FighterOutcome {
  uid: string;
  id: string;
  hp: number;
  maxHp: number;
  alive: boolean;
}

/** Résultat complet d'un combat — c'est ce que le serveur recalcule. */
export interface CombatResult {
  /** L'escouade a-t-elle survécu ? */
  victory: boolean;
  /** Tick auquel le combat s'est arrêté (victoire, défaite ou plafond). */
  ticks: number;
  /** Défaite par épuisement du temps plutôt que par K.O. */
  timeout: boolean;
  /** État final, escouade puis ennemis, dans l'ordre d'entrée. */
  squad: FighterOutcome[];
  enemies: FighterOutcome[];
  /** Ennemis mis à terre (sert au score de la run). */
  enemiesKilled: number;
  /** Journal ordonné, pour l'animation. */
  events: CombatEvent[];
  /**
   * Énergie occulte à la fin de chaque tick.
   *
   * L'énergie n'est pas déductible du journal (elle monte en continu et se
   * dépense par paliers) : la sortir ici évite à l'interface de ré-implémenter
   * la régénération, donc de diverger du moteur. Le serveur ne renvoie pas ce
   * tableau au client — celui-ci l'a déjà, il simule le combat en local pour
   * l'animer.
   */
  energyByTick: number[];
}

// ──────────────────────────────────────────────────────────────────────────
// Étages
// ──────────────────────────────────────────────────────────────────────────

/**
 * Le COMBAT d'un étage. Il y en a un à chaque étage, sans exception : c'est
 * lui qui ouvre l'étage suivant, et rien d'autre.
 */
export type FightKind = "combat" | "elite" | "boss";

/**
 * Ce qui peut précéder le combat d'un étage — un bonus, jamais un passage.
 *
 * Un prélude ne remplace PAS le combat : il s'ajoute devant. Prendre la branche
 * qui en porte un coûte la récompense d'après-combat (cf. `FloorPlan`), ce qui
 * donne la règle du jeu en une phrase : **un gain par étage, avant le combat ou
 * après**.
 */
export type PreludeKind = "recruit" | "merchant" | "rest" | "event";

/** Tout type de nœud, prélude ou combat. Sert aux libellés d'interface. */
export type NodeKind = FightKind | PreludeKind;

/**
 * Une branche d'étage, prête à jouer.
 *
 * TOUTE branche comporte un combat : c'est le seul moyen de monter d'un étage.
 * `prelude` ajoute un bonus AVANT ce combat, et son prix est la récompense
 * d'après-combat — un gain par étage, pas deux.
 */
export interface FloorPlan {
  /** 1…TOWER_FLOORS. */
  floor: number;
  /** 0…STRATE_COUNT-1. */
  strate: number;
  /** Le combat de l'étage. Toujours présent. */
  kind: FightKind;
  /** Bonus précédant le combat, ou `null` si la branche va droit au but. */
  prelude: PreludeKind | null;
  /** Ids des ennemis à affronter. Jamais vide. */
  enemyIds: string[];
  /** Ids proposés au recrutement (prélude `recruit`). */
  recruitIds: string[];
  /**
   * Graine de sélection de l'évènement (prélude `event`). Un entier plutôt que
   * le slug : le catalogue d'évènements est de la donnée d'univers, il peut
   * grandir sans invalider les runs en cours.
   */
  eventIndex: number;
}

/**
 * Une branche donne-t-elle droit à une récompense après son combat ?
 *
 * Non si elle portait un prélude : le joueur a déjà encaissé son gain avant le
 * combat. C'est ce qui empêche la branche bonus d'être strictement meilleure
 * que la branche directe, et donc ce qui fait qu'il y a un choix.
 */
export function grantsReward(plan: FloorPlan): boolean {
  return plan.prelude === null;
}
