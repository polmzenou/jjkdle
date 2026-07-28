"use client";

import { getBooster, type BoosterKind } from "@/lib/cards/boosters";

/**
 * L'ENVELOPPE d'un booster, fermée. Sert à la fois sur l'écran de fin de partie
 * (le drop à cliquer) et dans l'onglet Deck (la pile de boosters en attente).
 */

interface BoosterPackProps {
  kind: BoosterKind;
  /** Rend le pack cliquable (ouverture). */
  onClick?: () => void;
  disabled?: boolean;
  /** Flottement + halo pulsé : à réserver au drop de fin de partie. */
  animated?: boolean;
  className?: string;
}

export function BoosterPack({
  kind,
  onClick,
  disabled = false,
  animated = false,
  className = "",
}: BoosterPackProps) {
  const def = getBooster(kind);

  const body = (
    <>
      {/* Halo */}
      <span
        aria-hidden
        className={`pointer-events-none absolute -inset-4 rounded-[2rem] blur-xl ${
          animated ? "animate-glow-pulse" : ""
        }`}
        style={{ background: `${def.accent}33` }}
      />

      <span
        className="relative flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 px-3 text-center"
        style={{
          borderColor: def.accent,
          background: `linear-gradient(160deg, ${def.accent}44, rgb(var(--color-void-900)) 65%)`,
          boxShadow: `0 0 24px -6px ${def.accent}99`,
        }}
      >
        {/* Bande diagonale brillante */}
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-x-8 top-1/3 h-10 -rotate-12"
          style={{
            background: `linear-gradient(90deg, transparent, ${def.accent}55, transparent)`,
          }}
        />
        <span className="relative font-display text-4xl drop-shadow" aria-hidden>
          🎴
        </span>
        <span
          className="relative font-display text-xs font-black uppercase tracking-[0.2em]"
          style={{ color: def.accent }}
        >
          {def.label.replace("Booster ", "")}
        </span>
        <span className="relative text-[10px] font-medium uppercase tracking-wider text-white/45">
          {def.cardCount} cartes
        </span>
      </span>
    </>
  );

  if (!onClick) {
    return <span className={`relative block ${animated ? "animate-float" : ""} ${className}`}>{body}</span>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Ouvrir le ${def.label.toLowerCase()}`}
      className={`relative block transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-domain disabled:opacity-50 disabled:hover:scale-100 ${
        animated ? "animate-float" : ""
      } ${className}`}
    >
      {body}
    </button>
  );
}
