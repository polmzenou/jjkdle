"use client";

import type { Character } from "@/data/roster/characters";
import { CharacterImage } from "@/components/CharacterImage";

interface GuessWhoSecretPanelProps {
  /** Mon perso secret (celui que l'adversaire doit deviner). */
  secret: Character | null;
}

/**
 * Carte mystère du joueur, affichée à part (plus grande) à gauche de la grille —
 * comme dans le vrai Guess Who. L'original reste visible/marqué dans la grille.
 */
export function GuessWhoSecretPanel({ secret }: GuessWhoSecretPanelProps) {
  return (
    <aside className="lg:sticky lg:top-6">
      <div className="rounded-2xl border border-domain/40 bg-void-800/60 p-4 text-center">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-domain-light">
          Ton secret
        </p>
        <div className="mx-auto aspect-[3/4] w-full max-w-[10rem] overflow-hidden rounded-xl border border-domain-light bg-void-900 shadow-glow">
          {secret ? (
            <CharacterImage character={secret} />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/30">
              …
            </div>
          )}
        </div>
        <p className="mt-3 font-display text-lg font-bold text-white">
          {secret?.name ?? "…"}
        </p>
        <p className="mt-2 text-xs text-white/40">
          C'est le personnage que ton adversaire doit deviner.
        </p>
      </div>
    </aside>
  );
}
