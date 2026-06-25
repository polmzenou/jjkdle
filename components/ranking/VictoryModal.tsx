"use client";

import { motion } from "framer-motion";
import { RankingCard, LOCK_COLOR } from "./RankingCard";
import { SubmitScore } from "@/components/leaderboard/SubmitScore";
import { formatScore } from "@/lib/format";

interface VictoryModalProps {
  /** Classement correct (ordre = rangs 1→8). */
  order: string[];
  category: string;
  score: number;
  bestScore: number;
  isNewRecord: boolean;
  onReplay: () => void;
}

/** Modal de victoire : classement correct complet + points gagnés. */
export function VictoryModal({
  order,
  category,
  score,
  bestScore,
  isNewRecord,
  onReplay,
}: VictoryModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-void-900/80 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="my-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-void-800/90 p-8 text-center"
      >
        <p className="text-sm uppercase tracking-[0.3em] text-white/40">
          Classement parfait
        </p>
        <h2
          className="my-2 font-display text-5xl font-black"
          style={{ color: LOCK_COLOR, textShadow: `0 0 26px ${LOCK_COLOR}88` }}
        >
          Victoire !
        </h2>
        <p className="text-sm text-white/55">{category}</p>

        <div className="my-4 font-display text-4xl font-bold text-white">
          +{formatScore(score)}
          <span className="text-lg text-white/40"> pts</span>
        </div>

        {isNewRecord ? (
          <p className="animate-glow-pulse font-semibold text-cursed-light">
            ⚡ Nouveau record&nbsp;!
          </p>
        ) : (
          <p className="text-sm text-white/50">
            Meilleur score&nbsp;:{" "}
            <span className="font-semibold text-white">
              {formatScore(bestScore)}
            </span>
          </p>
        )}

        {/* Classement correct complet */}
        <div className="mt-6 grid grid-cols-4 gap-3">
          {order.map((id, i) => (
            <div key={id} className="relative">
              <span className="absolute -left-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-void-900 text-xs font-bold text-white">
                {i + 1}
              </span>
              <RankingCard characterId={id} accent={LOCK_COLOR} />
            </div>
          ))}
        </div>

        <SubmitScore score={score} game="ranking" />

        <button
          type="button"
          onClick={onReplay}
          className="mt-4 rounded-xl bg-domain px-6 py-3 font-display font-bold uppercase tracking-wide text-white shadow-glow transition-transform hover:scale-105 active:scale-95"
        >
          Rejouer
        </button>
      </motion.div>
    </div>
  );
}
