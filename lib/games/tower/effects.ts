/**
 * Catalogue des EFFETS d'objets — module PUR, source de vérité unique.
 *
 * Il est lu par TROIS appelants, et c'est tout l'intérêt de le centraliser :
 *  1. le moteur de combat, qui applique les modificateurs agrégés ;
 *  2. le formulaire admin du roster Item, qui construit son `<select>` et ses
 *    bornes de saisie depuis `EFFECT_SPECS` (phase 2) ;
 *  3. l'UI du jeu, qui affiche l'effet d'un objet en une ligne lisible.
 *
 * Ajouter un effet = une entrée ici. Ni l'admin ni l'UI n'ont à bouger.
 *
 * ⚠️ La phase 1 n'expose aucun objet au joueur : `NO_MODIFIERS` est la seule
 * valeur qui circule. Le module existe dès maintenant pour que `combat.ts`
 * prenne ses modificateurs en paramètre au lieu de les découvrir en phase 2 —
 * changer une signature de simulation après coup coûte bien plus cher.
 */

/** Les effets qu'un objet peut porter. Liste FERMÉE, validée côté serveur. */
export type EffectKind =
  | "FRAPPE_PCT"
  | "PV_MAX_PCT"
  | "FLUX_PCT"
  | "CELERITE_PCT"
  | "FENETRE_PCT"
  | "ENERGIE_DEPART"
  | "COUT_TECHNIQUE"
  | "CONTRE_GAIN"
  | "SOIN_PAR_KILL_PCT"
  | "ABSORPTION"
  | "ANNULE_PREMIER_TELEGRAPHE"
  | "REVIVE_UNE_FOIS"
  | "ULTIME_SEUIL_PCT"
  | "FRAGMENTS_PCT"
  | "ENNEMI_SUPP";

export interface EffectSpec {
  kind: EffectKind;
  /** Libellé du `<select>` admin. */
  label: string;
  /** Unité affichée à côté du champ de saisie ("%", "énergie", "PV"…). */
  unit: string;
  /** Bornes de saisie. Une valeur hors bornes est REFUSÉE à l'écriture. */
  min: number;
  max: number;
  /**
   * Plafond du CUMUL de cet effet sur une run, passifs compris. `null` = pas de
   * plafond. Il vit ici et non dans la donnée : sinon trois objets à +50 %
   * saisis en admin contournent l'équilibrage sans que personne s'en aperçoive.
   */
  cap: number | null;
  /** Gabarit d'affichage joueur ; `{v}` est remplacé par la valeur signée. */
  template: string;
}

export const EFFECT_SPECS: Record<EffectKind, EffectSpec> = {
  FRAPPE_PCT: {
    kind: "FRAPPE_PCT",
    label: "Frappe",
    unit: "%",
    min: -50,
    max: 50,
    cap: 120,
    template: "{v} % de dégâts",
  },
  PV_MAX_PCT: {
    kind: "PV_MAX_PCT",
    label: "PV maximum",
    unit: "%",
    min: -50,
    max: 50,
    cap: 120,
    template: "{v} % de PV max",
  },
  FLUX_PCT: {
    kind: "FLUX_PCT",
    label: "Génération d'énergie",
    unit: "%",
    min: -50,
    max: 60,
    cap: 150,
    template: "{v} % d'énergie occulte",
  },
  CELERITE_PCT: {
    kind: "CELERITE_PCT",
    label: "Célérité",
    unit: "%",
    min: -40,
    max: 40,
    cap: 80,
    template: "{v} % de célérité",
  },
  FENETRE_PCT: {
    kind: "FENETRE_PCT",
    label: "Durée des fenêtres ennemies",
    unit: "%",
    min: -30,
    max: 50,
    // Le plafond le plus important du jeu : au-delà, le joueur contre tout et
    // le combat n'a plus de tension (cf. §8 du doc). Le passif « Lecture »
    // (+40 %) compte dans ce total.
    cap: 80,
    template: "{v} % de durée des fenêtres",
  },
  ENERGIE_DEPART: {
    kind: "ENERGIE_DEPART",
    label: "Énergie au début du combat",
    unit: "énergie",
    min: 0,
    max: 60,
    cap: 80,
    template: "{v} énergie au début du combat",
  },
  COUT_TECHNIQUE: {
    kind: "COUT_TECHNIQUE",
    label: "Coût des techniques",
    unit: "énergie",
    min: -25,
    max: 25,
    // Cumulé au passif « Sort inné » (-10), plafonné pour qu'une technique ne
    // devienne jamais gratuite.
    cap: 30,
    template: "{v} énergie sur le coût des techniques",
  },
  CONTRE_GAIN: {
    kind: "CONTRE_GAIN",
    label: "Énergie rendue par un contre",
    unit: "énergie",
    min: 0,
    max: 30,
    cap: 40,
    template: "{v} énergie par contre réussi",
  },
  SOIN_PAR_KILL_PCT: {
    kind: "SOIN_PAR_KILL_PCT",
    label: "Soin par ennemi tué",
    unit: "% PV max",
    min: 0,
    max: 20,
    cap: 40,
    template: "{v} % des PV max soignés par ennemi tué",
  },
  ABSORPTION: {
    kind: "ABSORPTION",
    label: "Dégâts convertis en énergie (par combat)",
    unit: "PV",
    min: 0,
    max: 60,
    cap: 80,
    template: "les {v} premiers dégâts subis deviennent de l'énergie",
  },
  ANNULE_PREMIER_TELEGRAPHE: {
    kind: "ANNULE_PREMIER_TELEGRAPHE",
    label: "Annule le premier télégraphe",
    unit: "1 = actif",
    min: 0,
    max: 1,
    cap: 1,
    template: "le premier télégraphe de chaque combat est annulé",
  },
  REVIVE_UNE_FOIS: {
    kind: "REVIVE_UNE_FOIS",
    label: "Résurrection (une fois par run)",
    unit: "% PV",
    min: 0,
    max: 100,
    cap: 100,
    template: "le premier personnage tombé revient à {v} % de PV",
  },
  ULTIME_SEUIL_PCT: {
    kind: "ULTIME_SEUIL_PCT",
    label: "Seuil de l'ultime",
    unit: "%",
    min: -50,
    max: 50,
    cap: 60,
    template: "{v} % sur la jauge d'ultime requise",
  },
  FRAGMENTS_PCT: {
    kind: "FRAGMENTS_PCT",
    label: "Fragments gagnés",
    unit: "%",
    min: -50,
    max: 100,
    cap: 200,
    template: "{v} % de fragments",
  },
  ENNEMI_SUPP: {
    kind: "ENNEMI_SUPP",
    label: "Ennemis supplémentaires",
    unit: "ennemis",
    min: 0,
    max: 2,
    cap: 2,
    template: "{v} ennemi(s) de plus par combat",
  },
};

