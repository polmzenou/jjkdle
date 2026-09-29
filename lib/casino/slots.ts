/**
 * MACHINE À SOUS — rouleaux, lignes et table de gains. Module PUR (aucun
 * import), lisible depuis le serveur, le composant client et les tests.
 *
 * ── Une vraie machine à rouleaux ─────────────────────────────────────────
 * Chaque rouleau est une BANDE physique de symboles (`REEL_STRIPS`). Le tirage
 * ne choisit pas des symboles : il choisit, pour chaque rouleau, un index
 * d'arrêt uniforme sur sa bande (cf. `spinSlotsAction`). La rareté d'un symbole
 * n'est donc rien d'autre que son nombre d'exemplaires sur la bande — exactement
 * comme sur une machine mécanique, et c'est ce qui rend le taux de retour
 * CALCULABLE exactement (cf. `SLOTS_RTP`).
 *
 * La fenêtre montre 3 rangées : la case d'arrêt au centre, la précédente
 * au-dessus, la suivante en dessous (la bande est circulaire).
 *
 * ── Lignes ────────────────────────────────────────────────────────────────
 * 5 lignes toujours actives : les 3 rangées et les 2 diagonales. La mise saisie
 * est la mise TOTALE, répartie à parts égales sur les 5 lignes ; la table de
 * gains s'exprime en multiple de la mise d'UNE ligne.
 *
 * ── Convention de payout ──────────────────────────────────────────────────
 * Comme partout au casino (cf. ./coinflip.ts), le payout INCLUT la mise : elle
 * est déjà partie du solde au moment du spin.
 */

export type SlotSymbol =
  | "CHERRY"
  | "LEMON"
  | "ORANGE"
  | "PLUM"
  | "BELL"
  | "BAR"
  | "SEVEN"
  | "DIAMOND"
  | "WILD";

/** Codes d'une lettre des bandes, pour les garder lisibles ci-dessous. */
const CODE: Record<string, SlotSymbol> = {
  C: "CHERRY",
  L: "LEMON",
  O: "ORANGE",
  P: "PLUM",
  B: "BELL",
  R: "BAR",
  S: "SEVEN",
  D: "DIAMOND",
  W: "WILD",
};

/**
 * Les trois bandes, 32 cases chacune. Composition :
 *   rouleaux 1 et 3 : 4 C · 7 L · 6 O · 5 P · 4 B · 3 R · 1 S · 1 D · 1 W
 *   rouleau 2       : 4 C · 5 L · 6 O · 5 P · 4 B · 3 R · 2 S · 1 D · 2 W
 * Le rouleau central porte plus de Wild et de 7 : c'est lui qui « fait » les
 * combinaisons, comme sur les machines classiques.
 *
 * ⚠️ Toucher une bande change le taux de retour : slots.test.ts le recalcule et
 * refuse tout ce qui sort de la fourchette annoncée.
 */
export const REEL_STRIPS: readonly (readonly SlotSymbol[])[] = [
  "RCLOPSLDBCOLRPOLBCPOLRWBLPCOLOPB",
  "OWPBCLROPSLBOCPROLWBDCPOLSRPBOCL",
  "OPLBCORLPOWBLCPOLRBPCLOLOSPBRDCL",
].map((strip) => strip.split("").map((code) => CODE[code]!));

export const REEL_COUNT = 3;
export const ROW_COUNT = 3;

/** Les 5 lignes, en rangée (0 = haut) pour chaque rouleau. */
export const PAYLINES: readonly (readonly [number, number, number])[] = [
  [1, 1, 1], // centre
  [0, 0, 0], // haut
  [2, 2, 2], // bas
  [0, 1, 2], // diagonale descendante
  [2, 1, 0], // diagonale montante
];

export const LINE_COUNT = PAYLINES.length;

/**
 * Table de gains, en multiple de la mise d'UNE ligne (mise incluse).
 * - Trois identiques, le Wild remplaçant n'importe quel symbole SAUF le Diamant
 *   (le jackpot se mérite en entier).
 * - Trois Wild paient pour eux-mêmes.
 * - Cerises : payées dès le premier rouleau, même seules.
 */
export const THREE_OF_A_KIND: Record<SlotSymbol, number> = {
  DIAMOND: 500,
  WILD: 250,
  SEVEN: 100,
  BAR: 40,
  BELL: 25,
  PLUM: 16,
  CHERRY: 10,
  ORANGE: 10,
  LEMON: 8,
};
export const TWO_CHERRIES = 5;
export const ONE_CHERRY = 2;

/** Ordre d'affichage de la table des gains. */
export const PAYTABLE_ORDER: readonly SlotSymbol[] = [
  "DIAMOND",
  "WILD",
  "SEVEN",
  "BAR",
  "BELL",
  "PLUM",
  "CHERRY",
  "ORANGE",
  "LEMON",
];

