"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import type { Game } from "@/lib/games/types";

interface MultiplayerPickerProps {
  /** Jeux disposant d'un mode multi (déjà filtrés côté serveur depuis le registre). */
  games: Game[];
}

/**
 * CTA + modale de choix du jeu en multijoueur. Le hub `/games` ne propose plus
 * un seul jeu (le builder) mais ouvre cette modale listant tous les jeux qui
 * déclarent un mode multi dans le registre. Les jeux dont le multi n'est pas
 * encore prêt apparaissent en "Bientôt" (non cliquables).
 */
export function MultiplayerPicker({ games }: MultiplayerPickerProps) {
  const [open, setOpen] = useState(false);

  // Fermeture au clavier (Échap) + verrou du scroll de fond quand ouvert.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* ── CTA d'ouverture ── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full flex-col items-center gap-4 rounded-3xl border border-domain/30 bg-gradient-to-br from-domain/15 to-cursed/10 p-8 text-center transition-transform hover:scale-[1.01] sm:flex-row sm:text-left"
      >
        <span className="text-4xl">⚔️</span>
        <div className="flex-1">
          <h3 className="font-display text-xl font-bold text-white">
            Mode multijoueur
          </h3>
          <p className="mt-1 text-sm text-white/60">
            Lobby privé, en temps réel. Choisis un jeu et affronte tes amis.
          </p>
        </div>
        <span className="rounded-xl bg-domain px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-white shadow-glow transition-transform group-hover:scale-105">
          Jouer en ligne
        </span>
      </button>

      {/* ── Modale de sélection ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-void-900/80 p-4 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Choisir un jeu en multijoueur"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="my-auto w-full max-w-lg rounded-3xl border border-white/10 bg-void-800/95 p-6 sm:p-8"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-domain-light">
                    Multijoueur
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold text-white">
                    Choisis un jeu
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Fermer"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/60 transition-colors hover:border-white/30 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <ul className="space-y-3">
                {games.map((game) => {
                  const accent = game.accent ?? "#7c3aed";
                  const ready =
                    game.multiplayer?.status === "live" &&
                    !!game.multiplayer.route;

                  const body = (
                    <>
                      <span className="text-2xl">{game.glyph ?? "🎮"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-base font-bold text-white">
                          {game.title}
                        </p>
                        <p className="truncate text-xs text-white/50">
                          {game.tags?.join(" · ") ?? "Multijoueur"}
                        </p>
                      </div>
                      {ready ? (
                        <span
                          className="shrink-0 font-display text-sm font-bold uppercase tracking-wider transition-transform group-hover/row:translate-x-1"
                          style={{ color: accent }}
                        >
                          →
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                          Bientôt
                        </span>
                      )}
                    </>
                  );

                  const base =
                    "group/row flex items-center gap-4 rounded-2xl border border-white/10 bg-void-900/50 px-4 py-3.5";

                  return (
                    <li key={game.id}>
                      {ready ? (
                        <Link
                          href={game.multiplayer!.route!}
                          onClick={() => setOpen(false)}
                          className={`${base} transition-colors hover:border-white/25 hover:bg-void-900`}
                        >
                          {body}
                        </Link>
                      ) : (
                        <div
                          className={`${base} cursor-not-allowed opacity-60`}
                          aria-disabled
                        >
                          {body}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
