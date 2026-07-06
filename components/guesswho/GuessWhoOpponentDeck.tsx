"use client";

import type { Character } from "@/data/roster/characters";
import { CharacterImage } from "@/components/CharacterImage";

interface GuessWhoOpponentDeckProps {
  /** Les 25 personnages de la grille partagée (même ordre que ton plateau). */
  characters: Character[];
  /** IDs que l'adversaire a grisés, reçus en direct via Pusher. */
  eliminated: Set<string>;
}

/**
 * Miroir en direct du plateau adverse : mêmes 25 cartes, grisées au fur et à
 * mesure que l'adversaire élimine. Lecture seule (aucune interaction).
 */
export function GuessWhoOpponentDeck({
  characters,
  eliminated,
}: GuessWhoOpponentDeckProps) {
  const remaining = characters.length - eliminated.size;

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-void-800/50 p-3">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">
          Deck adverse
        </p>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[0.65rem] font-bold text-white/60">
          {remaining} restant{remaining > 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-5 grid-rows-5 gap-1">
        {characters.map((char) => {
          const isOut = eliminated.has(char.id);
          return (
            <div
              key={char.id}
              title={char.name}
              className={`relative min-h-0 overflow-hidden rounded-md border transition-all ${
                isOut ? "border-white/5 opacity-20 grayscale" : "border-white/10 opacity-100"
              }`}
            >
              <CharacterImage character={char} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
