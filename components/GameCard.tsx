"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import type { Game } from "@/lib/games/types";

interface GameCardProps {
  game: Game;
  /** Index pour l'animation d'apparition échelonnée + le badge "01". */
  index: number;
}

/** Vignette d'un jeu sur le hub : carte premium, accent par jeu, CTA animé. */
export function GameCard({ game, index }: GameCardProps) {
  const isComingSoon = game.status === "coming-soon";
  const accent = game.accent ?? "#7c3aed";
  const accentVars = { "--accent": accent } as CSSProperties;

  const inner = (
    <div
      style={accentVars}
      className="group/card relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-void-800/50 p-7 backdrop-blur-md transition-all duration-300 group-hover/card:-translate-y-1.5 group-hover/card:border-[var(--accent)] group-hover/card:shadow-[0_18px_50px_-12px_var(--accent)] group-focus-visible/card:border-[var(--accent)]"
    >
      {/* Lueur d'accent qui s'allume au survol */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/card:opacity-100"
        style={{
          background:
            "radial-gradient(120% 80% at 30% 0%, var(--accent) 0%, transparent 55%)",
          mixBlendMode: "soft-light",
        }}
      />
      {/* Liseré d'accent en haut */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--accent), transparent)",
        }}
      />

      {/* Numéro discret */}
      <span className="absolute right-6 top-6 font-display text-5xl font-black leading-none text-white/[0.06]">
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Orbe glyphe */}
      <div
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl transition-transform duration-300 group-hover/card:scale-110"
        style={{
          background: `${accent}1f`,
          boxShadow: `inset 0 0 0 1px ${accent}55, 0 0 24px -6px ${accent}`,
        }}
      >
        {game.glyph ?? "🎮"}
      </div>

      <h2 className="font-display text-2xl font-bold tracking-tight text-white">
        {game.title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-white/55">
        {game.description}
      </p>

      {game.tags && (
        <div className="mt-4 flex flex-wrap gap-2">
          {game.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/55"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* CTA / état */}
      <div className="mt-6 flex items-center justify-between pt-1">
        {isComingSoon ? (
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/40">
            Bientôt disponible
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider"
            style={{ color: accent }}
          >
            Jouer
            <span className="transition-transform duration-300 group-hover/card:translate-x-1.5">
              →
            </span>
          </span>
        )}
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.1, duration: 0.5, ease: "easeOut" }}
      className="h-full"
    >
      {isComingSoon ? (
        <div className="group/card block h-full cursor-not-allowed opacity-55">
          {inner}
        </div>
      ) : (
        <Link
          href={game.route}
          className="group/card block h-full rounded-3xl focus:outline-none"
          aria-label={`Jouer à ${game.title}`}
        >
          {inner}
        </Link>
      )}
    </motion.div>
  );
}
