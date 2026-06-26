"use client";

import { motion } from "framer-motion";
import { CharacterImage, CARD_ACCENT } from "@/components/CharacterImage";
import type { DraftCharacter, DraftTier } from "@/lib/games/draft/types";

const SELECTED_COLOR = "#22c55e"; // vert "draftÉ"

/** Couleur de pastille par tier (échelle de grade du thème). */
const TIER_COLOR: Record<DraftTier, string> = {
  S: "#f43f5e",
  A: "#f59e0b",
  B: "#a78bfa",
  C: "#6b7280",
};

interface DraftCardProps {
  character: DraftCharacter;
  /** Sélectionné dans sa catégorie ? */
  selected: boolean;
  /** Inabordable (budget) et non sélectionné → désactivé. */
  disabled: boolean;
  onSelect: () => void;
}

/** Carte perso sélectionnable du draft (même DA que les cartes du Pyramid). */
export function DraftCard({
  character,
  selected,
  disabled,
  onSelect,
}: DraftCardProps) {
  const accent = selected ? SELECTED_COLOR : CARD_ACCENT;
  const blocked = disabled && !selected;

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      disabled={blocked}
      whileHover={blocked ? undefined : { scale: 1.04, y: -3 }}
      whileTap={blocked ? undefined : { scale: 0.96 }}
      className="group relative aspect-[3/4] w-full overflow-hidden rounded-xl border-2 bg-void-800 disabled:cursor-not-allowed disabled:opacity-35"
      style={{
        borderColor: selected ? accent : "rgba(255,255,255,0.10)",
        boxShadow: selected ? `0 0 22px ${accent}77` : `0 0 10px ${accent}22`,
      }}
    >
      <CharacterImage character={character} />

      {/* Pastille tier (haut-gauche) */}
      <span
        className="absolute left-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-md font-display text-[10px] font-black text-void-900"
        style={{ background: TIER_COLOR[character.tier] }}
      >
        {character.tier}
      </span>

      {/* Coût (haut-droite) */}
      <span className="absolute right-1 top-1 z-10 rounded-md bg-void-900/80 px-1.5 py-0.5 font-display text-[10px] font-bold text-amber-200">
        {character.cost}
      </span>

      {/* Badge sélectionné */}
      {selected && (
        <span
          className="absolute right-1 bottom-7 z-10 flex h-5 w-5 items-center justify-center rounded-full text-xs font-black text-void-900"
          style={{ background: SELECTED_COLOR }}
        >
          ✓
        </span>
      )}

      {/* Dégradé + nom */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-void-900 via-void-900/70 to-transparent" />
      <p className="absolute inset-x-0 bottom-0 truncate p-1.5 text-center text-[11px] font-semibold text-white drop-shadow">
        {character.name}
      </p>
    </motion.button>
  );
}
