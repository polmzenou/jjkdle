"use client";

import { CharacterImage } from "@/components/CharacterImage";
import type { RosterMap } from "@/lib/multiplayer/state";
import { DECK_SIZE } from "@/lib/games/battle/types";

interface DeckGridProps {
  title: string;
  deckIds: string[];
  rosterMap: RosterMap;
  /** Couleur d'accent de la bordure des cartes occupées. */
  accent: string;
  /** Affiche le compteur `n/5` à côté du titre (phase de draft). */
  showCount?: boolean;
}

/** Grille de deck (5 emplacements) partagée par le draft et l'écran de résultat. */
export function DeckGrid({
  title,
  deckIds,
  rosterMap,
  accent,
  showCount = false,
}: DeckGridProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-void-800/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="truncate font-display text-sm font-bold text-white">
          {title}
        </p>
        {showCount && (
          <p className="text-xs text-white/45">
            {deckIds.length}/{DECK_SIZE}
          </p>
        )}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: DECK_SIZE }).map((_, i) => {
          const character = deckIds[i] ? rosterMap[deckIds[i]] : null;
          return (
            <div
              key={i}
              className="relative aspect-[3/4] overflow-hidden rounded-lg border bg-void-900"
              style={{
                borderColor: character ? `${accent}88` : "rgba(255,255,255,0.08)",
              }}
            >
              {character && <CharacterImage character={character} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
