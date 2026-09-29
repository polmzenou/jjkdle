"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
  type MotionValue,
} from "framer-motion";
import { CoinIcon } from "@/components/progress/CoinWallet";
import {
  LINE_COUNT,
  ONE_CHERRY,
  PAYLINES,
  PAYTABLE_ORDER,
  REEL_STRIPS,
  SLOTS_RTP_PCT,
  SYMBOL_LABEL,
  THREE_OF_A_KIND,
  TWO_CHERRIES,
  type SlotSpinResult,
} from "@/lib/casino/slots";
import { spinSlotsAction } from "@/lib/casino/slots-actions";
import { BetPad } from "./BetPad";
import { SlotDefs, SlotSymbolArt, SlotSymbolIcon } from "./slots/SlotSymbols";

/**
 * MACHINE À SOUS.
 *
 * Serveur autoritaire, comme au pile ou face : ce composant n'a AUCUN tirage.
 * Les rouleaux se mettent à défiler dès le clic (boucle linéaire infinie), et
 * ne commencent à freiner qu'une fois les arrêts renvoyés par `spinSlotsAction`
 * — chacun sur SA case, en décalé de gauche à droite.
 *
 * ── Comment un rouleau tourne ────────────────────────────────────────────
 * Chaque rouleau affiche sa bande répétée `REPEATS` fois, et sa position est une
 * MotionValue `y` (en px du viewBox). La bande étant périodique, décaler `y`
 * d'un multiple de sa hauteur est invisible : on s'en sert pour « recentrer »
 * la position avant chaque phase (`normalize`), ce qui permet de tourner
 * indéfiniment avec une bande de longueur finie.
 */

// ── Géométrie (unités du viewBox) ─────────────────────────────────────────
const CELL = 100;
const REEL_W = 110;
const REEL_GAP = 14;
const WIN_X = 61;
const WIN_Y = 150;
const WIN_H = CELL * 3;
const VB_W = 560;
const VB_H = 640;
const CAB_W = 480;

const STRIP_LEN = REEL_STRIPS[0]!.length;
const STRIP_H = STRIP_LEN * CELL;
const REPEATS = 5;
/** Index de case (en haut de fenêtre) autour duquel on recentre : 3e bande. */
const NORM_BASE = STRIP_LEN * 3;

// ── Rythme ────────────────────────────────────────────────────────────────
/** Durée d'une bande complète pendant la boucle (vitesse de croisière). */
const LOOP_S = 0.42;
/** Durée plancher du défilement avant de pouvoir freiner. */
const MIN_SPIN_MS = 650;
/** Freinage de chaque rouleau (décalé de gauche à droite). */
const STOP_S = [0.95, 1.4, 1.85];
/** Distance minimale parcourue au freinage, en cases (≈ vitesse × durée / 3). */
const STOP_MIN_CELLS = [26, 38, 50];

const HISTORY_MAX = 12;

const LINE_COLORS = ["#ffd23f", "#4fd8ff", "#ff5fd2", "#7dff8a", "#ff8a3d"];

const reelX = (reel: number) => WIN_X + reel * (REEL_W + REEL_GAP);
const cellCenter = (reel: number, row: number) => ({
  x: reelX(reel) + REEL_W / 2,
  y: WIN_Y + row * CELL + CELL / 2,
});

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** Position `y` qui met la case `topIndex` en haut de la fenêtre. */
const yForTop = (topIndex: number) => -topIndex * CELL;

/** Recentre une position sur la 3e bande (décalage invisible). */
function normalize(y: number): number {
  const top = -y / CELL;
  return yForTop(NORM_BASE + mod(top, STRIP_LEN));
}

