"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Character } from "@/data/roster/characters";
import { CharacterImage } from "@/components/CharacterImage";

interface GuessWhoResultModalProps {
  open: boolean;
  won: boolean;
  /** Mon perso secret (celui que l'adversaire devait deviner). */
  mySecret: Character | null;
  /** Le perso secret de l'adversaire (celui que je devais deviner). */
  opponentSecret: Character | null;
  isHost: boolean;
  pending: boolean;
  onPlayAgain: () => void;
  onLeave: () => void;
}

function SecretCard({ label, character }: { label: string; character: Character | null }) {
  return (
    <div className="flex flex-col items-center">
      <span className="mb-2 text-xs uppercase tracking-wider text-white/45">{label}</span>
      <div className="h-32 w-24 overflow-hidden rounded-2xl border border-white/10 bg-void-900">
        {character && <CharacterImage character={character} />}
      </div>
      <span className="mt-2 text-sm font-semibold text-white">
        {character?.name ?? "—"}
      </span>
    </div>
  );
}

/** Écran de fin : victoire/défaite + révélation des deux secrets + rejouer/retour. */
export function GuessWhoResultModal({
  open,
  won,
  mySecret,
  opponentSecret,
  isHost,
  pending,
  onPlayAgain,
  onLeave,
}: GuessWhoResultModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-void-900/85 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="my-auto w-full max-w-lg rounded-3xl border border-white/10 bg-void-800/95 p-8 text-center"
          >
            <p className="text-sm uppercase tracking-[0.3em] text-white/40">
              Qui est-ce ?
            </p>
            <h2
              className={`mt-2 font-display text-4xl font-black ${
                won ? "text-domain-light" : "text-cursed-light"
              }`}
            >
              {won ? "Victoire !" : "Défaite"}
            </h2>

            <div className="mt-8 flex items-start justify-center gap-8">
              <SecretCard label="Ton secret" character={mySecret} />
              <SecretCard label="Secret adverse" character={opponentSecret} />
            </div>

            <div className="mt-8 flex flex-col items-center gap-3">
              {isHost ? (
                <button
                  type="button"
                  onClick={onPlayAgain}
                  disabled={pending}
                  className="w-full max-w-xs rounded-xl bg-domain px-6 py-3 font-display font-bold uppercase tracking-wide text-white shadow-glow transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
                >
                  Rejouer
                </button>
              ) : (
                <p className="text-sm text-white/50">
                  En attente d'une nouvelle partie par l'hôte…
                </p>
              )}
              <button
                type="button"
                onClick={onLeave}
                disabled={pending}
                className="text-sm text-white/40 transition-colors hover:text-cursed-light"
              >
                Retour au lobby
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
