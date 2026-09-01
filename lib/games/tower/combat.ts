import {
  EFFECT_SPECS,
  NO_MODIFIERS,
  applyPct,
  type RunModifiers,
} from "./effects";
import { ULTIMATE, passiveOf, techniqueOf, type TechniqueSpec } from "./abilities";
import type {
  CombatEvent,
  CombatResult,
  FighterOutcome,
  FighterSpec,
  Intervention,
  InterventionReject,
} from "./types";

/**
 * Moteur de combat de « The Culling Tower » — module PUR et DÉTERMINISTE.
 *
 * C'est le cœur du jeu et sa pièce la plus sensible. Il est importé tel quel
 * par le client (pour animer) ET par le serveur (pour trancher), exactement
 * comme `lib/games/battle/combat.ts` : mêmes entrées → mêmes sorties, donc
 * l'animation raconte exactement ce que le serveur a validé.
 *
 * ── Le déterminisme est une règle de GAME DESIGN, pas une facilité technique ──
 * Aucun tirage aléatoire n'entre ici : les dégâts sont une multiplication, les
 * cadences des compteurs. Le hasard vit dans la GÉNÉRATION de l'étage (seed),
 * jamais dans sa résolution. Deux conséquences voulues :
 *   1. la re-simulation serveur est EXACTE, sans tolérance ni dérive (§14) ;
 *   2. le joueur peut anticiper qu'une frappe va tuer, donc son timing est une
 *      compétence et pas un pari.
 * Introduire un `Math.random()` ici casserait les deux d'un coup.
 *
 * ── Le combat en une phrase ──
 * Tout se résout seul ; le joueur n'a qu'un input, l'INTERVENTION, et le seul
 * moment où elle vaut cher est la FENÊTRE pendant laquelle un ennemi charge une
 * attaque. Frapper dans la fenêtre = contre (dégâts doublés, charge annulée).
 */

// ──────────────────────────────────────────────────────────────────────────
// Constantes de simulation
// ──────────────────────────────────────────────────────────────────────────

/** Durée d'un tick, en millisecondes de temps de jeu. */
export const TICK_MS = 100;
/** Ticks par seconde — les stats sont exprimées par seconde (cf. `stats.ts`). */
export const TICKS_PER_SECOND = 1000 / TICK_MS;

/** Plafond de durée d'un combat : au-delà, défaite par épuisement. */
export const MAX_TICKS = 900; // 90 s

/** Jauge d'action à atteindre pour frapper. */
export const ACTION_GAUGE = 100;

/** Plafond de la jauge d'énergie occulte de l'escouade. */
export const MAX_ENERGY = 100;

/**
 * Énergie occulte au premier tick de CHAQUE combat.
 *
 * Sans elle, la jauge part de zéro : avec un starter seul (flux ≈ 1,9/s) et une
 * technique à 40, la première fenêtre s'ouvre à 6 s avec 11 d'énergie, la
 * deuxième à 12 s avec 23, et un combat d'étage 1 se termine avant que le joueur
 * ait pu appuyer une seule fois. Il passait son premier combat — celui qui lui
 * apprend le jeu — à regarder des fenêtres qu'il ne pouvait pas saisir.
 *
 * À 30, la première fenêtre de tout combat est jouable, quel que soit
 * l'archétype. C'est la garantie qu'il y a toujours au moins une décision à
 * prendre, ce qui est la promesse du système.
 */
export const START_ENERGY = 30;

/**
 * Ticks entre deux charges d'un même ennemi (6 s).
 *
 * Réglé pour donner 4 fenêtres dans un combat ordinaire de 24 s et 7 à 8 dans
 * un boss : assez pour que le joueur ait plusieurs occasions de bien jouer,
 * assez peu pour que rater la bonne se paie.
 */
export const TELEGRAPH_PERIOD = 60;
/** Durée de base d'une fenêtre, avant passifs et objets. */
export const TELEGRAPH_DURATION = 15;
/** Multiplicateur de dégâts d'une attaque chargée. */
export const TELEGRAPH_MULT = 3;

/** Une technique ne peut jamais devenir gratuite, quelles que soient les remises. */
export const MIN_TECHNIQUE_COST = 5;

/** Multiplicateur appliqué à un contre (technique offensive dans une fenêtre). */
export const COUNTER_MULT = 2;

/**
 * LA GARDE — défense d'escouade, gratuite, en temps de recharge.
 *
 * Ajoutée après un retour de partie sans appel : entre deux fenêtres, espacées
 * de six secondes, le joueur n'avait STRICTEMENT rien à faire pendant que son
 * personnage s'usait coup après coup. Le combat se regardait plus qu'il ne se
 * jouait, et une escouade incomplète mourait sans que personne ait décidé quoi
 * que ce soit.
 *
 * Elle est volontairement GRATUITE : au début d'une run, l'énergie manque
 * justement quand on en aurait le plus besoin, et faire payer la seule défense
 * disponible aurait reproduit le problème. Son coût, c'est le temps de
 * recharge — et c'est ce qui en fait une décision : la garde dépensée sur des
 * coups ordinaires ne sera pas disponible pour l'attaque chargée qui arrive.
 */
