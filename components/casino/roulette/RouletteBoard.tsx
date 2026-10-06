"use client";

import { useMemo, useState } from "react";
import {
  ROULETTE_BETS,
  insideKey,
  pocketColor,
  type RouletteBetOutcome,
} from "@/lib/casino/roulette";

/**
 * Le TAPIS de roulette européenne, en SVG.
 *
 * Mise en page réelle : le 0 à gauche, la grille 3 × 12 (3, 6, 9… en haut,
 * 1, 4, 7… en bas), les colonnes « 2 à 1 » à droite, puis les douzaines et les
 * chances simples. Comme sur un vrai tapis, on mise À CHEVAL en posant le jeton
 * sur un trait, en CARRÉ sur une intersection, en TRANSVERSALE / SIXAIN sur le
 * bord bas de la grille : chaque trait et chaque intersection porte une zone
 * cliquable invisible, reliée à la clé de mise du catalogue (lib/casino/roulette).
 *
 * Le tapis ne connaît que des clés. Il ne valide rien : c'est le serveur qui
 * refuse une clé absente du catalogue.
 */

const PAD = 8;
const ZW = 64; // largeur du 0
const CW = 60; // largeur d'une colonne de numéros
const CH = 60; // hauteur d'une rangée
const X0 = PAD + ZW;
const GRID_W = 12 * CW;
const GRID_H = 3 * CH;
const COL_W = 64;
const DOZ_H = 48;
const OUT_H = 48;
export const BOARD_W = X0 + GRID_W + COL_W + PAD;
export const BOARD_H = PAD + GRID_H + DOZ_H + OUT_H + PAD;

const LINE = "rgb(255 255 255 / 0.75)";
const EDGE = 9; // demi-épaisseur des zones de trait

/** Case d'un numéro 1–36. */
function cellOf(n: number) {
  const col = Math.ceil(n / 3) - 1;
  const row = 2 - ((n - 1) % 3);
  return { x: X0 + col * CW, y: PAD + row * CH };
}

interface Spot {
  key: string;
  /** Zone cliquable. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Où poser le jeton. */
  cx: number;
  cy: number;
  /** Ordre d'empilement : les traits et intersections passent au-dessus. */
  layer: 0 | 1 | 2;
}

function buildSpots(): Spot[] {
  const spots: Spot[] = [];
  const box = (key: string, x: number, y: number, w: number, h: number, layer: Spot["layer"] = 0) =>
    spots.push({ key, x, y, w, h, cx: x + w / 2, cy: y + h / 2, layer });
  const point = (key: string, cx: number, cy: number, layer: Spot["layer"], w = EDGE * 2, h = EDGE * 2) =>
    spots.push({ key, x: cx - w / 2, y: cy - h / 2, w, h, cx, cy, layer });

  // Pleins.
  box(insideKey("straight", [0]), PAD, PAD, ZW, GRID_H);
  for (let n = 1; n <= 36; n++) {
    const { x, y } = cellOf(n);
    box(insideKey("straight", [n]), x, y, CW, CH);
  }

  // Chevaux dans une transversale (trait horizontal entre n et n+1).
  for (let n = 1; n <= 36; n++) {
    if (n % 3 === 0) continue;
    const { x, y } = cellOf(n);
    point(insideKey("split", [n, n + 1]), x + CW / 2, y, 1, CW - EDGE * 2, EDGE * 2);
  }
  // Chevaux entre deux transversales (trait vertical entre n et n+3).
  for (let n = 1; n <= 33; n++) {
    const { x, y } = cellOf(n);
    point(insideKey("split", [n, n + 3]), x + CW, y + CH / 2, 1, EDGE * 2, CH - EDGE * 2);
  }
  // Chevaux avec le zéro (trait entre le 0 et 1, 2, 3).
  for (const n of [1, 2, 3]) {
    const { y } = cellOf(n);
    point(insideKey("split", [0, n]), X0, y + CH / 2, 1, EDGE * 2, CH - EDGE * 2);
  }

  // Transversales et sixains : bord bas de la grille.
  for (let n = 1; n <= 34; n += 3) {
    const { x } = cellOf(n);
    point(insideKey("street", [n, n + 1, n + 2]), x + CW / 2, PAD + GRID_H, 1, CW - EDGE * 2, EDGE * 2);
    if (n <= 31) {
      point(insideKey("line", [n, n + 1, n + 2, n + 3, n + 4, n + 5]), x + CW, PAD + GRID_H, 2);
    }
  }

  // Carrés : intersections intérieures.
  for (let n = 1; n <= 32; n++) {
    if (n % 3 === 0) continue;
    const { x, y } = cellOf(n);
    point(insideKey("corner", [n, n + 1, n + 3, n + 4]), x + CW, y, 2);
  }

  // Avec le zéro : trios et premiers 4.
  point(insideKey("trio", [0, 2, 3]), X0, PAD + CH, 2);
  point(insideKey("trio", [0, 1, 2]), X0, PAD + 2 * CH, 2);
  point(insideKey("basket", [0, 1, 2, 3]), X0, PAD + GRID_H, 2);

  // Colonnes « 2 à 1 » (rangée du haut = colonne 3).
  for (const row of [0, 1, 2]) {
    box(`column:${3 - row}`, X0 + GRID_W, PAD + row * CH, COL_W, CH);
  }
  // Douzaines.
  for (const d of [1, 2, 3]) {
    box(`dozen:${d}`, X0 + (d - 1) * 4 * CW, PAD + GRID_H, 4 * CW, DOZ_H);
  }
  // Chances simples.
  ["low", "even", "red", "black", "odd", "high"].forEach((key, i) => {
    box(key, X0 + i * 2 * CW, PAD + GRID_H + DOZ_H, 2 * CW, OUT_H);
  });

  return spots.sort((a, b) => a.layer - b.layer);
}

