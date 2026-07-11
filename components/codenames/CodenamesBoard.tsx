"use client";

import type { Character } from "@/data/roster/characters";
import type { CardColor } from "@/lib/games/codenames/types";
import { CharacterImage } from "@/components/CharacterImage";
import { CARD_COLOR_BG, CARD_COLOR_BORDER } from "./colors";

interface CodenamesBoardProps {
  /** 36 personnages, ordre de la grille (6×6). */
  characters: Character[];
  /** id → couleur des cartes déjà révélées. */
  revealed: Record<string, CardColor>;
  /** Vrai si le joueur courant peut révéler (agent de l'équipe active + indice donné). */
  canReveal: boolean;
  pending: boolean;
  onReveal: (charId: string) => void;
}

/**
 * Grille 6×6 centrale. Tout le monde voit les personnages ; les cartes révélées
 * affichent leur couleur et sont verrouillées. Cliquables uniquement quand
 * `canReveal` (agents de l'équipe active, pendant leur tour).
 */
export function CodenamesBoard({
  characters,
  revealed,
  canReveal,
  pending,
  onReveal,
}: CodenamesBoardProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto grid min-h-0 w-full max-w-[46rem] flex-1 grid-cols-6 grid-rows-6 gap-1.5">
        {characters.map((c) => {
          const color = revealed[c.id];
          const isRevealed = Boolean(color);
          const interactive = canReveal && !isRevealed && !pending;
          return (
            <div key={c.id} className="relative min-h-0">
              <button
                type="button"
                disabled={!interactive}
                onClick={() => interactive && onReveal(c.id)}
                className={`group relative h-full w-full overflow-hidden rounded-lg border transition-all ${
                  isRevealed
                    ? `${CARD_COLOR_BORDER[color]} ${CARD_COLOR_BG[color]}`
                    : interactive
                      ? "border-white/15 hover:border-domain-light hover:scale-[1.02] cursor-pointer"
                      : "border-white/10 cursor-default"
                }`}
              >
                <div
                  className={`h-full w-full ${isRevealed ? "opacity-30 grayscale" : ""}`}
                >
                  <CharacterImage character={c} />
                </div>
                {/* Bandeau nom */}
                <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-void-900/80 px-1 py-0.5 text-center text-[0.6rem] font-semibold text-white/90">
                  {c.name}
                </span>
                {color === "ASSASSIN" && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-2xl">
                    💀
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
