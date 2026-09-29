/**
 * ROULETTE EUROPÉENNE — cylindre, tapis et catalogue des mises. Module PUR
 * (aucun import), lisible depuis le serveur, le composant client et les tests.
 *
 * ── Simple zéro, paiements officiels ──────────────────────────────────────
 * 37 cases (0 à 36). Chaque mise couvrant `k` numéros paie `36/k − 1` contre 1 :
 * plein 35:1, cheval 17:1, transversale 11:1, carré 8:1, sixain 5:1, douzaine
 * et colonne 2:1, chances simples 1:1. Aucun numéro ne paie le zéro « en plus » :
 * l'avantage de la maison (1/37 ≈ 2,7 %) vient uniquement de lui, exactement
 * comme au casino. Pas de règle de « la partage » : sur le zéro, les chances
 * simples sont perdues comme les autres mises.
 *
 * ── Le catalogue fait la loi ──────────────────────────────────────────────
 * TOUTES les mises légales sont générées une fois ici (`ROULETTE_BETS`), avec
 * une clé canonique. Le client n'envoie que des clés : le serveur ne reconstruit
 * jamais une combinaison à partir de numéros reçus, il la cherche dans le
 * catalogue. Un « cheval » 1-36 ou un « carré » de cinq numéros n'existe tout
 * simplement pas.
 */

