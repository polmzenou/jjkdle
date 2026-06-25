"use client";

import { useState, useTransition } from "react";
import { submitScoreAction } from "@/lib/leaderboard/actions";
import type { LeaderboardGame } from "@/lib/leaderboard/store";

interface SubmitScoreProps {
  score: number;
  game: LeaderboardGame;
}

/**
 * Bouton « Ajouter au leaderboard » affiché dans les modals de victoire.
 * Déplie un mini-formulaire (pseudo), envoie le score via Server Action,
 * puis propose d'aller voir le classement.
 */
export function SubmitScore({ score, game }: SubmitScoreProps) {
  const [phase, setPhase] = useState<"idle" | "form" | "done">("idle");
  const [pseudo, setPseudo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (phase === "done") {
    return (
      <div className="mt-5 rounded-xl border border-amber-300/30 bg-amber-300/5 px-4 py-3 text-sm">
        <p className="font-semibold text-amber-200">
          ✓ Score ajouté au classement&nbsp;!
        </p>
        <a
          href="#leaderboard"
          className="mt-1 inline-block font-display text-xs font-bold uppercase tracking-wide text-domain-light underline-offset-4 hover:underline"
        >
          Voir le classement ↓
        </a>
      </div>
    );
  }

  if (phase === "idle") {
    return (
      <button
        type="button"
        onClick={() => setPhase("form")}
        className="mt-5 w-full rounded-xl border border-amber-300/40 bg-amber-300/10 px-6 py-3 font-display font-bold uppercase tracking-wide text-amber-200 transition-transform hover:scale-[1.02] active:scale-95"
      >
        🏆 Ajouter au leaderboard
      </button>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await submitScoreAction(pseudo, score, game);
        if (res.ok) setPhase("done");
        else setError(res.error ?? "Échec.");
      } catch {
        setError("Erreur réseau — réessaie.");
      }
    });
  };

  return (
    <form onSubmit={submit} className="mt-5 space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          placeholder="Ton pseudo"
          maxLength={24}
          autoFocus
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-void-900/70 px-4 py-3 text-white outline-none focus:border-amber-300"
        />
        <button
          type="submit"
          disabled={pending || pseudo.trim().length < 2}
          className="shrink-0 rounded-xl bg-amber-300 px-5 py-3 font-display font-bold uppercase tracking-wide text-void-900 transition-transform enabled:hover:scale-105 disabled:opacity-40"
        >
          {pending ? "…" : "Valider"}
        </button>
      </div>
      {error && <p className="text-sm text-cursed-light">{error}</p>}
    </form>
  );
}