const SPOTS = buildSpots();
const SPOT_BY_KEY = new Map(SPOTS.map((s) => [s.key, s]));

const OUTSIDE_LABEL: Record<string, string> = {
  "dozen:1": "1re 12",
  "dozen:2": "2e 12",
  "dozen:3": "3e 12",
  low: "1 – 18",
  even: "PAIR",
  odd: "IMPAIR",
  high: "19 – 36",
};

// ──────────────────────────────────────────────────────────────────────────
// Jetons
// ──────────────────────────────────────────────────────────────────────────

export const CHIP_VALUES = [
  1, 5, 25, 100, 500, 1_000, 5_000, 25_000, 50_000, 75_000, 100_000, 150_000,
] as const;

const CHIP_STYLE: Record<number, { base: string; edge: string; text: string }> = {
  1: { base: "#f4f4f5", edge: "#2563eb", text: "#1e3a8a" },
  5: { base: "#dc2626", edge: "#fff", text: "#fff" },
  25: { base: "#16a34a", edge: "#fff", text: "#fff" },
  100: { base: "#18181b", edge: "#e5e7eb", text: "#fff" },
  500: { base: "#7e22ce", edge: "#fde68a", text: "#fff" },
  1000: { base: "#eab308", edge: "#1f2937", text: "#1f2937" },
  5000: { base: "#c2410c", edge: "#fff7ed", text: "#fff" },
  25000: { base: "#0891b2", edge: "#fdf4ff", text: "#fff" },
  50000: { base: "#db2777", edge: "#fce7f3", text: "#fff" },
  75000: { base: "#4338ca", edge: "#fbbf24", text: "#fff" },
  100000: { base: "#0f766e", edge: "#fde68a", text: "#fff" },
  150000: { base: "#b45309", edge: "#111827", text: "#fff" },
};

/** Style du jeton pour un montant quelconque : le plus gros jeton qu'il contient. */
export function chipStyleFor(amount: number) {
  const value = [...CHIP_VALUES].reverse().find((v) => amount >= v) ?? 1;
  return CHIP_STYLE[value]!;
}

export function formatChip(amount: number): string {
  if (amount >= 1_000_000) return `${+(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${+(amount / 1_000).toFixed(1)}K`;
  return String(amount);
}