const leverTransition = (reduceMotion: boolean | null) => ({
  duration: reduceMotion ? 0.2 : 0.75,
  times: [0, 0.35, 0.55, 1],
  ease: "easeInOut" as const,
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Position d'arrêt initiale, fixe (rendu serveur = rendu client). */
const INITIAL_STOPS = [3, 9, 17];

interface SessionStats {
  spins: number;
  wins: number;
  best: number;
  net: number;
}

export function SlotMachine({
  initialCoins,
  minBet,
}: {
  initialCoins: number;
  minBet: number;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [coins, setCoins] = useState(initialCoins);
  const [amount, setAmount] = useState(() =>
    Math.min(Math.max(minBet, 50), Math.max(initialCoins, minBet)),
  );
  const [spinning, setSpinning] = useState(false);
  const [blur, setBlur] = useState([false, false, false]);
  const [result, setResult] = useState<SlotSpinResult | null>(null);
  const [shownGain, setShownGain] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SlotSpinResult[]>([]);
  const [stats, setStats] = useState<SessionStats>({ spins: 0, wins: 0, best: 0, net: 0 });
  const [showPaytable, setShowPaytable] = useState(false);
  const [leverPulls, setLeverPulls] = useState(0);

  // Un appel à la fois ; lu dans le callback asynchrone.
  const busy = useRef(false);
  const loops = useRef<(AnimationPlaybackControls | null)[]>([null, null, null]);

  const y0 = useMotionValue(yForTop(NORM_BASE + mod(INITIAL_STOPS[0]! - 1, STRIP_LEN)));
  const y1 = useMotionValue(yForTop(NORM_BASE + mod(INITIAL_STOPS[1]! - 1, STRIP_LEN)));
  const y2 = useMotionValue(yForTop(NORM_BASE + mod(INITIAL_STOPS[2]! - 1, STRIP_LEN)));
  const reelY = [y0, y1, y2];

  // Remet le solde de la nav d'aplomb en quittant (cf. CoinflipGame).
  useEffect(() => () => router.refresh(), [router]);
  useEffect(
    () => () => {
      for (const loop of loops.current) loop?.stop();
    },
    [],
  );

  const setReelBlur = (reel: number, on: boolean) =>
    setBlur((prev) => prev.map((value, i) => (i === reel ? on : value)));

  /** Lance la boucle de croisière d'un rouleau (symboles qui descendent). */
  const startLoop = useCallback((reel: number) => {
    const y = [y0, y1, y2][reel]!;
    y.jump(normalize(y.get()));
    const from = y.get();
    loops.current[reel] = animate(y, [from, from + STRIP_H], {
      duration: LOOP_S,
      ease: "linear",
      repeat: Infinity,
    });
    setReelBlur(reel, true);
  }, [y0, y1, y2]);

  /** Freine un rouleau jusqu'à ce que `stop` soit sur la rangée du milieu. */
  const settleReel = useCallback(
    (reel: number, stop: number, fast: boolean): Promise<void> => {
      const y = [y0, y1, y2][reel]!;
      loops.current[reel]?.stop();
      loops.current[reel] = null;
      y.jump(normalize(y.get()));

      const top = -y.get() / CELL;
      const wantTop = mod(stop - 1, STRIP_LEN);
      const minCells = fast ? 4 : STOP_MIN_CELLS[reel]!;
      // Plus petite distance ≥ minCells qui tombe pile sur la case voulue.
      const distance = minCells + mod(top - minCells - wantTop, STRIP_LEN);
      const target = yForTop(Math.round(top - distance));

      return new Promise((resolve) => {
        animate(y, target, {
          duration: fast ? 0.25 + reel * 0.12 : STOP_S[reel]!,
          // Légère sur-course en fin de freinage : le « clac » du rouleau.
          ease: [0.22, 0.68, 0.34, 1.06],
          onComplete: () => {
            setReelBlur(reel, false);
            resolve();
          },
        });
        // Le flou s'estompe avant l'arrêt complet.
        setTimeout(
          () => setReelBlur(reel, false),
          (fast ? 0.15 : STOP_S[reel]! * 0.6) * 1000,
        );
      });
    },
    [y0, y1, y2],
  );

  /** Rouleaux ramenés à plat sur la case la plus proche (erreur serveur). */
  const abortReels = useCallback(async () => {
    await Promise.all(
      [y0, y1, y2].map((y, reel) => {
        loops.current[reel]?.stop();
        loops.current[reel] = null;
        setReelBlur(reel, false);
        return new Promise<void>((resolve) => {
          animate(y, Math.round(y.get() / CELL) * CELL, {
            duration: 0.3,
            onComplete: () => resolve(),
          });
        });
      }),
    );
  }, [y0, y1, y2]);

  const spin = useCallback(
    (bet: number) => {
      if (busy.current) return;
      busy.current = true;

      setError(null);
      setResult(null);
      setShownGain(0);
      setSpinning(true);
      setLeverPulls((n) => n + 1);
      // La mise quitte le solde affiché tout de suite, comme dans la machine.
      setCoins((c) => Math.max(0, c - bet));

      for (let reel = 0; reel < 3; reel++) startLoop(reel);

      void (async () => {
        const [response] = await Promise.all([
          spinSlotsAction(bet),
          wait(reduceMotion ? 150 : MIN_SPIN_MS),
        ]);

        if (!response.ok) {
          await abortReels();
          setCoins((c) => c + bet);
          setError(response.error);
          setSpinning(false);
          busy.current = false;
          return;
        }

        const { spin: outcome, coins: balance } = response;
        await Promise.all(
          outcome.stops.map((stop, reel) => settleReel(reel, stop, Boolean(reduceMotion))),
        );

        setResult(outcome);
        setSpinning(false);
        busy.current = false;
        setHistory((past) => [outcome, ...past].slice(0, HISTORY_MAX));
        setStats((past) => ({
          spins: past.spins + 1,
          wins: past.wins + (outcome.payout > 0 ? 1 : 0),
          best: Math.max(past.best, outcome.payout),
          net: past.net + outcome.net,
        }));

        // Le compteur de gain « monte » comme sur une vraie machine, puis le
        // solde se met à jour.
        if (outcome.payout > 0) {
          animate(0, outcome.payout, {
            duration: reduceMotion ? 0.2 : Math.min(2.2, 0.5 + outcome.multiplier * 0.08),
            ease: "easeOut",
            onUpdate: (v) => setShownGain(Math.round(v)),
            onComplete: () => setCoins(balance),
          });
        } else {
          setCoins(balance);
        }
      })();
    },
    [abortReels, reduceMotion, settleReel, startLoop],
  );

  const canPull = !spinning && coins >= minBet && amount >= minBet && amount <= coins;

  const winningCells = new Set<string>();
  for (const win of result?.lineWins ?? []) {
    for (let reel = 0; reel < win.count; reel++) {
      winningCells.add(`${reel}:${PAYLINES[win.line]![reel]}`);
    }
  }
  const winningLines = new Set(result?.lineWins.map((w) => w.line) ?? []);
  const jackpot = result?.lineWins.some((w) => w.symbol === "DIAMOND") ?? false;
  const bigWin = (result?.multiplier ?? 0) >= 10;
  const celebrating = result !== null && result.payout > 0;

  const needsAuth = error !== null && error.startsWith("Connecte-toi");

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
      <div className="mb-4 flex justify-end">
        <Link
          href="/casino"
          className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white/55 transition hover:border-cursed/40 hover:text-cursed-light"
        >
          Quitter la machine
        </Link>
      </div>

      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center"
      >
        <h1 className="font-display text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
          Machine à sous
        </h1>
        <p className="mx-auto mt-3 max-w-md text-balance leading-relaxed text-white/55">
          Trois rouleaux, cinq lignes, un levier. Tire, et prie pour les diamants.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
          <Rule>5 lignes actives</Rule>
          <Rule>Retour joueur {SLOTS_RTP_PCT.toLocaleString("fr-FR")} %</Rule>
          <Rule>Jackpot ×{THREE_OF_A_KIND.DIAMOND} la ligne</Rule>
          <Rule>Mise min. {minBet.toLocaleString("fr-FR")}</Rule>
        </div>
      </motion.header>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ── La machine ── */}
        <section className="relative mx-auto w-full max-w-[560px]">
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="w-full select-none drop-shadow-[0_40px_60px_rgb(0_0_0/0.7)]"
            role="img"
            aria-label={
              result
                ? `Rouleaux : ${result.grid.map((col) => SYMBOL_LABEL[col[1]!]).join(", ")}`
                : "Machine à sous"
            }
          >
            <defs>
              <SlotDefs />
              <linearGradient id="cab-body" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#3a0710" />
                <stop offset="0.15" stopColor="#9c1227" />
                <stop offset="0.5" stopColor="#c81d36" />
                <stop offset="0.85" stopColor="#9c1227" />
                <stop offset="1" stopColor="#3a0710" />
              </linearGradient>
              <linearGradient id="cab-chrome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="0.3" stopColor="#c9ced6" />
                <stop offset="0.55" stopColor="#6d7480" />
                <stop offset="0.8" stopColor="#e6e9ee" />
                <stop offset="1" stopColor="#8b919b" />
              </linearGradient>
              <linearGradient id="cab-chrome-h" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#8b919b" />
                <stop offset="0.4" stopColor="#ffffff" />
                <stop offset="0.6" stopColor="#c9ced6" />
                <stop offset="1" stopColor="#6d7480" />
              </linearGradient>
              <linearGradient id="reel-paper" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#d9d2bf" />
                <stop offset="0.5" stopColor="#fffdf5" />
                <stop offset="1" stopColor="#d9d2bf" />
              </linearGradient>
              <linearGradient id="reel-shade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#000" stopOpacity="0.75" />
                <stop offset="0.22" stopColor="#000" stopOpacity="0" />
                <stop offset="0.78" stopColor="#000" stopOpacity="0" />
                <stop offset="1" stopColor="#000" stopOpacity="0.75" />
              </linearGradient>
              <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
                <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
              <radialGradient id="knob" cx="35%" cy="30%" r="70%">
                <stop offset="0" stopColor="#ffd1d1" />
                <stop offset="0.35" stopColor="#ff2a3d" />
                <stop offset="1" stopColor="#6d0010" />
              </radialGradient>
              <filter id="reel-blur" x="-5%" y="-20%" width="110%" height="140%">
                <feGaussianBlur stdDeviation="0 9" />
              </filter>
              <filter id="led-glow" x="-20%" y="-50%" width="140%" height="200%">
                <feGaussianBlur stdDeviation="2.2" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {[0, 1, 2].map((reel) => (
                <clipPath key={reel} id={`reel-clip-${reel}`}>
                  <rect x={reelX(reel)} y={WIN_Y} width={REEL_W} height={WIN_H} rx="6" />
                </clipPath>
              ))}
              <style>{`
                .slot-bulb { animation: slot-bulb 1.2s ease-in-out infinite; }
                .slot-bulb-fast { animation-duration: 0.35s; }
                @keyframes slot-bulb { 0%, 100% { opacity: .3 } 50% { opacity: 1 } }
                @media (prefers-reduced-motion: reduce) { .slot-bulb { animation: none; opacity: .8 } }
              `}</style>
            </defs>

            {/* ── Levier (derrière le caisson : il sort de son flanc) ── */}
            <g>
              <rect x={CAB_W - 6} y="300" width="34" height="70" rx="10" fill="url(#cab-chrome-h)" stroke="#444" />
              {/* Vu de face, un levier qu'on abaisse vers soi « raccourcit » :
                  la boule descend vers le pivot (fixe) et grossit un peu. */}
              <g
                key={leverPulls}
                style={{ cursor: canPull ? "pointer" : "default" }}
                onClick={() => canPull && spin(amount)}
                role="button"
                aria-label="Tirer le levier"
              >
                <motion.line
                  x1={CAB_W + 20}
                  x2={CAB_W + 20}
                  y2="335"
                  stroke="#c9ced6"
                  strokeWidth="12"
                  strokeLinecap="round"
                  initial={{ y1: 80 }}
                  animate={{ y1: leverPulls > 0 ? [80, 300, 300, 80] : 80 }}
                  transition={leverTransition(reduceMotion)}
                />
                <motion.circle
                  cx={CAB_W + 20}
                  fill="url(#knob)"
                  stroke="#4a000a"
                  strokeWidth="2"
                  initial={{ cy: 80, r: 26 }}
                  animate={
                    leverPulls > 0
                      ? { cy: [80, 300, 300, 80], r: [26, 33, 33, 26] }
                      : { cy: 80, r: 26 }
                  }
                  transition={leverTransition(reduceMotion)}
                />
                <motion.ellipse
                  cx={CAB_W + 12}
                  rx="8"
                  ry="5"
                  fill="#fff"
                  opacity="0.7"
                  initial={{ cy: 70 }}
                  animate={{ cy: leverPulls > 0 ? [70, 288, 288, 70] : 70 }}
                  transition={leverTransition(reduceMotion)}
                />
              </g>
            </g>

            {/* ── Caisson ── */}
            <rect x="8" y="118" width={CAB_W - 16} height="500" rx="26" fill="url(#cab-body)" stroke="#2a0409" strokeWidth="3" />
            <rect x="8" y="118" width={CAB_W - 16} height="500" rx="26" fill="none" stroke="url(#cab-chrome)" strokeWidth="6" opacity="0.8" />

            {/* ── Fronton ── */}
            <path
              d={`M20 130 Q20 20 ${CAB_W / 2} 14 Q${CAB_W - 20} 20 ${CAB_W - 20} 130 Z`}
              fill="#14030a"
              stroke="url(#cab-chrome)"
              strokeWidth="6"
            />
            {Array.from({ length: 17 }, (_, i) => {
              const t = i / 16;
              const angle = Math.PI * (1 - t);
              // Arrondis : Math.cos/sin peuvent différer au dernier bit entre
              // le serveur et le navigateur (erreur d'hydratation).
              const cx = +(CAB_W / 2 + Math.cos(angle) * (CAB_W / 2 - 38)).toFixed(2);
              const cy = +(124 - Math.sin(angle) * 92).toFixed(2);
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r="6"
                  fill={i % 2 ? "#ffd23f" : "#ff5f7a"}
                  className={`slot-bulb ${spinning || celebrating ? "slot-bulb-fast" : ""}`}
                  style={{
                    animationDelay: `${(i % 4) * (spinning || celebrating ? 0.09 : 0.3)}s`,
                    filter: `drop-shadow(0 0 6px ${i % 2 ? "#ffd23f" : "#ff5f7a"})`,
                  }}
                />
              );
            })}
            <text
              x={CAB_W / 2}
              y="92"
              textAnchor="middle"
              fontFamily="Impact, 'Arial Black', sans-serif"
              fontSize="44"
              letterSpacing="4"
              fill="url(#slot-gold)"
              stroke="#5a2a00"
              strokeWidth="1.5"
              filter="url(#led-glow)"
            >
              JACKPOT
            </text>
            <text
              x={CAB_W / 2}
              y="116"
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
              fontSize="13"
              fontWeight="700"
              letterSpacing="3"
              fill="#ffcf5a"
            >
              ◆◆◆ ×{THREE_OF_A_KIND.DIAMOND} ◆◆◆
            </text>

            {/* ── Fenêtre des rouleaux ── */}
            <rect
              x={WIN_X - 16}
              y={WIN_Y - 14}
              width={3 * REEL_W + 2 * REEL_GAP + 32}
              height={WIN_H + 28}
              rx="16"
              fill="#0b0b10"
              stroke="url(#cab-chrome)"
              strokeWidth="5"
            />

            {[0, 1, 2].map((reel) => (
              <Reel
                key={reel}
                reel={reel}
                y={reelY[reel]!}
                blurred={blur[reel]!}
                winningRows={
                  [0, 1, 2].filter((row) => winningCells.has(`${reel}:${row}`))
                }
              />
            ))}

            {/* Reflet de la vitre */}
            <rect
              x={WIN_X - 6}
              y={WIN_Y - 4}
              width={3 * REEL_W + 2 * REEL_GAP + 12}
              height={WIN_H + 8}
              rx="10"
              fill="url(#glass)"
              pointerEvents="none"
            />

            {/* Lignes gagnantes */}
            <AnimatePresence>
              {result?.lineWins.map((win) => {
                const pts = PAYLINES[win.line]!.map((row, reel) => cellCenter(reel, row));
                const first = pts[0]!;
                const last = pts[2]!;
                return (
                  <motion.polyline
                    key={`${stats.spins}-${win.line}`}
                    points={[
                      `${first.x - REEL_W / 2 - 8},${first.y}`,
                      ...pts.map((p) => `${p.x},${p.y}`),
                      `${last.x + REEL_W / 2 + 8},${last.y}`,
                    ].join(" ")}
                    fill="none"
                    stroke={LINE_COLORS[win.line]}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ filter: `drop-shadow(0 0 6px ${LINE_COLORS[win.line]})` }}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 1, 0.55, 1] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                    pointerEvents="none"
                  />
                );
              })}
            </AnimatePresence>

            {/* Repères de lignes, de chaque côté */}
            {PAYLINES.map((rows, line) => {
              const lit = winningLines.has(line);
              // Les diagonales partent de la même rangée qu'une ligne droite :
              // leur repère est décalé vers le centre pour ne pas la chevaucher.
              const diagonal = rows[0] !== rows[2];
              const markerY = (row: number) =>
                WIN_Y + row * CELL + CELL / 2 + (diagonal ? (row === 0 ? 28 : -28) : 0);
              const left = { x: WIN_X - 30, y: markerY(rows[0]) };
              const right = { x: WIN_X + 3 * REEL_W + 2 * REEL_GAP + 30, y: markerY(rows[2]) };
              return [left, right].map((pos, side) => (
                <g key={`${line}-${side}`}>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="11"
                    fill={lit ? LINE_COLORS[line] : "#1a1a22"}
                    stroke={LINE_COLORS[line]}
                    strokeWidth="2"
                    style={lit ? { filter: `drop-shadow(0 0 6px ${LINE_COLORS[line]})` } : undefined}
                  />
                  <text
                    x={pos.x}
                    y={pos.y + 4.5}
                    textAnchor="middle"
                    fontFamily="ui-monospace, monospace"
                    fontSize="13"
                    fontWeight="900"
                    fill={lit ? "#111" : LINE_COLORS[line]}
                  >
                    {line + 1}
                  </text>
                </g>
              ));
            })}

            {/* ── Afficheurs ── */}
            <g fontFamily="ui-monospace, 'Courier New', monospace">
              {[
                { label: "MISE", value: amount, x: 36 },
                { label: "GAIN", value: shownGain, x: 180 },
                { label: "SOLDE", value: coins, x: 324 },
              ].map((panel) => (
                <g key={panel.label}>
                  <rect x={panel.x} y="492" width="120" height="58" rx="8" fill="#0a0406" stroke="url(#cab-chrome)" strokeWidth="3" />
                  <text x={panel.x + 60} y="510" textAnchor="middle" fontSize="11" fontWeight="700" letterSpacing="3" fill="#ff8a8a">
                    {panel.label}
                  </text>
                  <text
                    x={panel.x + 60}
                    y="538"
                    textAnchor="middle"
                    fontSize={panel.value >= 1_000_000 ? 16 : 22}
                    fontWeight="900"
                    fill={panel.label === "GAIN" && panel.value > 0 ? "#7dff8a" : "#ffcf5a"}
                    filter="url(#led-glow)"
                  >
                    {panel.value.toLocaleString("fr-FR")}
                  </text>
                </g>
              ))}
            </g>

            {/* ── Plateau + bouton SPIN ── */}
            <rect x="24" y="566" width={CAB_W - 48} height="40" rx="10" fill="url(#cab-chrome)" opacity="0.9" />
            <g
              role="button"
              aria-label="Lancer les rouleaux"
              style={{ cursor: canPull ? "pointer" : "default" }}
              onClick={() => canPull && spin(amount)}
              opacity={canPull ? 1 : 0.55}
            >
              <ellipse cx={CAB_W / 2} cy="588" rx="74" ry="17" fill="#6d0010" />
              <ellipse cx={CAB_W / 2} cy="584" rx="70" ry="15" fill="url(#knob)" stroke="#4a000a" strokeWidth="2" />
              <text
                x={CAB_W / 2}
                y="590"
                textAnchor="middle"
                fontFamily="Impact, 'Arial Black', sans-serif"
                fontSize="17"
                letterSpacing="4"
                fill="#fff"
              >
                {spinning ? "···" : "SPIN"}
              </text>
            </g>
          </svg>

          {/* Célébration */}
          <AnimatePresence>
            {result && (jackpot || bigWin) && (
              <motion.div
                key={`big-${stats.spins}`}
                initial={{ opacity: 0, scale: 0.4, rotate: -8 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 260, damping: 14 }}
                className="pointer-events-none absolute inset-x-0 top-[34%] flex justify-center"
              >
                <span className="rounded-2xl border-4 border-amber-300 bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 px-6 py-3 font-display text-3xl font-black uppercase tracking-widest text-amber-950 shadow-[0_0_60px_rgb(251_191_36/0.8)] sm:text-5xl">
                  {jackpot ? "Jackpot !" : "Gros gain !"}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ── Commandes ── */}
        <aside className="flex flex-col gap-5">
          <div className="rounded-2xl border border-white/10 bg-void-800/70 p-4">
            <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-wider text-white/40">
              Mise totale · {Math.max(1, Math.round(amount / LINE_COUNT)).toLocaleString("fr-FR")} par ligne
            </p>
            <div className="flex justify-center">
              <BetPad
                coins={coins}
                minBet={minBet}
                disabled={spinning}
                pending={spinning}
                cta="Spin"
                amount={amount}
                onAmountChange={setAmount}
                onBet={spin}
              />
            </div>
          </div>

          <div className="min-h-[92px]">
            <AnimatePresence mode="wait">
              {spinning ? (
                <motion.p
                  key="spin"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pt-6 text-center font-display text-sm font-bold uppercase tracking-[0.25em] text-white/40"
                >
                  Les rouleaux tournent…
                </motion.p>
              ) : result ? (
                <motion.div
                  key={`res-${stats.spins}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  role="status"
                  className={`rounded-2xl border bg-void-900 px-4 py-3 text-center ${
                    result.payout > 0 ? "border-emerald-400/45" : "border-white/10"
                  }`}
                >
                  <p className={`font-display text-lg font-black uppercase tracking-wider ${result.payout > 0 ? "text-emerald-300" : "text-white/50"}`}>
                    {result.payout > 0
                      ? `${result.lineWins.length} ligne${result.lineWins.length > 1 ? "s" : ""} gagnante${result.lineWins.length > 1 ? "s" : ""}`
                      : "Rien cette fois"}
                  </p>
                  <p className={`mt-1 flex items-center justify-center gap-1.5 font-display text-2xl font-black tabular-nums ${result.net >= 0 ? "text-amber-300" : "text-cursed-light"}`}>
                    <CoinIcon className="h-5 w-5" />
                    {result.net > 0 ? "+" : ""}
                    {result.net.toLocaleString("fr-FR")}
                  </p>
                  {result.lineWins.length > 0 && (
                    <ul className="mt-2 flex flex-wrap justify-center gap-1.5">
                      {result.lineWins.map((win) => (
                        <li
                          key={win.line}
                          className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-bold text-white/70"
                        >
                          <span className="h-2 w-2 rounded-full" style={{ background: LINE_COLORS[win.line] }} />
                          L{win.line + 1}
                          <SlotSymbolIcon symbol={win.symbol} className="h-4 w-4" />
                          ×{win.count} → {win.payout.toLocaleString("fr-FR")}
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              ) : (
                <motion.p
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pt-6 text-center text-sm text-white/40"
                >
                  Règle ta mise, puis tire le levier.
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {error && (
            <p className="rounded-xl border border-cursed/40 bg-cursed/10 px-4 py-3 text-center text-sm text-cursed-light">
              {error}
              {needsAuth && (
                <>
                  {" "}
                  <Link href="/login" className="font-bold underline">
                    Se reconnecter
                  </Link>
                </>
              )}
            </p>
          )}

          {/* Table des gains */}
          <div className="rounded-2xl border border-white/10 bg-void-800/60">
            <button
              type="button"
              onClick={() => setShowPaytable((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 font-display text-xs font-black uppercase tracking-[0.2em] text-white/60 transition hover:text-white"
              aria-expanded={showPaytable}
            >
              Table des gains
              <span aria-hidden className={`transition-transform ${showPaytable ? "rotate-180" : ""}`}>
                ▾
              </span>
            </button>
            <AnimatePresence initial={false}>
              {showPaytable && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <p className="px-4 text-[11px] leading-relaxed text-white/40">
                    Gains en multiple de la mise d&apos;une ligne (mise totale ÷ 5).
                    Le Wild remplace tout sauf le Diamant.
                  </p>
                  <ul className="grid gap-1 p-3 pt-2">
                    {PAYTABLE_ORDER.map((symbol) => (
                      <li key={symbol} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2 py-1">
                        <span className="flex items-center gap-0.5">
                          {[0, 1, 2].map((k) => (
                            <SlotSymbolIcon key={k} symbol={symbol} className="h-6 w-6" />
                          ))}
                        </span>
                        <span className="font-display text-sm font-black tabular-nums text-amber-300">
                          ×{THREE_OF_A_KIND[symbol]}
                        </span>
                      </li>
                    ))}
                    <li className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2 py-1">
                      <span className="flex items-center gap-0.5">
                        <SlotSymbolIcon symbol="CHERRY" className="h-6 w-6" />
                        <SlotSymbolIcon symbol="CHERRY" className="h-6 w-6" />
                        <span className="w-6 text-center text-white/30">?</span>
                      </span>
                      <span className="font-display text-sm font-black tabular-nums text-amber-300">×{TWO_CHERRIES}</span>
                    </li>
                    <li className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2 py-1">
                      <span className="flex items-center gap-0.5">
                        <SlotSymbolIcon symbol="CHERRY" className="h-6 w-6" />
                        <span className="w-6 text-center text-white/30">?</span>
                        <span className="w-6 text-center text-white/30">?</span>
                      </span>
                      <span className="font-display text-sm font-black tabular-nums text-amber-300">×{ONE_CHERRY}</span>
                    </li>
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Historique + stats */}
          {history.length > 0 && (
            <div>
              <h2 className="text-center font-display text-xs font-black uppercase tracking-[0.25em] text-white/35">
                Derniers spins
              </h2>
              <ul className="mt-3 flex flex-wrap justify-center gap-1.5">
                {history.map((past, index) => (
                  <li
                    key={stats.spins - index}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-black tabular-nums ${
                      past.payout > 0
                        ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-300"
                        : "border-white/10 bg-white/[0.03] text-white/30"
                    }`}
                  >
                    {past.net > 0 ? "+" : ""}
                    {past.net.toLocaleString("fr-FR")}
                  </li>
                ))}
              </ul>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Stat label="Spins" value={stats.spins.toLocaleString("fr-FR")} />
                <Stat label="Gagnants" value={stats.wins.toLocaleString("fr-FR")} />
                <Stat label="Meilleur gain" value={stats.best.toLocaleString("fr-FR")} />
                <Stat
                  label="Bilan"
                  value={`${stats.net > 0 ? "+" : ""}${stats.net.toLocaleString("fr-FR")}`}
                  tone={stats.net >= 0 ? "good" : "bad"}
                />
              </div>
            </div>
          )}
        </aside>
      </div>

      <p className="mt-12 text-center text-xs text-white/30">
        Chaque spin est tiré indépendamment par le serveur : les rouleaux n&apos;ont
        aucune mémoire, et aucune machine n&apos;est « chaude ».
      </p>
    </main>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Rouleau