export const SYMBOL_LABEL: Record<SlotSymbol, string> = {
  CHERRY: "Cerise",
  LEMON: "Citron",
  ORANGE: "Orange",
  PLUM: "Prune",
  BELL: "Cloche",
  BAR: "BAR",
  SEVEN: "Sept",
  DIAMOND: "Diamant",
  WILD: "Wild",
};

/** Ce que paie une ligne `[r1, r2, r3]`, en multiple de la mise de ligne. */
export function lineMultiplier(
  symbols: readonly [SlotSymbol, SlotSymbol, SlotSymbol],
): { multiplier: number; symbol: SlotSymbol | null; count: number } {
  const [a, b] = symbols;

  if (symbols.every((s) => s === "DIAMOND")) {
    return { multiplier: THREE_OF_A_KIND.DIAMOND, symbol: "DIAMOND", count: 3 };
  }
  if (symbols.every((s) => s === "WILD")) {
    return { multiplier: THREE_OF_A_KIND.WILD, symbol: "WILD", count: 3 };
  }
  const base = symbols.find((s) => s !== "WILD")!;
  if (base !== "DIAMOND" && symbols.every((s) => s === "WILD" || s === base)) {
    return { multiplier: THREE_OF_A_KIND[base], symbol: base, count: 3 };
  }
  if (a === "CHERRY" && b === "CHERRY") {
    return { multiplier: TWO_CHERRIES, symbol: "CHERRY", count: 2 };
  }
  if (a === "CHERRY") return { multiplier: ONE_CHERRY, symbol: "CHERRY", count: 1 };
  return { multiplier: 0, symbol: null, count: 0 };
}

/** Grille visible `grid[rouleau][rangée]` pour des index d'arrêt donnés. */
export function gridFromStops(stops: readonly number[]): SlotSymbol[][] {
  return REEL_STRIPS.map((strip, reel) => {
    const stop = stops[reel]!;
    const at = (offset: number) =>
      strip[(((stop + offset) % strip.length) + strip.length) % strip.length]!;
    return [at(-1), at(0), at(1)];
  });
}

export interface SlotLineWin {
  /** Index dans `PAYLINES`. */
  line: number;
  symbol: SlotSymbol;
  /** Nombre de rouleaux (depuis la gauche) qui forment le gain. */
  count: number;
  multiplier: number;
  /** Payout de la ligne, mise de ligne incluse. */
  payout: number;
}

export interface SlotSpinResult {
  stops: number[];
  grid: SlotSymbol[][];
  lineWins: SlotLineWin[];
  bet: number;
  /** Total recrédité, mise incluse (0 si rien). */
  payout: number;
  /** payout − mise. */
  net: number;
  /** Multiplicateur total rapporté à la mise TOTALE (pour les célébrations). */
  multiplier: number;
}

/**
 * Résout un spin. Chaque ligne paie `round(mise × mult / 5)` — arrondi au plus
 * proche, pour la même raison que `resolveFlip` : aux toutes petites mises, un
 * gain tronqué à zéro serait un bug aux yeux du joueur.
 */
export function resolveSpin(bet: number, stops: readonly number[]): SlotSpinResult {
  const grid = gridFromStops(stops);
  const lineWins: SlotLineWin[] = [];

  PAYLINES.forEach((rows, line) => {
    const symbols = rows.map((row, reel) => grid[reel]![row]!) as [
      SlotSymbol,
      SlotSymbol,
      SlotSymbol,
    ];
    const { multiplier, symbol, count } = lineMultiplier(symbols);
    if (multiplier > 0 && symbol) {
      lineWins.push({
        line,
        symbol,
        count,
        multiplier,
        payout: Math.round((bet * multiplier) / LINE_COUNT),
      });
    }
  });

  const payout = lineWins.reduce((sum, win) => sum + win.payout, 0);
  return {
    stops: [...stops],
    grid,
    lineWins,
    bet,
    payout,
    net: payout - bet,
    multiplier: bet > 0 ? payout / bet : 0,
  };
}

/**
 * Taux de retour THÉORIQUE, calculé exactement et jamais saisi à la main.
 *
 * Chaque ligne prend une case par rouleau, et chaque case d'un rouleau est
 * uniformément distribuée sur sa bande (l'arrêt l'est) : l'espérance d'une ligne
 * ne dépend donc que de la composition des bandes, et les 5 lignes ont la même.
 * On énumère les 32³ triplets de symboles — hors arrondi, qui ne joue qu'au coin.
 */
export function computeSlotsRtp(): number {
  const [s1, s2, s3] = REEL_STRIPS as [SlotSymbol[], SlotSymbol[], SlotSymbol[]];
  let total = 0;
  for (const a of s1) for (const b of s2) for (const c of s3) {
    total += lineMultiplier([a, b, c]).multiplier;
  }
  return total / (s1.length * s2.length * s3.length);
}

export const SLOTS_RTP = computeSlotsRtp();

/** RTP en %, arrondi au dixième, pour l'affichage. */
export const SLOTS_RTP_PCT = Math.round(SLOTS_RTP * 1000) / 10;