/** Ordre réel des alvéoles sur le cylindre européen, dans le sens horaire. */
export const WHEEL_ORDER: readonly number[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

export const POCKET_COUNT = 37;

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export type PocketColor = "green" | "red" | "black";

export function pocketColor(n: number): PocketColor {
  if (n === 0) return "green";
  return RED.has(n) ? "red" : "black";
}

export type RouletteBetKind =
  | "straight"
  | "split"
  | "street"
  | "trio"
  | "corner"
  | "basket"
  | "line"
  | "dozen"
  | "column"
  | "red"
  | "black"
  | "even"
  | "odd"
  | "low"
  | "high";

export interface RouletteBetDef {
  key: string;
  kind: RouletteBetKind;
  /** Numéros couverts, triés. */
  numbers: readonly number[];
  /** Paiement « contre 1 » (35 pour un plein). */
  payout: number;
  /** Libellé humain (« Cheval 17-20 »). */
  label: string;
}

export const BET_KIND_LABEL: Record<RouletteBetKind, string> = {
  straight: "Plein",
  split: "Cheval",
  street: "Transversale",
  trio: "Trio",
  corner: "Carré",
  basket: "Premiers 4",
  line: "Sixain",
  dozen: "Douzaine",
  column: "Colonne",
  red: "Rouge",
  black: "Noir",
  even: "Pair",
  odd: "Impair",
  low: "Manque (1-18)",
  high: "Passe (19-36)",
};

/** Clé canonique d'une mise « intérieure » : genre + numéros triés. */
export function insideKey(kind: RouletteBetKind, numbers: readonly number[]): string {
  return `${kind}:${[...numbers].sort((a, b) => a - b).join("-")}`;
}

function def(kind: RouletteBetKind, numbers: number[], key?: string, label?: string): RouletteBetDef {
  const sorted = [...numbers].sort((a, b) => a - b);
  return {
    key: key ?? insideKey(kind, sorted),
    kind,
    numbers: sorted,
    payout: 36 / sorted.length - 1,
    label: label ?? `${BET_KIND_LABEL[kind]} ${sorted.join("-")}`,
  };
}

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

/**
 * Génère le catalogue. Sur le tapis, le numéro `n` est dans la colonne de
 * tapis `ceil(n/3)` (12 « transversales »), et `n % 3` donne sa rangée :
 * 1 → en bas (1, 4, 7…), 2 → au milieu, 0 → en haut (3, 6, 9…).
 */
function buildCatalog(): RouletteBetDef[] {
  const bets: RouletteBetDef[] = [];

  // Pleins.
  for (let n = 0; n <= 36; n++) bets.push(def("straight", [n], undefined, `Plein ${n}`));

  // Chevaux avec le zéro.
  for (const n of [1, 2, 3]) bets.push(def("split", [0, n]));
  // Chevaux verticaux (dans une même transversale : 1-2, 2-3).
  for (let n = 1; n <= 36; n++) if (n % 3 !== 0) bets.push(def("split", [n, n + 1]));
  // Chevaux horizontaux (d'une transversale à la suivante : 1-4).
  for (let n = 1; n <= 33; n++) bets.push(def("split", [n, n + 3]));

  // Transversales pleines.
  for (let n = 1; n <= 34; n += 3) bets.push(def("street", [n, n + 1, n + 2]));
  // Trios avec le zéro.
  bets.push(def("trio", [0, 1, 2]));
  bets.push(def("trio", [0, 2, 3]));

  // Carrés.
  for (let n = 1; n <= 32; n++) {
    if (n % 3 !== 0) bets.push(def("corner", [n, n + 1, n + 3, n + 4]));
  }
  // Premiers 4.
  bets.push(def("basket", [0, 1, 2, 3], undefined, "Premiers 4 (0-1-2-3)"));

  // Sixains.
  for (let n = 1; n <= 31; n += 3) bets.push(def("line", range(n, n + 5)));

  // Chances multiples et simples.
  for (const d of [1, 2, 3]) {
    bets.push(def("dozen", range(12 * (d - 1) + 1, 12 * d), `dozen:${d}`, `${d}${d === 1 ? "re" : "e"} douzaine`));
  }
  for (const c of [1, 2, 3]) {
    bets.push(def("column", range(1, 36).filter((n) => (n - c) % 3 === 0), `column:${c}`, `${c}${c === 1 ? "re" : "e"} colonne`));
  }
  const all = range(1, 36);
  bets.push(def("red", all.filter((n) => RED.has(n)), "red", "Rouge"));
  bets.push(def("black", all.filter((n) => !RED.has(n)), "black", "Noir"));
  bets.push(def("even", all.filter((n) => n % 2 === 0), "even", "Pair"));
  bets.push(def("odd", all.filter((n) => n % 2 === 1), "odd", "Impair"));
  bets.push(def("low", range(1, 18), "low", "Manque (1-18)"));
  bets.push(def("high", range(19, 36), "high", "Passe (19-36)"));

  return bets;
}

export const ROULETTE_BETS: ReadonlyMap<string, RouletteBetDef> = new Map(
  buildCatalog().map((bet) => [bet.key, bet]),
);

/** Nombre maximum d'emplacements misés en un seul tour. */
export const MAX_BET_SPOTS = 160;

export interface RouletteBet {
  key: string;
  amount: number;
}

export interface RouletteBetOutcome extends RouletteBet {
  won: boolean;
  /** Recrédité, mise incluse (0 si perdu). */
  payout: number;
}

export interface RouletteSpinResult {
  pocket: number;
  color: PocketColor;
  bets: RouletteBetOutcome[];
  totalBet: number;
  payout: number;
  net: number;
}

/**
 * Nettoie des mises reçues du client : clés inconnues rejetées, montants
 * entiers strictement positifs, doublons fusionnés. Renvoie `null` si quoi que
 * ce soit est invalide — on ne « corrige » pas une mise, on la refuse.
 */
export function normalizeBets(input: unknown): RouletteBet[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_BET_SPOTS) {
    return null;
  }
  const merged = new Map<string, number>();
  for (const raw of input) {
    if (!raw || typeof raw !== "object") return null;
    const { key, amount } = raw as { key?: unknown; amount?: unknown };
    if (typeof key !== "string" || !ROULETTE_BETS.has(key)) return null;
    if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount <= 0) {
      return null;
    }
    merged.set(key, (merged.get(key) ?? 0) + amount);
  }
  return [...merged].map(([key, amount]) => ({ key, amount }));
}

/** Règle un tour pour des mises DÉJÀ normalisées. */
export function resolveRoulette(bets: readonly RouletteBet[], pocket: number): RouletteSpinResult {
  const outcomes = bets.map((bet) => {
    const betDef = ROULETTE_BETS.get(bet.key)!;
    const won = betDef.numbers.includes(pocket);
    return { ...bet, won, payout: won ? bet.amount * (betDef.payout + 1) : 0 };
  });
  const totalBet = bets.reduce((sum, bet) => sum + bet.amount, 0);
  const payout = outcomes.reduce((sum, bet) => sum + bet.payout, 0);
  return {
    pocket,
    color: pocketColor(pocket),
    bets: outcomes,
    totalBet,
    payout,
    net: payout - totalBet,
  };
}
