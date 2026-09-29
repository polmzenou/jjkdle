"use client";

import { motion } from "framer-motion";
import { WHEEL_ORDER, pocketColor } from "@/lib/casino/roulette";

/**
 * Le CYLINDRE de roulette européenne, en SVG, purement visuel.
 *
 * Comme la roue de la boutique (components/roulette/RouletteWheel.tsx), il ne
 * sait rien du tirage : le parent lui passe des rotations CUMULÉES (jamais
 * remises à zéro) calculées à partir du numéro renvoyé par le serveur. Ici il y
 * en a deux — le plateau tourne dans le sens horaire, la bille à contre-sens —
 * et elles sont animées avec la même durée et la même courbe : en fin de course
 * leur vitesse relative tombe à zéro, la bille « se pose » dans l'alvéole et
 * repart ensuite avec le plateau.
 *
 * Alvéole `i` de `WHEEL_ORDER` : centrée à `i × SLICE` degrés du haut, dans le
 * repère du plateau.
 */

export const SLICE = 360 / WHEEL_ORDER.length;

const C = 200; // centre du viewBox
const R_POCKET_OUT = 148;
const R_POCKET_IN = 112;
const R_NUMBER = 134;
const R_BALL_TRACK = 162;
const R_BALL_REST = 121;

const FILL: Record<ReturnType<typeof pocketColor>, string> = {
  green: "#0f8a3c",
  red: "#c0121f",
  black: "#15151a",
};

function polar(r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  // Arrondi : évite un écart d'hydratation serveur/navigateur au dernier bit.
  return { x: +(C + r * Math.cos(a)).toFixed(2), y: +(C + r * Math.sin(a)).toFixed(2) };
}

function wedge(i: number): string {
  const a0 = (i - 0.5) * SLICE;
  const a1 = (i + 0.5) * SLICE;
  const p0 = polar(R_POCKET_OUT, a0);
  const p1 = polar(R_POCKET_OUT, a1);
  const p2 = polar(R_POCKET_IN, a1);
  const p3 = polar(R_POCKET_IN, a0);
  const f = (n: number) => n.toFixed(2);
  return `M${f(p0.x)} ${f(p0.y)} A${R_POCKET_OUT} ${R_POCKET_OUT} 0 0 1 ${f(p1.x)} ${f(p1.y)} L${f(p2.x)} ${f(p2.y)} A${R_POCKET_IN} ${R_POCKET_IN} 0 0 0 ${f(p3.x)} ${f(p3.y)} Z`;
}

export interface WheelSpin {
  /** Identifiant du tour : relance les keyframes de la bille. */
  id: number;
  wheel: number;
  ball: number;
  duration: number;
}

