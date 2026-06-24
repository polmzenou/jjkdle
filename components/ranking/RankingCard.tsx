"use client";

import { CHARACTER_BY_ID } from "@/data/roster/characters";
import { CharacterImage, CARD_ACCENT } from "@/components/CharacterImage";

export const LOCK_COLOR = "#22c55e"; // vert "position correcte"
export const WRONG_COLOR = "#ef4444"; // rouge "mauvaise position"

interface RankingCardProps {
  characterId: string;
  /** Accent de bordure (violet par défaut, vert si verrouillé, rouge si faux). */
  accent?: string;
  /** Légère rotation/scale appliquée pendant le drag overlay. */
  dragging?: boolean;
  className?: string;
}

/** Card personnage réutilisable (image + nom), même DA que le reste de l'app. */
export function RankingCard({
  characterId,
  accent = CARD_ACCENT,
  dragging = false,
  className = "",
}: RankingCardProps) {
  const character = CHARACTER_BY_ID[characterId];
  if (!character) return null;

  return (
    <div
      className={`relative aspect-[3/4] w-full overflow-hidden rounded-xl border-2 bg-void-800 ${className}`}
      style={{
        borderColor: accent,
        boxShadow: dragging ? `0 12px 30px ${accent}66` : `0 0 14px ${accent}33`,
      }}
    >
      <CharacterImage character={character} />
      {/* Dégradé + nom */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-void-900 via-void-900/70 to-transparent" />
      <p className="absolute inset-x-0 bottom-0 truncate p-2 text-center text-xs font-semibold text-white drop-shadow">
        {character.name}
      </p>
    </div>
  );
}
