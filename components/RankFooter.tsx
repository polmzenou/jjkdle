"use client";

import { getGrade, GRADE_TIERS } from "@/lib/scoring/grades";

interface RankFooterProps {
  /** Meilleur score local (cookie). 0 si jamais joué. */
  bestScore: number;
}

/**
 * Footer "Best Rank / Top Ranks" inspiré de la maquette.
 *  - Best Rank : meilleur grade atteint localement (dérivé du best score cookie).
 *  - Top Ranks : échelle des paliers les plus élevés à viser.
 */
export function RankFooter({ bestScore }: RankFooterProps) {
  const hasPlayed = bestScore > 0;
  const bestGrade = getGrade(bestScore);

  // Les 3 paliers les plus hauts comme "ranks à viser".
  const topRanks = GRADE_TIERS.slice(0, 3);

  return (
    <div className="mt-8 grid items-center gap-6 rounded-2xl border border-white/10 bg-void-800/60 p-6 backdrop-blur sm:grid-cols-2">
      {/* Best Rank */}
      <div className="text-center sm:border-r sm:border-white/10 sm:text-left">
        <p className="flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/60 sm:justify-start">
          🏆 Best Rank
        </p>
        {hasPlayed ? (
          <p
            className="mt-1 font-display text-2xl font-black"
            style={{ color: bestGrade.color, textShadow: `0 0 18px ${bestGrade.color}66` }}
          >
            {bestGrade.label}
            <span className="ml-2 align-middle text-base font-bold text-white/60">
              {bestScore}
            </span>
          </p>
        ) : (
          <p className="mt-1 text-sm text-white/40">Joue pour obtenir un rang&nbsp;!</p>
        )}
      </div>

      {/* Top Ranks à viser */}
      <div>
        <div className="flex flex-wrap justify-center gap-3 sm:justify-end">
          {topRanks.map((tier) => (
            <div
              key={tier.id}
              className="rounded-xl border px-4 py-2 text-center"
              style={{ borderColor: `${tier.color}55`, background: `${tier.color}14` }}
            >
              <p className="font-display text-sm font-bold" style={{ color: tier.color }}>
                {tier.label}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-center text-[11px] uppercase tracking-wider text-white/40 sm:text-right">
          Top Ranks
        </p>
      </div>
    </div>
  );
}
