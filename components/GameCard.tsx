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

/**
 * Vignette d'un jeu sur le hub.
 * - Au repos : sobre (pas de glow), screenshot masqué (desktop) ou très discret (mobile).
 * - Au survol : la carte se soulève, le glow d'accent s'allume et le screenshot
 *   du jeu se révèle en fond (faible opacité, overlay sombre pour le contraste).
 */
export function GameCard({ game, index }: GameCardProps) {
  const isComingSoon = game.status === "coming-soon";
  const isMultiplayerOnly = game.multiplayerOnly === true;
  const accent = game.accent ?? "#7c3aed";
  const accentVars = { "--accent": accent } as CSSProperties;

  const inner = (
    <div
      style={accentVars}
      className="group/card relative h-full overflow-hidden rounded-3xl border border-white/10 bg-void-800/50 backdrop-blur-md transition-all duration-300 group-hover/card:-translate-y-1 group-hover/card:border-[var(--accent)] group-hover/card:shadow-[0_18px_50px_-12px_var(--accent)] group-focus-visible/card:border-[var(--accent)]"
    >
      {/* Screenshot du jeu en fond (révélé au survol ; discret en permanence sur mobile) */}
      {game.previewImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={game.previewImage}
          alt={`Aperçu du jeu ${game.title}`}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.12] transition-opacity duration-[400ms] ease-out md:opacity-0 md:group-hover/card:opacity-25"
        />
      )}

      {/* Overlay sombre pour garantir le contraste du texte par-dessus le screenshot */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void-900 via-void-900/80 to-void-900/40"
      />

      {/* Lueur d'accent radiale, uniquement au survol */}
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

      {/* Badge "multijoueur uniquement" (coin haut-droit), sinon numéro filigrane */}
      {isMultiplayerOnly ? (
        <span
          className="absolute right-4 top-4 z-20 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
          style={{
            color: accent,
            borderColor: `${accent}66`,
            backgroundColor: `${accent}1a`,
          }}
        >
          ⚡ Multi uniquement
        </span>
      ) : null}

      {/* Contenu */}
      <div className="relative z-10 flex h-full flex-col p-7">
        {/* Numéro en filigrane (masqué quand un badge occupe le coin) */}
        {!isMultiplayerOnly && (
          <span className="pointer-events-none absolute right-5 top-4 font-display text-5xl font-black leading-none text-white/[0.06] transition-colors duration-300 group-hover/card:text-white/[0.13]">
            {String(index + 1).padStart(2, "0")}
          </span>
        )}

        <h2 className="pr-12 font-display text-2xl font-bold tracking-tight text-white">
          {game.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          {game.description}
        </p>

        {game.tags && (
          <div className="mt-4 flex flex-wrap gap-2">
            {game.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/55 transition-colors duration-300 group-hover/card:border-white/25 group-hover/card:text-[var(--accent)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* CTA / état, collé en bas */}
        <div className="mt-auto flex items-center justify-between pt-6">
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