/** Un jeton en SVG, centré en (cx, cy). */
export function ChipSvg({
  cx,
  cy,
  r,
  amount,
  dim = false,
  glow = false,
  opacity,
}: {
  cx: number;
  cy: number;
  r: number;
  amount: number;
  dim?: boolean;
  glow?: boolean;
  opacity?: number;
}) {
  const style = chipStyleFor(amount);
  const label = formatChip(amount);
  return (
    <g
      opacity={opacity ?? (dim ? 0.35 : 1)}
      style={glow ? { filter: "drop-shadow(0 0 6px #ffd23f)" } : { filter: "drop-shadow(0 2px 2px rgb(0 0 0 / 0.6))" }}
      pointerEvents="none"
    >
      <circle cx={cx} cy={cy + 2} r={r} fill="rgb(0 0 0 / 0.35)" />
      <circle cx={cx} cy={cy} r={r} fill={style.base} />
      <circle
        cx={cx}
        cy={cy}
        r={r - 2}
        fill="none"
        stroke={style.edge}
        strokeWidth="3.5"
        strokeDasharray={`${(r * 0.55).toFixed(1)} ${(r * 0.5).toFixed(1)}`}
      />
      <circle cx={cx} cy={cy} r={r * 0.62} fill={style.base} stroke={style.edge} strokeOpacity="0.6" strokeWidth="1" />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={label.length > 3 ? r * 0.55 : r * 0.72}
        fontWeight="900"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fill={style.text}
      >
        {label}
      </text>
    </g>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Tapis
// ──────────────────────────────────────────────────────────────────────────

/** Jetons d'un AUTRE joueur de la table, affichés en transparence. */
export interface OtherBets {
  username: string;
  bets: Record<string, number>;
}

export function RouletteBoard({
  bets,
  others = [],
  settled,
  winning,
  disabled,
  onPlace,
  onRemove,
  onHover,
}: {
  bets: Record<string, number>;
  /** Table à plusieurs : les jetons des autres joueurs. */
  others?: OtherBets[];
  /** Mises du tour qui vient d'être réglé (affichées tant qu'on n'a rien reposé). */
  settled: RouletteBetOutcome[] | null;
  /** Numéro sorti (marqué par la « dame »). */
  winning: number | null;
  disabled: boolean;
  onPlace: (key: string) => void;
  onRemove: (key: string) => void;
  onHover: (key: string | null) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const covered = useMemo(
    () => new Set(hover ? ROULETTE_BETS.get(hover)?.numbers ?? [] : []),
    [hover],
  );

  const setHoverKey = (key: string | null) => {
    setHover(key);
    onHover(key);
  };

  // Jetons des autres, regroupés par emplacement : plusieurs joueurs sur la
  // même case sont décalés en éventail pour que chaque pseudo reste lisible.
  const othersBySpot = useMemo(() => {
    const bySpot = new Map<string, { username: string; amount: number }[]>();
    for (const player of others) {
      for (const [key, amount] of Object.entries(player.bets)) {
        const list = bySpot.get(key) ?? [];
        list.push({ username: player.username, amount });
        bySpot.set(key, list);
      }
    }
    return bySpot;
  }, [others]);

  const zeroPath = `M${X0} ${PAD} L${PAD + 22} ${PAD} Q${PAD} ${PAD + GRID_H / 2} ${PAD + 22} ${PAD + GRID_H} L${X0} ${PAD + GRID_H} Z`;

  return (
    <svg
      viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
      className="w-full select-none"
      role="group"
      aria-label="Tapis de roulette"
      onMouseLeave={() => setHoverKey(null)}
    >
      <defs>
        <radialGradient id="felt" cx="50%" cy="40%" r="75%">
          <stop offset="0" stopColor="#1f8a4c" />
          <stop offset="1" stopColor="#0c4a28" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width={BOARD_W} height={BOARD_H} rx="14" fill="url(#felt)" />

      {/* ── Zéro ── */}
      <path d={zeroPath} fill={covered.has(0) ? "rgb(255 255 255 / 0.22)" : "transparent"} stroke={LINE} strokeWidth="2" />
      <g>
        <ellipse cx={PAD + ZW / 2 + 6} cy={PAD + GRID_H / 2} rx="18" ry="24" fill="#0f8a3c" stroke="rgb(255 255 255 / 0.5)" />
        <text
          x={PAD + ZW / 2 + 6}
          y={PAD + GRID_H / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="24"
          fontWeight="800"
          fontFamily="Georgia, serif"
          fill="#fff"
        >
          0
        </text>
      </g>

      {/* ── Numéros ── */}
      {Array.from({ length: 36 }, (_, i) => i + 1).map((n) => {
        const { x, y } = cellOf(n);
        const color = pocketColor(n);
        return (
          <g key={n}>
            <rect
              x={x}
              y={y}
              width={CW}
              height={CH}
              fill={covered.has(n) ? "rgb(255 255 255 / 0.22)" : "transparent"}
              stroke={LINE}
              strokeWidth="1.5"
            />
            <ellipse
              cx={x + CW / 2}
              cy={y + CH / 2}
              rx="19"
              ry="22"
              fill={color === "red" ? "#c0121f" : "#15151a"}
              stroke="rgb(255 255 255 / 0.35)"
            />
            <text
              x={x + CW / 2}
              y={y + CH / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="21"
              fontWeight="800"
              fontFamily="Georgia, serif"
              fill="#fff"
            >
              {n}
            </text>
          </g>
        );
      })}

      {/* ── Colonnes, douzaines, chances simples ── */}
      {SPOTS.filter((s) => s.key.startsWith("column:") || s.key in OUTSIDE_LABEL || s.key === "red" || s.key === "black").map(
        (s) => (
          <g key={`bg-${s.key}`}>
            <rect
              x={s.x}
              y={s.y}
              width={s.w}
              height={s.h}
              fill={hover === s.key ? "rgb(255 255 255 / 0.18)" : "transparent"}
              stroke={LINE}
              strokeWidth="1.5"
            />
            {s.key === "red" || s.key === "black" ? (
              <path
                d={`M${s.cx} ${s.cy - 16} L${s.cx + 30} ${s.cy} L${s.cx} ${s.cy + 16} L${s.cx - 30} ${s.cy} Z`}
                fill={s.key === "red" ? "#c0121f" : "#15151a"}
                stroke="rgb(255 255 255 / 0.6)"
              />
            ) : (
              <text
                x={s.cx}
                y={s.cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={s.key.startsWith("column:") ? 15 : 17}
                fontWeight="800"
                letterSpacing="1"
                fontFamily="Georgia, serif"
                fill="#fff"
                transform={s.key.startsWith("column:") ? `rotate(-90 ${s.cx} ${s.cy})` : undefined}
              >
                {s.key.startsWith("column:") ? "2 à 1" : OUTSIDE_LABEL[s.key]}
              </text>
            )}
          </g>
        ),
      )}

      {/* ── Dame sur le numéro sorti ── */}
      {winning !== null && (
        <g pointerEvents="none">
          {(() => {
            const pos = winning === 0 ? { x: PAD + ZW / 2 + 6, y: PAD + GRID_H / 2 } : { x: cellOf(winning).x + CW / 2, y: cellOf(winning).y + CH / 2 };
            return (
              <>
                <circle cx={pos.x} cy={pos.y} r="26" fill="none" stroke="#ffd23f" strokeWidth="3" style={{ filter: "drop-shadow(0 0 8px #ffd23f)" }} />
                <circle cx={pos.x + 16} cy={pos.y - 18} r="8" fill="#fff" stroke="#999" />
                <circle cx={pos.x + 16} cy={pos.y - 18} r="3.5" fill="#ffd23f" />
              </>
            );
          })()}
        </g>
      )}

      {/* ── Jetons des autres joueurs (transparents, pseudo dessous) ── */}
      {[...othersBySpot].map(([key, list]) => {
        const s = SPOT_BY_KEY.get(key);
        if (!s) return null;
        const r = s.layer === 0 ? 13 : 11;
        return list.map((other, i) => {
          const dx = (i - (list.length - 1) / 2) * (r + 2);
          const dy = i % 2 === 0 ? 0 : -4;
          const name = other.username.length > 9 ? `${other.username.slice(0, 8)}…` : other.username;
          return (
            <g key={`o-${key}-${other.username}`} pointerEvents="none">
              <ChipSvg cx={s.cx + dx} cy={s.cy + dy} r={r} amount={other.amount} opacity={0.45} />
              <text
                x={s.cx + dx}
                y={s.cy + dy + r + 6}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="7.5"
                fontWeight="700"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                fill="#fff"
                opacity="0.75"
                stroke="rgb(0 0 0 / 0.55)"
                strokeWidth="2"
                paintOrder="stroke"
              >
                {name}
              </text>
            </g>
          );
        });
      })}

      {/* ── Jetons posés ── */}
      {Object.entries(bets).map(([key, amount]) => {
        const s = SPOT_BY_KEY.get(key);
        if (!s) return null;
        return <ChipSvg key={key} cx={s.cx} cy={s.cy} r={s.layer === 0 ? 17 : 14} amount={amount} />;
      })}

      {/* ── Mises réglées ── */}
      {Object.keys(bets).length === 0 &&
        settled?.map((bet) => {
          const s = SPOT_BY_KEY.get(bet.key);
          if (!s) return null;
          return (
            <ChipSvg
              key={`s-${bet.key}`}
              cx={s.cx}
              cy={s.cy}
              r={s.layer === 0 ? 17 : 14}
              amount={bet.won ? bet.payout : bet.amount}
              dim={!bet.won}
              glow={bet.won}
            />
          );
        })}

      {/* ── Zones cliquables (invisibles), du fond vers le dessus ── */}
      {SPOTS.map((s) => (
        <rect
          key={`hit-${s.key}`}
          x={s.x}
          y={s.y}
          width={s.w}
          height={s.h}
          fill="transparent"
          className={disabled ? "" : "cursor-pointer"}
          onMouseEnter={() => setHoverKey(s.key)}
          onClick={() => !disabled && onPlace(s.key)}
          onContextMenu={(e) => {
            e.preventDefault();
            if (!disabled) onRemove(s.key);
          }}
        >
          <title>{ROULETTE_BETS.get(s.key)?.label}</title>
        </rect>
      ))}
    </svg>
  );
}
