"use client";

import type { CSSProperties } from "react";
import type { CategoryConfig } from "@/data/roster/categories";
import { CategoryTile } from "@/components/CategoryTile";
import {
  deriveBoard,
  type RosterMap,
} from "@/lib/multiplayer/state";
import type { SerializedPlayer } from "@/lib/multiplayer/events";

interface PlayerBoardProps {
  player: SerializedPlayer;
  categories: CategoryConfig[];
  rosterMap: RosterMap;
  /** Variante réduite (plateaux adverses / récap). */
  compact?: boolean;
  /** Nombre de colonnes en mode compact (défaut : tout sur une ligne). */
  compactCols?: number;
  /**
   * Nombre de colonnes pour le grand plateau (mon deck). Si non fourni, on garde
   * la disposition fluide responsive (4/6/7 colonnes). Utile pour agrandir les
   * cartes quand le deck a moins de largeur (ex. layout 3 joueurs au centre).
   */
  cols?: number;
  /** Le joueur peut-il verrouiller une case (mon plateau, manche en cours) ? */
  interactive?: boolean;
  onLock?: (categoryId: string) => void;
}

/**
 * Plateau d'un joueur (le mien en grand/interactif, les adversaires en compact/
 * lecture seule). Réutilise `CategoryTile` : les animations pop-in / lock se
 * rejouent automatiquement quand le tirage ou la sélection change.
 */
export function PlayerBoard({
  player,
  categories,
  rosterMap,
  compact = false,
  compactCols,
  cols,
  interactive = false,
  onLock,
}: PlayerBoardProps) {
  const tiles = deriveBoard(player, categories, rosterMap);

  // La case rendue est identique partout ; seule la disposition varie :
  //  • compact : grille serrée (plateaux adverses / récap), lecture seule ;
  //  • cols    : flex à N colonnes fixes (cartes agrandies, ex. layout 3 joueurs) ;
  //  • défaut  : flex responsive (mon deck en 2 joueurs).
  const containerClassName = compact
    ? "grid gap-1"
    : `flex flex-wrap justify-center ${cols ? "gap-3" : "gap-2"}`;
  const containerStyle: CSSProperties | undefined = compact
    ? { gridTemplateColumns: `repeat(${compactCols ?? tiles.length}, minmax(0, 1fr))` }
    : undefined;
  const itemClassName =
    !compact && !cols
      ? "w-[calc(25%-8px)] sm:w-[calc(16.666%-8px)] md:w-[calc(14.285%-8px)]"
      : undefined;
  const itemStyle: CSSProperties | undefined =
    !compact && cols ? { width: `calc(${100 / cols}% - 12px)` } : undefined;
  const readOnly = compact || !interactive;

  return (
    <div className={containerClassName} style={containerStyle}>
      {tiles.map(({ category, character, locked }) => (
        <div key={category.id} className={itemClassName} style={itemStyle}>
          <CategoryTile
            category={category}
            character={character}
            locked={locked}
            onTap={(c) => onLock?.(c.id)}
            drawKey={0}
            compact={compact}
            readOnly={readOnly}
          />
        </div>
      ))}
    </div>
  );
}
