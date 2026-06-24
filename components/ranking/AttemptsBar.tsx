"use client";

import { MAX_ATTEMPTS, scoreForAttempt } from "@/lib/ranking/ranking";

interface AttemptsBarProps {
  /** Tentative courante (1-based). */
  attempt: number;
  /** Toutes les positions sont remplies → check possible. */
  canCheck: boolean;
  onCheck: () => void;
}

/** Bandeau bas : pips de tentatives, bouton CHECK ORDER centré, valeur de points. */
export function AttemptsBar({ attempt, canCheck, onCheck }: AttemptsBarProps) {
  return (
    <div className="sticky bottom-0 z-20 mt-6 grid grid-cols-3 items-center gap-3 rounded-2xl border border-white/10 bg-void-900/85 px-5 py-4 backdrop-blur">
      {/* Pips de tentatives */}
      <div className="flex items-center gap-2 text-sm">
        <span className="hidden text-xs uppercase tracking-wider text-white/50 sm:inline">
          Attempt
        </span>
        <div className="flex gap-1.5">
          {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
            <span
              key={i}
              className="h-3 w-3 rounded-full"
              style={{
                background:
                  i < attempt - 1
                    ? "#ef4444" // tentatives consommées
                    : i === attempt - 1
                      ? "#7c3aed" // tentative en cours
                      : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>
        <span className="font-bold text-white">
          {attempt}/{MAX_ATTEMPTS}
        </span>
      </div>

      {/* Bouton central */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onCheck}
          disabled={!canCheck}
          className="rounded-xl bg-domain px-6 py-2.5 font-display font-bold uppercase tracking-wider text-white shadow-glow transition-transform enabled:hover:scale-105 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Check Order
        </button>
      </div>

      {/* Valeur de points courante */}
      <p className="text-right text-xs text-domain-light sm:text-sm">
        Worth{" "}
        <span className="font-bold">
          {scoreForAttempt(attempt).toLocaleString("fr-FR")}
        </span>{" "}
        pts if correct now
      </p>
    </div>
  );
}
