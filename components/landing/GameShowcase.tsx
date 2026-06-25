"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import { GAMES } from "@/lib/games/registry";

/**
 * Présentation des jeux sur la landing : pour chaque jeu en ligne, une rangée
 * alternée screenshot / texte. Le screenshot est mis en valeur dans un cadre
 * "arcade" avec le glow de l'accent du jeu. Se synchronise sur le registre.
 */
export function GameShowcase() {
  const games = GAMES.filter((g) => g.status !== "coming-soon");

  return (
    <div className="flex flex-col gap-20 sm:gap-28">
      {games.map((game, i) => {
        const accent = game.accent ?? "#7c3aed";
        const reversed = i % 2 === 1;

        return (
          <motion.article
            key={game.id}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ "--accent": accent } as CSSProperties}
            className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14"
          >
            {/* Screenshot encadré */}
            <div className={reversed ? "lg:order-2" : ""}>
              <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-void-800/60 shadow-2xl">
                {/* Lueur d'accent derrière l'image */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-60"
                  style={{
                    background:
                      "radial-gradient(120% 90% at 50% 0%, var(--accent) 0%, transparent 60%)",
                    mixBlendMode: "soft-light",
                  }}
                />
                {game.previewImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={game.previewImage}
                    alt={`Capture d'écran du jeu ${game.title}`}
                    className="relative aspect-[2/1] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="relative grid aspect-[2/1] w-full place-items-center text-6xl">
                    {game.glyph}
                  </div>
                )}
                {/* Liseré d'accent en haut */}
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-px"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, var(--accent), transparent)",
                  }}
                />
              </div>
            </div>

            {/* Texte */}
            <div className={reversed ? "lg:order-1" : ""}>
              <span
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em]"
                style={{ color: accent }}
              >
                <span className="text-base">{game.glyph}</span>
                Jeu #{String(i + 1).padStart(2, "0")}
              </span>

              <h3 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {game.title}
              </h3>

              <p className="mt-4 max-w-md leading-relaxed text-white/60">
                {game.description}
              </p>

              {game.tags && (
                <div className="mt-5 flex flex-wrap gap-2">
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

              <Link
                href={game.route}
                className="mt-7 inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-white transition-transform hover:scale-105"
                style={{
                  backgroundColor: accent,
                  boxShadow: `0 14px 40px -12px ${accent}`,
                }}
              >
                Jouer maintenant
                <span aria-hidden>→</span>
              </Link>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}
