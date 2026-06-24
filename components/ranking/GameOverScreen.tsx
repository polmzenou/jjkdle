"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { RankingCard, WRONG_COLOR } from "./RankingCard";

interface GameOverScreenProps {
  /** Classement correct révélé en fin de partie. */
  order: string[];
  category: string;
  onRetry: () => void;
}

/** Écran de game over : classement correct révélé + Retry / Back. */
export function GameOverScreen({ order, category, onRetry }: GameOverScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-void-900/85 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="my-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-void-800/90 p-8 text-center"
      >
        <p className="text-sm uppercase tracking-[0.3em] text-white/40">
          Tentatives épuisées
        </p>
        <h2
          className="my-2 font-display text-5xl font-black glitch-hover"
          style={{ color: WRONG_COLOR, textShadow: `0 0 26px ${WRONG_COLOR}88` }}
        >
          Game Over
        </h2>
        <p className="text-sm text-white/55">{category} — le bon classement&nbsp;:</p>

        <div className="mt-6 grid grid-cols-4 gap-3">
          {order.map((id, i) => (
            <div key={id} className="relative">
              <span className="absolute -left-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-void-900 text-xs font-bold text-white">
                {i + 1}
              </span>
              <RankingCard characterId={id} />
            </div>
          ))}
        </div>

        <div className="mt-7 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-xl border border-white/15 px-6 py-3 font-display font-bold uppercase tracking-wide text-white/70 transition-colors hover:text-white"
          >
            Back
          </Link>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl bg-domain px-6 py-3 font-display font-bold uppercase tracking-wide text-white shadow-glow transition-transform hover:scale-105 active:scale-95"
          >
            Retry
          </button>
        </div>
      </motion.div>
    </div>
  );
}