export const GUARD_DURATION = 15; // 1,5 s
export const GUARD_COOLDOWN = 40; // 4 s
/** Part des dégâts absorbés pendant la garde. */
export const GUARD_REDUCTION = 0.7;
/** `slot` conventionnel d'une garde : elle n'appartient à personne. */
export const GUARD_SLOT = -1;

/**
 * Vitesse de remplissage de la jauge d'ultime, par point de PV perdu.
 *
 * Sans ce coefficient, la jauge se remplirait de `dégâts / PV max`, c'est-à-dire
 * qu'atteindre 100 exigerait d'encaisser 100 % de ses points de vie — donc de
 * mourir juste avant de pouvoir s'en servir. L'ultime serait littéralement
 * injouable. À 3, il faut perdre un tiers de ses PV : assez pour que la jauge
 * signifie « ça va mal », assez peu pour qu'on soit encore debout pour la
 * dépenser.
 */
export const DOMAIN_GAUGE_RATE = 3;

// ──────────────────────────────────────────────────────────────────────────
// Entrée
// ──────────────────────────────────────────────────────────────────────────

export interface CombatSetup {
  /** L'escouade, dans l'ordre des slots (1 à SQUAD_SIZE). */
  squad: FighterSpec[];
  /** Les ennemis de l'étage, dans l'ordre d'entrée. */
  enemies: FighterSpec[];
  /**
   * PV de départ des membres d'escouade, par slot. Les personnages ne sont pas
   * soignés entre deux étages : c'est ce qui fait de l'usure une ressource.
   * Absent ⇒ PV pleins.
   */
  squadHp?: (number | undefined)[];
  /** Modificateurs agrégés des objets. `NO_MODIFIERS` en phase 1. */
  modifiers?: RunModifiers;
  /** Le seul input du joueur, tel qu'envoyé au serveur. */
  interventions?: Intervention[];
}

// ──────────────────────────────────────────────────────────────────────────
// État interne
// ──────────────────────────────────────────────────────────────────────────

interface Runtime {
  uid: string;
  /** Rang d'entrée du combattant. Sert à ce que deux ennemis ne visent pas
   *  systématiquement la même cible au même tick. */
  seat: number;
  spec: FighterSpec;
  hp: number;
  maxHp: number;
  strike: number;
  /** Points de jauge par TICK (converti depuis la stat par seconde). */
  speed: number;
  /** Énergie par TICK (idem). */
  flux: number;
  gauge: number;
  alive: boolean;

  // ── escouade ──
  /** Slot du joueur, ou -1 pour un shikigami (non adressable). */
  slot: number;
  isSummon: boolean;
  /** Ticks au bout desquels un shikigami disparaît. */
  expiresAt: number | null;
  domainGauge: number;
  domainThreshold: number;
  /** Évite de ré-annoncer une jauge déjà signalée comme pleine. */
  domainAnnounced: boolean;
  usedSurvive: boolean;

  // ── ennemis ──
  sinceTelegraph: number;
  charging: boolean;
  chargeEndsAt: number;
}

interface State {
  tick: number;
  energy: number;
  events: CombatEvent[];
  squad: Runtime[];
  enemies: Runtime[];
  /** Shikigami invoqués — combattent avec l'escouade, ne la sauvent pas. */
  summons: Runtime[];
  enemiesKilled: number;
  /** Prochaine frappe ordinaire de l'escouade multipliée (technique `mark`). */
  pendingMark: number | null;
  /** Parades en réserve : absorbent entièrement la prochaine attaque reçue. */
  guards: number;
  /** Dernière technique jouée par l'escouade, pour `mimic`. */
  lastTechnique: TechniqueSpec | null;
  /** Dégâts encore convertibles en énergie (objet `ABSORPTION`). */
  absorption: number;
  /** L'objet « annule le premier télégraphe » a-t-il déjà servi ? */
  firstTelegraphUsed: boolean;
  /** Aucun ennemi ne peut télégraphier avant ce tick (ultime). */
  telegraphSuppressedUntil: number;
  /**
   * Index de l'ennemi que l'escouade attaque, ou `null` pour « le premier
   * vivant ». Piloté par les interventions `focus`.
   */
  focus: number | null;
  /** L'escouade est en garde jusqu'à ce tick (exclu). */
  guardUntil: number;
  /** La garde n'est re-levable qu'à partir de ce tick. */
  guardReadyAt: number;
  modifiers: RunModifiers;
  summonCount: number;
  energyByTick: number[];
}

// ──────────────────────────────────────────────────────────────────────────
// Simulation
// ──────────────────────────────────────────────────────────────────────────