/** Les clés, dans l'ordre d'affichage du `<select>` admin. */
export const EFFECT_KINDS = Object.keys(EFFECT_SPECS) as EffectKind[];

/** Garde anti-tamper : la valeur vient-elle bien du catalogue ? */
export function isEffectKind(value: unknown): value is EffectKind {
  return typeof value === "string" && value in EFFECT_SPECS;
}

/**
 * Ramène une valeur saisie dans les bornes de son effet. Utilisé à l'ÉCRITURE
 * (admin) comme à la LECTURE (une ligne écrite avant un durcissement des bornes
 * ne doit pas casser le combat).
 */
export function clampEffectValue(kind: EffectKind, value: number): number {
  const spec = EFFECT_SPECS[kind];
  if (!Number.isFinite(value)) return 0;
  return Math.max(spec.min, Math.min(spec.max, Math.trunc(value)));
}

/** Rendu joueur d'un effet, ex. « +15 % de dégâts ». */
export function describeEffect(kind: EffectKind, value: number): string {
  const spec = EFFECT_SPECS[kind];
  const signed = value > 0 ? `+${value}` : String(value);
  return spec.template.replace("{v}", signed);
}

// ──────────────────────────────────────────────────────────────────────────
// Agrégation
// ──────────────────────────────────────────────────────────────────────────

/** Un effet porté par un objet ou un passif, prêt à être agrégé. */
export interface EffectInstance {
  kind: EffectKind;
  value: number;
}

/**
 * Somme des effets d'une run, PLAFONNÉE effet par effet. C'est ce que
 * `combat.ts` reçoit : il ne connaît jamais les objets eux-mêmes, seulement
 * leur résultat chiffré.
 */
export type RunModifiers = Record<EffectKind, number>;

/** Aucun objet : tous les modificateurs à zéro (l'état de la phase 1). */
export const NO_MODIFIERS: RunModifiers = Object.freeze(
  Object.fromEntries(EFFECT_KINDS.map((k) => [k, 0])) as RunModifiers,
);

/**
 * Agrège une liste d'effets en appliquant le plafond de chacun.
 *
 * Le plafond est appliqué APRÈS la somme et seulement vers le haut : un cumul
 * négatif (des malus qui s'empilent) reste possible, c'est au joueur d'assumer
 * l'objet à double tranchant qu'il a ramassé.
 */
export function aggregateEffects(effects: readonly EffectInstance[]): RunModifiers {
  const out: RunModifiers = { ...NO_MODIFIERS };

  for (const { kind, value } of effects) {
    if (!isEffectKind(kind) || !Number.isFinite(value)) continue;
    out[kind] += value;
  }

  for (const kind of EFFECT_KINDS) {
    const { cap } = EFFECT_SPECS[kind];
    if (cap !== null && out[kind] > cap) out[kind] = cap;
  }

  return out;
}

/** Applique un modificateur en POURCENTAGE à une valeur de base. */
export function applyPct(base: number, pct: number): number {
  return base * (1 + pct / 100);
}
