"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { submitJjkdleScoreAction } from "./actions";

interface SubmitJjkdleScoreProps {
  /** L'utilisateur est-il connecté ? Conditionne l'enregistrement du score. */
  isAuthed: boolean;
}

/**
 * Enregistrement du score quotidien JJKdle depuis l'écran de victoire.
 *  - non connecté → invite à se connecter (lien /login) ;
 *  - connecté → bouton « Enregistrer mon score » (essais relus côté serveur).
 * Calqué sur components/leaderboard/SubmitScore.tsx.
 */
export function SubmitJjkdleScore({ isAuthed }: SubmitJjkdleScoreProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!isAuthed) {
    return (
      <div className="mt-5 rounded-xl border border-amber-300/30 bg-amber-300/5 px-4 py-3 text-sm">
        <p className="text-white/70">
          🔒 Connecte-toi pour ajouter ton score au classement du jour.
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
          ✓ Score ajouté au classement du jour&nbsp;!
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

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await submitJjkdleScoreAction();
        if (res.ok) {
          setPhase("done");
          router.refresh(); // rafraîchit le leaderboard sous le jeu
        } else {
          setError(res.error ?? "Échec.");
        }
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
        {pending ? "Enregistrement…" : "🏆 Ajouter mon score au classement"}
      </button>
      {error && <p className="mt-2 text-sm text-cursed-light">{error}</p>}
    </div>
  );
}
