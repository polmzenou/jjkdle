"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { GradeTier } from "@/lib/scoring/grades";
import type { CategoryBreakdown } from "@/lib/scoring/scoring";
import { MAX_SCORE } from "@/lib/scoring/scoring";
import { CategoryTile } from "./CategoryTile";
import { SubmitScore } from "./leaderboard/SubmitScore";

interface ScoreRevealProps {
  score: number;
  grade: GradeTier;
  breakdown: CategoryBreakdown[];
  bestScore: number;
  isNewRecord: boolean;
  isAuthed: boolean;
  onRestart: () => void;
}

export function ScoreReveal({
  score,
  grade,
  breakdown,
  bestScore,
  isNewRecord,
  isAuthed,
  onRestart,
}: ScoreRevealProps) {
  const animatedScore = useCountUp(score, 1100);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-void-800/70 p-8 text-center backdrop-blur"
    >
      <p className="text-sm uppercase tracking-[0.3em] text-white/40">
        Build terminé
      </p>

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 14 }}
        className="my-4 font-display text-6xl font-black"
        style={{ color: grade.color, textShadow: `0 0 28px ${grade.color}88` }}
      >
        {grade.label}
      </motion.div>

      <div className="font-display text-5xl font-bold text-white">
        {animatedScore}
        <span className="text-2xl text-white/40"> / {MAX_SCORE}</span>
      </div>

      {isNewRecord ? (
        <p className="mt-3 animate-glow-pulse font-semibold text-cursed-light">
          ⚡ Nouveau record&nbsp;!
        </p>
      ) : (
        <p className="mt-3 text-sm text-white/50">
          Meilleur score&nbsp;: <span className="font-semibold text-white">{bestScore}</span>
        </p>
      )}

      {/* Récap des choix : mêmes cartes que le jeu, sans les points */}
      <p className="mt-7 text-sm uppercase tracking-[0.2em] text-white/40">
        Ton build
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-3">
        {breakdown.map(({ category, character }) => (
          <div
            key={category.id}
            // justify-center du parent → la dernière ligne incomplète est centrée.
            className="w-[calc(33.333%-12px)] sm:w-[calc(25%-12px)] md:w-[calc(20%-12px)]"
          >
            <CategoryTile
              category={category}
              character={character}
              locked
              onTap={() => {}}
              drawKey={0}
            />
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-sm">
        <SubmitScore score={score} game="builder" isAuthed={isAuthed} />
      </div>

      <button
        type="button"
        onClick={onRestart}
        className="mt-4 rounded-xl bg-domain px-6 py-3 font-display font-bold uppercase tracking-wide text-white shadow-glow transition-transform hover:scale-105 active:scale-95"
      >
        Rejouer
      </button>
    </motion.div>
  );
}

/** Compteur animé de 0 → `target` sur `durationMs`. */
function useCountUp(target: number, durationMs: number): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}
