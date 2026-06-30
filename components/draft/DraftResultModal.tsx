"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CharacterImage } from "@/components/CharacterImage";
import { BadgeToast } from "@/components/badges/BadgeToast";
import { DRAFT_CATEGORIES } from "@/lib/games/draft/categories";
import type {
  CombatResult,
  DraftCharacter,
  DraftSelection,
} from "@/lib/games/draft/types";

interface DraftResultModalProps {
  result: CombatResult;
  selection: DraftSelection;
  rosterById: Record<string, DraftCharacter>;
  isAuthed: boolean;
  onReplay: () => void;
}

/**
 * Écran de fin (victoire / défaite) : ennemis vaincus, récap du draft,
 * enregistrement au leaderboard (le serveur recalcule le score), rejouer.
 * Le score global caché n'est jamais montré.
 */
export function DraftResultModal({
  result,
  selection,
  rosterById,
  isAuthed,
  onReplay,
}: DraftResultModalProps) {
  const victory = result.outcome === "VICTORY";
  const color = victory ? "#22c55e" : "#dc2626";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-void-900/85 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="my-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-void-800/90 p-8 text-center"
      >
        <p className="text-sm uppercase tracking-[0.3em] text-white/40">
          {victory ? "Tous les boss vaincus" : "Ton sorcier est tombé"}
        </p>
        <h2
          className="my-2 font-display text-5xl font-black"
          style={{ color, textShadow: `0 0 26px ${color}88` }}
        >
          {victory ? "Victoire !" : "Défaite"}
        </h2>

        <p className="mt-3 text-white/70">
          Ennemis vaincus :{" "}
          <span className="font-display text-2xl font-black text-domain-light">
            {result.enemiesKilled}
          </span>{" "}
          <span className="text-white/40">/ {result.duels.length}</span>
        </p>

        {/* Récap du draft */}
        <div className="mt-6 grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-3">
          {DRAFT_CATEGORIES.map((cat) => {
            const id = selection[cat.id];
            const character = id ? rosterById[id] : undefined;
            if (!character) return null;
            return (
              <div key={cat.id} className="text-center">
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-white/10 bg-void-900">
                  <CharacterImage character={character} />
                </div>
                <p className="mt-1 truncate text-[9px] uppercase tracking-wide text-white/40">
                  {cat.label}
                </p>
              </div>
            );
          })}
        </div>

        <SubmitDraftScore selection={selection} isAuthed={isAuthed} />

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

/** Enregistrement au leaderboard : POST du draft, le serveur recalcule le score. */
function SubmitDraftScore({
  selection,
  isAuthed,
}: {
  selection: DraftSelection;
  isAuthed: boolean;
}) {
  const [phase, setPhase] = useState<"idle" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  if (!isAuthed) {
    return (
      <div className="mt-5 rounded-xl border border-amber-300/30 bg-amber-300/5 px-4 py-3 text-sm">
        <p className="text-white/70">
          🔒 Connecte-toi pour enregistrer ton score et apparaître au classement.
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
        const res = await fetch("/api/games/jujutsu-draft/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draft: selection }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          newBadges?: string[];
        };
        if (res.ok && data.ok) {
          setNewBadges(data.newBadges ?? []);
          setPhase("done");
        } else setError(data.error ?? "Échec de l'enregistrement.");
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
