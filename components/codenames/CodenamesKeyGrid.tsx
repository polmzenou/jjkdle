"use client";

import type { CardColor, ColorKey } from "@/lib/games/codenames/types";
import { CARD_COLOR_BG } from "./colors";

interface CodenamesKeyGridProps {
  /** 36 IDs, ordre de la grille. */
  grid: string[];
  /** Carte-clé (id → couleur), réservée aux maîtres-espions. */
  colorKey: ColorKey;
  /** Cartes déjà révélées (entourées pour repérage). */
  revealed: Record<string, CardColor>;
}

/**
 * Mini-grille 6×6 des couleurs (sans personnages) — visible UNIQUEMENT par les
 * maîtres-espions. Réplique l'emplacement des couleurs de la grille principale.
 */
export function CodenamesKeyGrid({ grid, colorKey, revealed }: CodenamesKeyGridProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-void-800/50 p-2.5">
      <p className="mb-2 font-display text-xs font-bold uppercase tracking-wide text-white/60">
        Carte-clé (maître-espion)
      </p>
      <div className="grid grid-cols-6 grid-rows-6 gap-1">
        {grid.map((id) => {
          const color = colorKey[id];
          const isRevealed = Boolean(revealed[id]);
          return (
            <div
              key={id}
              className={`aspect-square rounded-sm ${
                color ? CARD_COLOR_BG[color] : "bg-white/5"
              } ${isRevealed ? "ring-2 ring-white/70" : ""}`}
            />
          );
        })}
      </div>
    </div>
  );
}