/**
 * Joue un combat de bout en bout.
 *
 * Ordre STRICT à l'intérieur d'un tick — c'est le contrat que le serveur
 * rejoue, ne le modifier qu'en connaissance de cause :
 *   1. régénération d'énergie ;
 *   2. interventions déclarées à ce tick ;
 *   3. frappes de l'escouade puis des shikigami ;
 *   4. frappes ennemies (hors ennemis en charge) ;
 *   5. télégraphes : démarrage des charges, résolution des coups chargés ;
 *   6. expiration des shikigami et test de fin.
 *
 * Le point (2) précède (5) : c'est ce qui laisse au joueur la possibilité de
 * contrer au tout dernier tick d'une fenêtre.
 */
export function simulateCombat(setup: CombatSetup): CombatResult {
  const state = buildState(setup);
  const plan = planInterventions(setup.interventions ?? [], state);

  let ended = false;

  while (state.tick < MAX_TICKS && !ended) {
    regenEnergy(state);

    for (const intervention of plan.get(state.tick) ?? []) {
      resolveIntervention(state, intervention);
    }

    for (const fighter of [...state.squad, ...state.summons]) {
      advanceAndStrike(state, fighter, state.enemies);
    }

    for (const enemy of state.enemies) {
      if (enemy.charging) continue;
      advanceAndStrike(state, enemy, allyTargets(state));
    }

    advanceTelegraphs(state);
    expireSummons(state);
    state.energyByTick.push(Math.round(state.energy));

    ended = isOver(state);
    state.tick += 1;
  }

  const victory = state.enemies.every((e) => !e.alive);

  return {
    victory,
    ticks: state.tick,
    timeout: !victory && state.tick >= MAX_TICKS,
    squad: state.squad.map(toOutcome),
    enemies: state.enemies.map(toOutcome),
    enemiesKilled: state.enemiesKilled,
    events: state.events,
    energyByTick: state.energyByTick,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Montage
// ──────────────────────────────────────────────────────────────────────────

function buildState(setup: CombatSetup): State {
  const modifiers = setup.modifiers ?? NO_MODIFIERS;

  const squad = setup.squad.map((spec, index) => {
    const passive = passiveOf(spec.archetype);

    // Les objets appartiennent à l'escouade : leurs pourcentages ne touchent
    // jamais les ennemis.
    const maxHp = Math.max(
      1,
      Math.round(applyPct(spec.stats.maxHp, modifiers.PV_MAX_PCT)),
    );
    const strike = Math.max(
      1,
      Math.round(applyPct(spec.stats.strike, modifiers.FRAPPE_PCT)),
    );
    const speed = applyPct(spec.stats.speed, modifiers.CELERITE_PCT);
    const flux = applyPct(
      applyPct(spec.stats.flux, passive.fluxBonusPct),
      modifiers.FLUX_PCT,
    );

    const startHp = setup.squadHp?.[index];
    const hp =
      typeof startHp === "number" && Number.isFinite(startHp)
        ? Math.max(0, Math.min(maxHp, Math.round(startHp)))
        : maxHp;

    return {
      uid: `s${index}`,
      seat: index,
      spec,
      hp,
      maxHp,
      strike,
      speed: speed / TICKS_PER_SECOND,
      flux: flux / TICKS_PER_SECOND,
      gauge: (ACTION_GAUGE * passive.startGaugePct) / 100,
      alive: hp > 0,
      slot: index,
      isSummon: false,
      expiresAt: null,
      domainGauge: 0,
      domainThreshold: Math.max(
        10,
        applyPct(passive.ultimateThreshold, modifiers.ULTIME_SEUIL_PCT),
      ),
      domainAnnounced: false,
      usedSurvive: false,
      sinceTelegraph: 0,
      charging: false,
      chargeEndsAt: 0,
    } satisfies Runtime;
  });

  const enemies = setup.enemies.map((spec, index) => ({
    uid: `e${index}`,
    seat: index,
    spec,
    hp: spec.stats.maxHp,
    maxHp: spec.stats.maxHp,
    strike: spec.stats.strike,
    speed: spec.stats.speed / TICKS_PER_SECOND,
    flux: 0,
    gauge: 0,
    alive: spec.stats.maxHp > 0,
    slot: -1,
    isSummon: false,
    expiresAt: null,
    domainGauge: 0,
    domainThreshold: Infinity,
    domainAnnounced: false,
    usedSurvive: false,
    // Décalage d'un ennemi à l'autre : sans lui, trois ennemis chargent en
    // même temps au même tick et la fenêtre devient un mur infranchissable.
    sinceTelegraph: -index * 12,
    charging: false,
    chargeEndsAt: 0,
  })) satisfies Runtime[];

  return {
    tick: 0,
    energy: Math.min(
      MAX_ENERGY,
      START_ENERGY + Math.max(0, modifiers.ENERGIE_DEPART),
    ),
    events: [],
    squad,
    enemies,
    summons: [],
    enemiesKilled: 0,
    pendingMark: null,
    guards: 0,
    lastTechnique: null,
    absorption: Math.max(0, modifiers.ABSORPTION),
    firstTelegraphUsed: false,
    telegraphSuppressedUntil: -1,
    focus: null,
    guardUntil: -1,
    guardReadyAt: 0,
    modifiers,
    summonCount: 0,
    energyByTick: [],
  };
}

/**
 * Valide les interventions et les range par tick.
 *
 * Les rejets sont journalisés plutôt que levés : le serveur doit pouvoir
 * rejouer un log douteux jusqu'au bout pour le COMPARER, pas s'arrêter au
 * premier écart. Une intervention hors bornes ou dont le tick ne progresse pas
 * strictement est écartée — c'est la garde anti-rejeu du §14.
 */
function planInterventions(
  interventions: readonly Intervention[],
  state: State,
): Map<number, Intervention[]> {
  const plan = new Map<number, Intervention[]>();
  let previousTick = -1;

  for (const item of interventions) {
    const tick = Math.trunc(item?.tick ?? -1);
    const slot = Math.trunc(item?.slot ?? -1);
    const valid =
      Number.isFinite(tick) &&
      tick >= 0 &&
      tick < MAX_TICKS &&
      tick > previousTick;

    if (!valid) {
      state.events.push({ t: Math.max(0, tick), kind: "reject", slot, reason: "out-of-range" });
      continue;
    }

    previousTick = tick;
    const entry: Intervention = { tick, slot, kind: item.kind ?? "technique" };
    const bucket = plan.get(tick);
    if (bucket) bucket.push(entry);
    else plan.set(tick, [entry]);
  }

  return plan;
}

// ──────────────────────────────────────────────────────────────────────────
// Étapes d'un tick
// ──────────────────────────────────────────────────────────────────────────

/** Les shikigami ne génèrent pas d'énergie : ils ne sont pas de l'escouade. */
function regenEnergy(state: State): void {
  let gained = 0;
  for (const fighter of state.squad) {
    if (fighter.alive) gained += fighter.flux;
  }
  state.energy = Math.min(MAX_ENERGY, state.energy + gained);
}

/** Cibles d'un ennemi : l'escouade d'abord, les shikigami ensuite. */
function allyTargets(state: State): Runtime[] {
  return [...state.squad, ...state.summons];
}

/** Premier combattant vivant d'une liste. */
function firstAlive(fighters: Runtime[]): Runtime | null {
  return fighters.find((f) => f.alive) ?? null;
}

/**
 * Cible des frappes de l'ESCOUADE et de ses shikigami : l'ennemi désigné par le
 * joueur s'il tient encore debout, le premier vivant sinon.
 *
 * Le repli est important : une cible qui tombe ne doit pas figer l'escouade sur
 * un cadavre, et le joueur n'a pas à re-cliquer après chaque mort. Le focus est
 * une PRÉFÉRENCE, pas une contrainte.
 */
function squadTarget(state: State, targets: Runtime[]): Runtime | null {
  if (state.focus !== null) {
    const chosen = targets[state.focus];
    if (chosen?.alive) return chosen;
  }
  return firstAlive(targets);
}

/**
 * Cible d'un ATTAQUANT ENNEMI : n'importe quel allié encore debout.
 *
 * Les ennemis frappaient tous le premier slot, si bien qu'un personnage
 * encaissait l'intégralité du combat pendant que les deux autres finissaient
 * intacts. Cela donnait un jeu bancal : un « tank » involontaire mourait sans
 * qu'on l'ait décidé, et la position dans l'escouade — que le joueur ne choisit
 * pas — comptait plus que la composition.
 *
 * Le tirage est DÉTERMINISTE, dérivé du tick et du siège de l'attaquant : c'est
 * la condition non négociable pour que la re-simulation serveur reste exacte
 * (§14 du doc). Le siège entre dans le calcul pour que deux ennemis agissant au
 * même tick ne convergent pas sur la même victime.
 */
function pickTarget(
  state: State,
  attacker: Runtime,
  targets: Runtime[],
): Runtime | null {
  const alive = targets.filter((f) => f.alive);
  if (alive.length === 0) return null;
  if (alive.length === 1) return alive[0];
  return alive[spread(state.tick, attacker.seat, alive.length)];
}

/**
 * Indice pseudo-aléatoire mais REPRODUCTIBLE, dérivé de `(tick, siège)`.
 *
 * Un simple modulo produirait des motifs — avec des cadences régulières, le
 * même slot serait touché encore et encore. Le brassage de bits répartit sans
 * introduire la moindre source de hasard réel.
 */
function spread(tick: number, seat: number, count: number): number {
  let h = Math.imul(tick + 1, 0x9e3779b1) ^ Math.imul(seat + 1, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h ^= h >>> 13;
  return Math.abs(h) % count;
}

function advanceAndStrike(state: State, fighter: Runtime, targets: Runtime[]): void {
  if (!fighter.alive) return;

  fighter.gauge += fighter.speed;
  if (fighter.gauge < ACTION_GAUGE) return;

  fighter.gauge -= ACTION_GAUGE;

  // Un ennemi frappe n'importe qui ; l'escouade et les shikigami visent
  // toujours l'adversaire de devant (le joueur, lui, choisit ses techniques).
  const target =
    fighter.spec.side === "enemy"
      ? pickTarget(state, fighter, targets)
      : squadTarget(state, targets);
  if (!target) return;

  let mult = 1;

  // Passif « Poigne » : bonus tant que le porteur est au-dessus du seuil.
  // Un shikigami n'a pas de passif propre — il emprunte l'archétype neutre de
  // son invocateur pour le typage, il ne doit pas en hériter les bonus.
  const passive = passiveOf(fighter.spec.archetype);
  if (
    !fighter.isSummon &&
    passive.strikeBonusPct > 0 &&
    (fighter.hp / fighter.maxHp) * 100 > passive.strikeBonusHpPct
  ) {
    mult *= 1 + passive.strikeBonusPct / 100;
  }

  // Marque posée par « Point faible » : consommée par la première frappe
  // ordinaire de l'escouade qui suit, shikigami compris.
  if (fighter.spec.side === "squad" && state.pendingMark !== null) {
    mult *= state.pendingMark;
    state.pendingMark = null;
  }

  const damage = Math.max(1, Math.round(fighter.strike * mult));
  dealDamage(state, fighter, target, damage, "strike");
}

/**
 * Fait avancer les compteurs de charge et résout les coups chargés.
 *
 * Une charge démarrée à `T` se résout à `T + durée`. Comme les interventions
 * sont jouées AVANT cette étape, le joueur peut contrer jusqu'au dernier tick.
 */
function advanceTelegraphs(state: State): void {
  const duration = telegraphDuration(state);

  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;

    if (enemy.charging) {
      if (state.tick >= enemy.chargeEndsAt) {
        enemy.charging = false;
        enemy.sinceTelegraph = 0;
        // Le coup chargé vise lui aussi n'importe qui : le télégraphe
        // annonce QUAND il tombe, pas sur qui.
        const target = pickTarget(state, enemy, allyTargets(state));
        if (target) {
          const damage = Math.max(1, Math.round(enemy.strike * TELEGRAPH_MULT));
          dealDamage(state, enemy, target, damage, "telegraph-hit");
        }
      }
      continue;
    }

    enemy.sinceTelegraph += 1;
    if (enemy.sinceTelegraph < TELEGRAPH_PERIOD) continue;
    if (state.tick < state.telegraphSuppressedUntil) continue;

    // Objet « annule le premier télégraphe » : consommé une seule fois.
    if (state.modifiers.ANNULE_PREMIER_TELEGRAPHE >= 1 && !state.firstTelegraphUsed) {
      state.firstTelegraphUsed = true;
      enemy.sinceTelegraph = 0;
      state.events.push({ t: state.tick, kind: "telegraph-cancel", from: enemy.uid });
      continue;
    }

    enemy.charging = true;
    enemy.chargeEndsAt = state.tick + duration;
    state.events.push({
      t: state.tick,
      kind: "telegraph-start",
      from: enemy.uid,
      endsAt: enemy.chargeEndsAt,
    });
  }
}

/**
 * Durée d'une fenêtre : base, allongée par le passif « Lecture » du membre
 * d'escouade vivant qui l'a (effet d'ESCOUADE) et par les objets.
 *
 * Le total est plafonné par le `cap` de `FENETRE_PCT` — passif compris. Sans ce
 * plafond commun, empiler « Lecture » et deux objets rend chaque fenêtre
 * contrable à coup sûr et le combat perd toute tension.
 */
export function telegraphDuration(state: State): number {
  let bonus = state.modifiers.FENETRE_PCT;

  for (const fighter of state.squad) {
    if (!fighter.alive) continue;
    bonus += passiveOf(fighter.spec.archetype).telegraphBonusPct;
  }

  const cap = EFFECT_SPECS.FENETRE_PCT.cap;
  if (cap !== null && bonus > cap) bonus = cap;

  return Math.max(1, Math.round(applyPct(TELEGRAPH_DURATION, bonus)));
}

function expireSummons(state: State): void {
  for (const summon of state.summons) {
    if (!summon.alive) continue;
    if (summon.expiresAt !== null && state.tick >= summon.expiresAt) {
      summon.alive = false;
      state.events.push({ t: state.tick, kind: "death", who: summon.uid });
    }
  }
}

/** Fin de combat : escouade décimée (les shikigami ne comptent pas) ou ennemis à terre. */
function isOver(state: State): boolean {
  return (
    state.squad.every((f) => !f.alive) || state.enemies.every((e) => !e.alive)
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Dégâts
// ──────────────────────────────────────────────────────────────────────────

function dealDamage(
  state: State,
  from: Runtime,
  to: Runtime,
  rawDamage: number,
  kind: "strike" | "telegraph-hit",
): void {
  let damage = rawDamage;

  // Parade posée par « Encaisse » : absorbe entièrement une attaque entrante.
  if (to.spec.side === "squad" && state.guards > 0) {
    state.guards -= 1;
    state.events.push({ t: state.tick, kind: "parry", by: to.uid, absorbed: damage });
    return;
  }

  // Garde levée : l'escouade encaisse une fraction seulement. S'applique AUSSI
  // au coup chargé — c'est la réponse défensive de secours quand l'énergie
  // manque pour contrer.
  if (to.spec.side === "squad" && state.tick < state.guardUntil) {
    damage = Math.max(1, Math.round(damage * (1 - GUARD_REDUCTION)));
  }

  // Objet « Inversion » : les premiers dégâts subis deviennent de l'énergie.
  if (to.spec.side === "squad" && state.absorption > 0) {
    const converted = Math.min(state.absorption, damage);
    state.absorption -= converted;
    damage -= converted;
    state.energy = Math.min(MAX_ENERGY, state.energy + converted);
    if (damage <= 0) return;
  }

  to.hp -= damage;

  // La jauge d'ultime se remplit avec les dégâts SUBIS : elle arrive quand ça
  // va mal, ce qui en fait un retournement plutôt qu'une récompense.
  if (to.spec.side === "squad" && to.spec.hasDomain) {
    to.domainGauge = Math.min(
      200,
      to.domainGauge + (damage / to.maxHp) * 100 * DOMAIN_GAUGE_RATE,
    );
    if (!to.domainAnnounced && to.domainGauge >= to.domainThreshold) {
      to.domainAnnounced = true;
      state.events.push({ t: state.tick, kind: "domain-ready", who: to.uid });
    }
  }

  state.events.push(
    kind === "strike"
      ? { t: state.tick, kind: "strike", from: from.uid, to: to.uid, damage }
      : { t: state.tick, kind: "telegraph-hit", from: from.uid, to: to.uid, damage },
  );

  if (to.hp > 0) return;

  // Passif « Ténacité » : un seul sursis par combat.
  const passive = passiveOf(to.spec.archetype);
  if (passive.survivesFatal && !to.usedSurvive && !to.isSummon) {
    to.usedSurvive = true;
    to.hp = 1;
    state.events.push({ t: state.tick, kind: "survive", who: to.uid });
    return;
  }

  to.hp = 0;
  to.alive = false;
  state.events.push({ t: state.tick, kind: "death", who: to.uid });

  if (to.spec.side === "enemy") {
    state.enemiesKilled += 1;
    healOnKill(state, from);
  }
}

/** Passif « Fléau » et objet de soin par abattage. */
function healOnKill(state: State, killer: Runtime): void {
  if (killer.spec.side !== "squad" || !killer.alive) return;

  const pct =
    passiveOf(killer.spec.archetype).healOnKillPct +
    state.modifiers.SOIN_PAR_KILL_PCT;
  if (pct <= 0) return;

  const amount = Math.round((killer.maxHp * pct) / 100);
  if (amount <= 0) return;

  killer.hp = Math.min(killer.maxHp, killer.hp + amount);
  state.events.push({ t: state.tick, kind: "heal", to: killer.uid, amount });
}

// ──────────────────────────────────────────────────────────────────────────
// Interventions
// ──────────────────────────────────────────────────────────────────────────

function reject(state: State, slot: number, reason: InterventionReject): void {
  state.events.push({ t: state.tick, kind: "reject", slot, reason });
}

/**
 * Résout une intervention.
 *
 * L'ULTIME REMPLACE LA TECHNIQUE quand sa jauge est pleine — il n'a pas de
 * bouton à lui. C'est ce qui garde l'interface à trois boutons : un personnage
 * n'a jamais qu'UNE action disponible, donc jamais d'ambiguïté sur ce qu'un
 * appui déclenche.
 */
function resolveIntervention(state: State, intervention: Intervention): void {
  const { slot } = intervention;

  if (intervention.kind === "guard") return raiseGuard(state);
  if (intervention.kind === "focus") return setFocus(state, slot);

  const fighter = state.squad[slot];

  if (!fighter) return reject(state, slot, "empty");
  if (!fighter.alive) return reject(state, slot, "dead");

  if (fighter.spec.hasDomain && fighter.domainGauge >= fighter.domainThreshold) {
    fighter.domainGauge = 0;
    fighter.domainAnnounced = false;
    return castUltimate(state, fighter);
  }

  const technique = techniqueOf(fighter.spec.archetype);
  if (!technique) return reject(state, slot, "no-ability");

  const cost = techniqueCost(state, fighter, technique);
  if (state.energy < cost) return reject(state, slot, "energy");

  state.energy -= cost;
  castTechnique(state, fighter, technique, cost);
}

/**
 * Désigne l'ennemi que l'escouade attaque.
 *
 * Refusé sur un ennemi inconnu ou déjà tombé, et journalisé comme tel : un
 * focus accepté en silence sur un index absurde laisserait le serveur et le
 * client diverger sans que rien ne le signale.
 */
function setFocus(state: State, index: number): void {
  const enemy = state.enemies[index];
  if (!enemy || !enemy.alive) return reject(state, index, "no-target");

  state.focus = index;
  state.events.push({ t: state.tick, kind: "focus", to: enemy.uid });
}

/**
 * Lève la garde, si elle est disponible.
 *
 * Refusée pendant sa recharge plutôt qu'ignorée en silence : le journal doit
 * dire au serveur pourquoi une intervention n'a rien produit, sinon un log
 * légitime et un log trafiqué se ressemblent.
 */
function raiseGuard(state: State): void {
  if (state.tick < state.guardReadyAt) {
    return reject(state, GUARD_SLOT, "cooldown");
  }
  state.guardUntil = state.tick + GUARD_DURATION;
  state.guardReadyAt = state.tick + GUARD_COOLDOWN;
  state.events.push({ t: state.tick, kind: "guard", until: state.guardUntil });
}

/** Coût effectif : base, remise du passif, puis modificateur d'objet. */
function techniqueCost(
  state: State,
  fighter: Runtime,
  technique: TechniqueSpec,
): number {
  const discount = passiveOf(fighter.spec.archetype).techniqueDiscount;
  const raw = technique.cost - discount + state.modifiers.COUT_TECHNIQUE;
  return Math.max(MIN_TECHNIQUE_COST, Math.round(raw));
}

/** Un ennemi est-il en train de charger ? C'est la définition de « fenêtre ouverte ». */
function windowOpen(state: State): boolean {
  return state.enemies.some((e) => e.alive && e.charging);
}

/**
 * Interrompt la charge d'un ennemi. Renvoie `true` si une charge a bien été
 * annulée — c'est ce booléen qui décide du doublement des dégâts.
 */
function cancelCharge(state: State, enemy: Runtime): boolean {
  if (!enemy.charging) return false;
  enemy.charging = false;
  enemy.sinceTelegraph = 0;
  state.events.push({ t: state.tick, kind: "telegraph-cancel", from: enemy.uid });
  return true;
}

function castTechnique(
  state: State,
  fighter: Runtime,
  technique: TechniqueSpec,
  cost: number,
): void {
  const timed = windowOpen(state);

  state.events.push({
    t: state.tick,
    kind: "technique",
    from: fighter.uid,
    archetype: technique.archetype,
    timed,
    cost,
  });

  if (technique.effect.type !== "mimic") state.lastTechnique = technique;

  applyTechnique(state, fighter, technique, timed);
}

/**
 * Règle uniforme du contre : **une technique OFFENSIVE jouée pendant une
 * fenêtre annule la charge de sa cible, et ses dégâts éventuels sont doublés.**
 *
 * Uniforme y compris pour les techniques qui n'infligent rien (`mark`) : elles
 * annulent quand même la charge, ce qui évite le pire ressenti possible du jeu
 * — contrer au bon moment et ne rien voir se passer.
 */
function applyTechnique(
  state: State,
  fighter: Runtime,
  technique: TechniqueSpec,
  timed: boolean,
): void {
  const effect = technique.effect;

  if (!technique.offensive) {
    // Défensif : la parade est d'escouade, pas individuelle — c'est ce qui
    // permet de protéger le personnage en première ligne, qui n'est pas
    // forcément celui qui lance.
    state.guards += 1;
    if (effect.type === "guard" && timed) {
      const refund = Math.round((technique.cost * effect.refundPct) / 100);
      state.energy = Math.min(MAX_ENERGY, state.energy + refund);
    }
    return;
  }

  // `mimic` est traité AVANT toute annulation de charge : s'il consommait la
  // fenêtre lui-même, la technique qu'il rejoue la trouverait déjà fermée et
  // perdrait son contre — le pire des bugs possibles ici, invisible et rare.
  if (effect.type === "mimic") {
    const previous = state.lastTechnique;
    if (previous && previous.effect.type !== "mimic") {
      applyTechnique(state, fighter, previous, timed);
      return;
    }
    // Sans technique précédente, `mimic` dégénère en frappe simple plutôt
    // qu'en clic perdu.
    const target = squadTarget(state, state.enemies);
    if (target) strikeWithCounter(state, fighter, target, 1, timed);
    return;
  }

  const primary = squadTarget(state, state.enemies);
  if (!primary) return;

  switch (effect.type) {
    case "burst":
      strikeWithCounter(state, fighter, primary, effect.mult, timed);
      return;

    case "multi": {
      // Le contre se joue sur le PREMIER coup ; les suivants suivent la cible
      // courante, qui peut changer si le premier l'abat.
      let counterLeft = timed;
      for (let i = 0; i < effect.hits; i += 1) {
        const target = squadTarget(state, state.enemies);
        if (!target) return;
        strikeWithCounter(state, fighter, target, effect.mult, counterLeft);
        counterLeft = false;
      }
      return;
    }

    case "shove":
      // Sa signature : elle interrompt la charge même hors fenêtre. Le contre
      // reste géré par `strikeWithCounter`, qui voit la charge avant elle.
      strikeWithCounter(state, fighter, primary, effect.mult, timed, true);
      return;

    case "sweep":
      for (const enemy of [...state.enemies]) {
        if (!enemy.alive) continue;
        strikeWithCounter(state, fighter, enemy, effect.mult, timed);
      }
      return;

    case "mark":
      state.pendingMark = effect.mult;
      // Une technique offensive jouée dans une fenêtre annule toujours la
      // charge, même quand elle n'inflige rien : contrer au bon moment et ne
      // rien voir se passer serait le pire ressenti du jeu.
      if (timed) consumeCharge(state, primary);
      return;

    case "summon": {
      const countered = timed && consumeCharge(state, primary);
      spawnSummon(
        state,
        fighter,
        effect.hpPct,
        effect.ticks,
        countered ? COUNTER_MULT : 1,
      );
      return;
    }

    case "guard":
      // Traité plus haut (branche non offensive) ; présent pour l'exhaustivité.
      return;
  }
}

/**
 * Frappe une cible en appliquant la règle uniforme du contre : si la cible est
 * en train de charger et que le joueur a joué dans la fenêtre, la charge est
 * annulée et les dégâts sont doublés.
 *
 * `alwaysCancel` sert à la seule technique `shove`, dont la signature est
 * d'interrompre une charge même hors fenêtre — sans doubler pour autant.
 */
function strikeWithCounter(
  state: State,
  from: Runtime,
  target: Runtime,
  mult: number,
  timed: boolean,
  alwaysCancel = false,
): void {
  const countered = timed && consumeCharge(state, target);
  if (!countered && alwaysCancel) cancelCharge(state, target);
  hit(state, from, target, mult * (countered ? COUNTER_MULT : 1));
}

/** Annule une charge et crédite le gain d'énergie de l'objet `CONTRE_GAIN`. */
function consumeCharge(state: State, enemy: Runtime): boolean {
  if (!cancelCharge(state, enemy)) return false;
  state.energy = Math.min(MAX_ENERGY, state.energy + state.modifiers.CONTRE_GAIN);
  return true;
}

function hit(state: State, from: Runtime, to: Runtime, mult: number): void {
  if (!to.alive) return;
  const damage = Math.max(1, Math.round(from.strike * mult));
  dealDamage(state, from, to, damage, "strike");
}

function spawnSummon(
  state: State,
  caster: Runtime,
  hpPct: number,
  ticks: number,
  bonus: number,
): void {
  const uid = `x${state.summonCount}`;
  state.summonCount += 1;

  const maxHp = Math.max(1, Math.round((caster.maxHp * hpPct) / 100));

  state.summons.push({
    uid,
    seat: state.summonCount,
    spec: {
      id: `${caster.spec.id}-shikigami`,
      name: `Shikigami de ${caster.spec.name}`,
      side: "squad",
      stats: { maxHp, strike: caster.strike, speed: 0, flux: 0 },
      // Un shikigami n'a ni passif ni technique propres : `brute` sans note
      // donne un profil neutre, et il n'est de toute façon pas adressable.
      archetype: "brute",
      hasDomain: false,
    },
    hp: maxHp,
    maxHp,
    strike: caster.strike,
    speed: caster.speed,
    flux: 0,
    gauge: 0,
    alive: true,
    slot: -1,
    isSummon: true,
    expiresAt: state.tick + ticks,
    domainGauge: 0,
    domainThreshold: Infinity,
    domainAnnounced: false,
    usedSurvive: false,
    sinceTelegraph: 0,
    charging: false,
    chargeEndsAt: 0,
  });

  state.events.push({ t: state.tick, kind: "summon", from: caster.uid, summonId: uid });

  // Coup d'entrée : sans lui, invoquer pendant une fenêtre n'aurait aucun
  // effet visible et le contre serait perdu.
  const target = squadTarget(state, state.enemies);
  if (target) hit(state, caster, target, 0.5 * bonus);
}

function castUltimate(state: State, fighter: Runtime): void {
  state.events.push({ t: state.tick, kind: "ultimate", from: fighter.uid });

  for (const enemy of [...state.enemies]) {
    if (!enemy.alive) continue;
    cancelCharge(state, enemy);
    hit(state, fighter, enemy, ULTIMATE.mult);
  }

  state.telegraphSuppressedUntil = state.tick + ULTIMATE.suppressTicks;
}

// ──────────────────────────────────────────────────────────────────────────
// Sortie
// ──────────────────────────────────────────────────────────────────────────

function toOutcome(fighter: Runtime): FighterOutcome {
  return {
    uid: fighter.uid,
    id: fighter.spec.id,
    hp: Math.max(0, Math.round(fighter.hp)),
    maxHp: fighter.maxHp,
    alive: fighter.alive,
  };
}
