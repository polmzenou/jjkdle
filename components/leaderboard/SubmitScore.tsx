"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { submitScoreAction } from "@/lib/leaderboard/actions";
import type { LeaderboardGame } from "@/lib/leaderboard/store";
import { BadgeToast } from "@/components/badges/BadgeToast";

interface SubmitScoreProps {
  score: number;
  game: LeaderboardGame;
  /** L'utilisateur est-il connecté ? Conditionne l'enregistrement du score. */
  isAuthed: boolean;
}

/**
 * Enregistrement du score au leaderboard depuis l'écran de victoire.
 *  - non connecté → invite à se connecter (lien /login) ;
 *  - connecté → bouton « Enregistrer mon score » (lié au compte).
 */
export function SubmitScore({ score, game, isAuthed }: SubmitScoreProps) {
  const [phase, setPhase] = useState<"idle" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  if (!isAuthed) {
    return (
      <div className="mt-5 rounded-xl border border-amber-300/30 bg-amber-300/5 px-4 py-3 text-sm">
        <p className="text-white/70">
          🔒 Connecte-toi pour enregistrer ton score et apparaître au
          classement.
        </p>
        <Link
          href="/login"
          className="mt-2 inline-block font-display text-xs font-bold uppercase tracking-wide text-amber-200 underline-offset-4 hover:underline"
        >
          Se connecter / créer un compte →
        </Link>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="mt-5 rounded-xl border border-amber-300/30 bg-amber-300/5 px-4 py-3 text-sm">
        <p className="font-semibold text-amber-200">
          ✓ Score enregistré au classement&nbsp;!
        </p>
        <a
          href="#leaderboard"
          className="mt-1 inline-block font-display text-xs font-bold uppercase tracking-wide text-domain-light underline-offset-4 hover:underline"
        >
          Voir le classement ↓
        </a>
        <BadgeToast badgeKeys={newBadges} />
      </div>
    );
  }

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await submitScoreAction(score, game);
        if (res.ok) {
          setNewBadges(res.newBadges ?? []);
          setPhase("done");
        } else setError(res.error ?? "Échec.");
      } catch {
        setError("Erreur réseau — réessaie.");
      }
    });
  };

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="w-full rounded-xl border border-amber-300/40 bg-amber-300/10 px-6 py-3 font-display font-bold uppercase tracking-wide text-amber-200 transition-transform enabled:hover:scale-[1.02] active:scale-95 disabled:opacity-40"
      >
        {pending ? "Enregistrement…" : "🏆 Enregistrer mon score"}
      </button>
      {error && <p className="mt-2 text-sm text-cursed-light">{error}</p>}
    </div>
  );
}