// ──────────────────────────────────────────────────────────────────────────

function Reel({
  reel,
  y,
  blurred,
  winningRows,
}: {
  reel: number;
  y: MotionValue<number>;
  blurred: boolean;
  winningRows: number[];
}) {
  const strip = REEL_STRIPS[reel]!;
  const x = reelX(reel);

  return (
    <g>
      <g clipPath={`url(#reel-clip-${reel})`}>
        <rect x={x} y={WIN_Y} width={REEL_W} height={WIN_H} fill="url(#reel-paper)" />
        <motion.g style={{ y }} filter={blurred ? "url(#reel-blur)" : undefined}>
          {Array.from({ length: STRIP_LEN * REPEATS }, (_, k) => (
            <g key={k} transform={`translate(${x + (REEL_W - CELL) / 2} ${WIN_Y + k * CELL})`}>
              <line x1="-5" y1="0" x2={CELL + 5} y2="0" stroke="#000" strokeOpacity="0.08" />
              <g transform="translate(8 8) scale(0.84)">
                <SlotSymbolArt symbol={strip[k % STRIP_LEN]!} />
              </g>
            </g>
          ))}
        </motion.g>
        {/* Rondeur du tambour */}
        <rect x={x} y={WIN_Y} width={REEL_W} height={WIN_H} fill="url(#reel-shade)" pointerEvents="none" />
      </g>

      {/* Cases gagnantes */}
      {winningRows.map((row) => (
        <motion.rect
          key={row}
          x={x + 4}
          y={WIN_Y + row * CELL + 4}
          width={REEL_W - 8}
          height={CELL - 8}
          rx="10"
          fill="none"
          stroke="#ffd23f"
          strokeWidth="4"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.9, repeat: Infinity }}
          style={{ filter: "drop-shadow(0 0 8px #ffd23f)" }}
        />
      ))}

      {/* Séparateur chromé entre rouleaux */}
      {reel < 2 && (
        <rect x={x + REEL_W + 2} y={WIN_Y - 6} width={REEL_GAP - 4} height={WIN_H + 12} rx="3" fill="url(#cab-chrome-h)" />
      )}
    </g>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-white/45">
      {children}
    </span>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  const color =
    tone === "good" ? "text-emerald-300" : tone === "bad" ? "text-cursed-light" : "text-white";
  return (
    <div className="rounded-xl border border-white/[0.08] bg-void-900/50 px-3 py-2.5 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{label}</p>
      <p className={`mt-1 font-display text-lg font-black tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