export function RouletteWheelEU({
  spin,
  highlight,
  onSpinEnd,
}: {
  spin: WheelSpin;
  /** Numéro gagnant à faire briller, une fois arrêté. */
  highlight: number | null;
  onSpinEnd: () => void;
}) {
  const ease = [0.12, 0.72, 0.16, 1] as const;
  const highlightIndex = highlight === null ? -1 : WHEEL_ORDER.indexOf(highlight);

  return (
    <svg viewBox="0 0 400 400" className="w-full select-none drop-shadow-[0_30px_50px_rgb(0_0_0/0.75)]" aria-hidden>
      <defs>
        <radialGradient id="rw-wood" cx="50%" cy="50%" r="50%">
          <stop offset="0.82" stopColor="#5a2a10" />
          <stop offset="0.9" stopColor="#8b4a1e" />
          <stop offset="0.96" stopColor="#4a200a" />
          <stop offset="1" stopColor="#2a1004" />
        </radialGradient>
        <radialGradient id="rw-track" cx="50%" cy="50%" r="50%">
          <stop offset="0.72" stopColor="#1b120c" />
          <stop offset="0.8" stopColor="#3a281a" />
          <stop offset="0.86" stopColor="#20150d" />
        </radialGradient>
        <radialGradient id="rw-cone" cx="45%" cy="40%" r="60%">
          <stop offset="0" stopColor="#a8652e" />
          <stop offset="0.6" stopColor="#6b3514" />
          <stop offset="1" stopColor="#3b1a08" />
        </radialGradient>
        <linearGradient id="rw-brass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff2b0" />
          <stop offset="0.4" stopColor="#e3b341" />
          <stop offset="0.75" stopColor="#9a6a12" />
          <stop offset="1" stopColor="#f5d77a" />
        </linearGradient>
        <radialGradient id="rw-ball" cx="35%" cy="30%" r="70%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#e5e7eb" />
          <stop offset="1" stopColor="#9ca3af" />
        </radialGradient>
      </defs>

      {/* ── Parties fixes : cuvette en bois, piste de la bille, déflecteurs ── */}
      <circle cx={C} cy={C} r="198" fill="url(#rw-wood)" />
      <circle cx={C} cy={C} r="178" fill="url(#rw-track)" stroke="url(#rw-brass)" strokeWidth="2.5" />
      <circle cx={C} cy={C} r={R_POCKET_OUT + 3} fill="none" stroke="#0b0705" strokeWidth="6" />
      {Array.from({ length: 8 }, (_, k) => {
        const p = polar(170, k * 45 + 22.5);
        return (
          <rect
            key={k}
            x={p.x - 4}
            y={p.y - 4}
            width="8"
            height="8"
            fill="url(#rw-brass)"
            transform={`rotate(${k * 45 + 22.5 + 45} ${p.x} ${p.y})`}
          />
        );
      })}

      {/* ── Plateau tournant ── */}
      <motion.g
        initial={false}
        animate={{ rotate: spin.wheel }}
        transition={{ duration: spin.duration, ease }}
        onAnimationComplete={onSpinEnd}
      >
        {/* Cercle transparent : fixe le centre de rotation au centre du plateau. */}
        <circle cx={C} cy={C} r={R_POCKET_OUT + 2} fill="transparent" />
        {WHEEL_ORDER.map((n, i) => (
          <path
            key={n}
            d={wedge(i)}
            fill={FILL[pocketColor(n)]}
            stroke="url(#rw-brass)"
            strokeWidth="1.2"
            style={
              i === highlightIndex
                ? { filter: "brightness(1.7) drop-shadow(0 0 6px #ffd23f)" }
                : undefined
            }
          />
        ))}
        {WHEEL_ORDER.map((n, i) => {
          const p = polar(R_NUMBER, i * SLICE);
          return (
            <text
              key={n}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="11.5"
              fontWeight="800"
              fontFamily="Georgia, 'Times New Roman', serif"
              fill="#fff"
              transform={`rotate(${i * SLICE} ${p.x} ${p.y})`}
            >
              {n}
            </text>
          );
        })}
        {/* Fond des alvéoles (où la bille se pose) */}
        <circle cx={C} cy={C} r={R_POCKET_IN} fill="#120b07" />
        {WHEEL_ORDER.map((n, i) => {
          const a = polar(R_POCKET_IN, (i - 0.5) * SLICE);
          const b = polar(R_POCKET_IN - 14, (i - 0.5) * SLICE);
          return <line key={n} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="url(#rw-brass)" strokeWidth="2" />;
        })}
        {/* Cône central et tourelle */}
        <circle cx={C} cy={C} r={R_POCKET_IN - 14} fill="url(#rw-cone)" stroke="url(#rw-brass)" strokeWidth="2" />
        {[0, 90, 180, 270].map((deg) => {
          const tip = polar(62, deg);
          return (
            <g key={deg}>
              <line x1={C} y1={C} x2={tip.x} y2={tip.y} stroke="url(#rw-brass)" strokeWidth="7" strokeLinecap="round" />
              <circle cx={tip.x} cy={tip.y} r="7" fill="url(#rw-brass)" stroke="#6b4a0a" />
            </g>
          );
        })}
        <circle cx={C} cy={C} r="22" fill="url(#rw-brass)" stroke="#6b4a0a" strokeWidth="1.5" />
        <circle cx={C} cy={C} r="9" fill="#fff4c2" opacity="0.8" />
      </motion.g>

      {/* ── Bille ── */}
      <motion.g
        initial={false}
        animate={{ rotate: spin.ball }}
        transition={{ duration: spin.duration, ease }}
      >
        <circle cx={C} cy={C} r="199" fill="transparent" pointerEvents="none" />
        <motion.circle
          key={spin.id}
          cx={C}
          r="7"
          fill="url(#rw-ball)"
          stroke="#6b7280"
          strokeWidth="0.6"
          style={{ filter: "drop-shadow(0 2px 2px rgb(0 0 0 / 0.6))" }}
          initial={{ cy: C - R_BALL_REST }}
          animate={
            spin.id === 0
              ? { cy: C - R_BALL_REST }
              : {
                  cy: [
                    C - R_BALL_REST,
                    C - R_BALL_TRACK,
                    C - R_BALL_TRACK,
                    C - 142,
                    C - 128,
                    C - 136,
                    C - R_BALL_REST,
                  ],
                }
          }
          transition={{
            duration: spin.duration,
            times: [0, 0.06, 0.55, 0.68, 0.78, 0.86, 1],
            ease: "easeInOut",
          }}
        />
      </motion.g>
    </svg>
  );
}
