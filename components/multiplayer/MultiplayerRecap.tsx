"use client";

import { motion } from "framer-motion";
import type { CategoryConfig } from "@/data/roster/categories";
import type { RosterMap } from "@/lib/multiplayer/state";
import type { SerializedLobby } from "@/lib/multiplayer/events";
import { getGrade } from "@/lib/scoring/grades";
import { MAX_SCORE } from "@/lib/scoring/scoring";
import { PlayerBoard } from "./PlayerBoard";

interface MultiplayerRecapProps {
  lobby: SerializedLobby;
  categories: CategoryConfig[];
  rosterMap: RosterMap;
  currentUserId: string;
  pending: boolean;
  onPlayAgain: () => void;
  onLeave: () => void;
}

export function MultiplayerRecap({
  lobby,
  categories,
  rosterMap,
  currentUserId,
  pending,
  onPlayAgain,
  onLeave,
}: MultiplayerRecapProps) {
  const isHost = lobby.hostId === currentUserId;
  const ranked = [...lobby.players].sort(
    (a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0),
  );
  const topScore = ranked[0]?.finalScore ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-3xl"
    >
      <p className="text-center text-sm uppercase tracking-[0.3em] text-white/40">
        Partie terminée
      </p>
      <h1 className="mt-2 text-center font-display text-3xl font-bold text-white">
        Résultats
      </h1>

      {/* Classement */}
      <ol className="mt-8 space-y-3">
        {ranked.map((p, i) => {
          const score = p.finalScore ?? 0;
          const grade = getGrade(score);
          const isWinner = score === topScore && topScore > 0;
          return (
            <motion.li
              key={p.userId}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i }}
              className={`flex items-center gap-4 rounded-2xl border px-5 py-4 ${
                isWinner
                  ? "border-domain/50 bg-domain/10"
                  : "border-white/10 bg-void-800/50"
              }`}
            >
              <span className="font-display text-2xl font-black text-white/30">
                {isWinner ? "🏆" : `#${i + 1}`}
              </span>
              <div className="flex-1">
                <p className="font-semibold text-white">
                  {p.username}
                  {p.userId === currentUserId && (
                    <span className="ml-2 text-xs text-white/40">(toi)</span>
                  )}
                </p>
                <p className="text-xs uppercase tracking-wider" style={{ color: grade.color }}>
                  {grade.label}
                </p>
              </div>
              <div className="text-right font-display">
                <span className="text-2xl font-bold text-white">{score}</span>
                <span className="text-sm text-white/40"> / {MAX_SCORE}</span>
              </div>
            </motion.li>
          );
        })}
      </ol>

      {/* Builds finaux — centrés et espacés, en petit, pour comparer sans scroller */}
      <div className="mt-8 flex flex-wrap justify-center gap-6 sm:gap-8">
        {ranked.map((p) => (
          <div key={p.userId} className="w-52 sm:w-64">
            <p className="mb-1.5 truncate text-center text-xs uppercase tracking-[0.15em] text-white/40">
              {p.username}
            </p>
            <PlayerBoard
              player={p}
              categories={categories}
              rosterMap={rosterMap}
              compact
              compactCols={3}
            />
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center gap-3">
        {isHost && (
          <button
            type="button"
            disabled={pending}
            onClick={onPlayAgain}
            className="w-full max-w-xs rounded-xl bg-domain px-6 py-3 font-display font-bold uppercase tracking-wide text-white shadow-glow transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
          >
            Rejouer
          </button>
        )}
        <button
          type="button"
          onClick={onLeave}
          disabled={pending}
          className="text-sm text-white/40 transition-colors hover:text-cursed-light"
        >
          Quitter le lobby
        </button>
      </div>
    </motion.div>
  );
}
