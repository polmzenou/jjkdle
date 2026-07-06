"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Character } from "@/data/roster/characters";
import { CharacterImage } from "@/components/CharacterImage";

interface GuessConfirmModalProps {
  /** Personnage à deviner (null = modal fermé). */
  character: Character | null;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation avant un guess : un mauvais guess fait perdre immédiatement,
 * d'où la double validation. « Vous êtes sûr que c'est [Nom] ? »
 */
export function GuessConfirmModal({
  character,
  pending,
  onConfirm,
  onCancel,
}: GuessConfirmModalProps) {
  return (
    <AnimatePresence>
      {character && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-void-900/85 p-4 backdrop-blur-sm"
          onClick={pending ? undefined : onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="my-auto w-full max-w-sm rounded-3xl border border-white/10 bg-void-800/95 p-7 text-center"
          >
            <div className="mx-auto h-32 w-24 overflow-hidden rounded-2xl border border-white/10 bg-void-900">
              <CharacterImage character={character} />
            </div>
            <h2 className="mt-5 font-display text-xl font-bold text-white">
              Vous êtes sûr que c'est
              <br />
              <span className="text-domain-light">{character.name}</span> ?
            </h2>
            <p className="mt-2 text-xs text-white/45">
              Un mauvais choix te fait perdre la partie immédiatement.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={pending}
                className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-display font-bold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10 disabled:opacity-40"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={pending}
                className="flex-1 rounded-xl bg-cursed px-4 py-3 font-display font-bold uppercase tracking-wide text-white shadow-glow-cursed transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
              >
                Confirmer
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
