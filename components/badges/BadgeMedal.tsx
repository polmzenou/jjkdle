"use client";

import { useId } from "react";
import type { BadgeGlyph, BadgeTier } from "@/lib/badges/definitions";
import { BADGE_GLYPH_PATHS } from "@/components/badges/glyphs";

/**
 * Médaille SVG d'un badge : ruban à deux pans (couleur du badge), anneau
 * crénelé en métal selon le palier, disque sombre au pictogramme gravé.
 *
 * Aucune couleur d'univers n'est codée ici : le ruban et le pictogramme
 * prennent `color` (choisie par badge dans la palette de son univers), le
 * disque prend `--color-void-*` — la médaille suit donc le thème courant.
 */

/** Dégradés métal (clair → sombre) par palier. */
const METAL: Record<BadgeTier, [string, string, string]> = {
  bronze: ["#f3c08f", "#c2762f", "#6b3a14"],
  silver: ["#f8fafc", "#b6c2d1", "#5b6778"],
  gold: ["#fff1b8", "#f5b83d", "#8a5a0b"],
};
const LOCKED: [string, string, string] = ["#6b7280", "#3f4652", "#23272f"];

const round = (n: number) => Math.round(n * 100) / 100;
const NOTCHES = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI) / 6;
  return { x: round(32 + Math.cos(a) * 25.5), y: round(34 + Math.sin(a) * 25.5) };
});

interface BadgeMedalProps {
  glyph: BadgeGlyph;
  tier: BadgeTier;
  color: string;
  locked?: boolean;
  /** Largeur rendue en px (la hauteur suit, ratio 4/5). */
  size?: number;
  className?: string;
}

export function BadgeMedal({
  glyph,
  tier,
  color,
  locked = false,
  size = 56,
  className = "",
}: BadgeMedalProps) {
  const uid = useId().replace(/:/g, "");
  const [light, mid, dark] = locked ? LOCKED : METAL[tier];
  const accent = locked ? "#8b93a1" : color;
  const ring = `ring-${uid}`;
  const disc = `disc-${uid}`;
  const glow = `glow-${uid}`;

  // 12 créneaux autour de l'anneau. Arrondis : le serveur et le navigateur
  // ne donnent pas le même dernier chiffre de `Math.sin`, ce qui faisait
  // échouer l'hydratation.
  const notches = NOTCHES;

  return (
    <svg
      viewBox="0 0 64 80"
      width={size}
      height={(size * 80) / 64}
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={ring} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset=".5" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <radialGradient id={disc} cx=".5" cy=".35" r=".75">
          {/* `style` et non l'attribut : un attribut SVG ne résout pas `var()`. */}
          <stop offset="0" style={{ stopColor: "rgb(var(--color-void-600))" }} />
          <stop offset="1" style={{ stopColor: "rgb(var(--color-void-900))" }} />
        </radialGradient>
        <filter id={glow} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ruban : deux pans à queue d'aronde, derrière l'anneau. */}
      <path d="M20 50 14 78l7-4 5 5 6-27z" fill={accent} opacity={locked ? 0.5 : 0.95} />
      <path d="M44 50l6 28-7-4-5 5-6-27z" fill={accent} opacity={locked ? 0.4 : 0.75} />
      <path d="M20 50 14 78l7-4 5 5 6-27z" fill="#000" opacity=".18" />

      {/* Anneau crénelé */}
      {notches.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4.2" fill={`url(#${ring})`} />
      ))}
      <circle cx="32" cy="34" r="26" fill={`url(#${ring})`} />
      <circle cx="32" cy="34" r="26" fill="none" stroke={dark} strokeOpacity=".6" strokeWidth="1" />

      {/* Disque central + filet intérieur */}
      <circle cx="32" cy="34" r="19.5" fill={`url(#${disc})`} />
      <circle cx="32" cy="34" r="19.5" fill="none" stroke={light} strokeOpacity=".55" strokeWidth="1" />
      <circle cx="32" cy="34" r="16.8" fill="none" stroke={accent} strokeOpacity={locked ? 0.25 : 0.45} strokeWidth=".8" strokeDasharray="1.5 2.2" />

      {/* Pictogramme gravé */}
      <g
        transform="translate(20.5 22.5) scale(.96)"
        style={{ color: accent }}
        filter={locked ? undefined : `url(#${glow})`}
        opacity={locked ? 0.6 : 1}
      >
        {BADGE_GLYPH_PATHS[glyph]}
      </g>

      {/* Reflet sur l'anneau */}
      <path d="M12 26a21 21 0 0 1 14-13" fill="none" stroke="#fff" strokeOpacity={locked ? 0.12 : 0.45} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
