"use client";

import { useDroppable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { DraggableCard } from "./DraggableCard";
import { RankingCard, LOCK_COLOR, WRONG_COLOR } from "./RankingCard";
import { CARD_ACCENT } from "@/components/CharacterImage";

interface RankingSlotProps {
  index: number; // 0-based
  characterId: string | null;
  locked: boolean;
  wrong: boolean; // flash rouge transitoire après un check raté
  onRemove: (index: number) => void;
}

/** Slot numéroté (1→8) : zone de dépôt + états vide / rempli / verrouillé / faux. */
export function RankingSlot({
  index,
  characterId,
  locked,
  wrong,
  onRemove,
}: RankingSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${index}`,
    data: { index },
    disabled: locked,
  });

  const accent = locked ? LOCK_COLOR : wrong ? WRONG_COLOR : CARD_ACCENT;

  return (
    <div className="relative">
      {/* Badge numéro de rang */}
      <span
        className="absolute -left-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-void-900 text-xs font-bold text-white"
        style={{ color: locked ? LOCK_COLOR : undefined }}
      >
        {index + 1}
      </span>

      {/* Badge état (cadenas vert / croix de retrait) */}
      {characterId &&
        (locked ? (
          <span
            className="absolute -right-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full text-sm"
            style={{ background: LOCK_COLOR }}
            aria-hidden
          >
            🔒
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="absolute -right-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-cursed text-xs font-bold text-white transition-transform hover:scale-110"
            aria-label={`Retirer du rang ${index + 1}`}
          >
            ✕
          </button>
        ))}

      <motion.div
        ref={setNodeRef}
        animate={
          wrong
            ? { x: [0, -5, 5, -3, 3, 0] }
            : { boxShadow: isOver ? `0 0 0 2px ${CARD_ACCENT}` : "0 0 0 0px transparent" }
        }
        transition={{ duration: wrong ? 0.4 : 0.15 }}
        className="aspect-[3/4] w-full rounded-xl"
      >
        {characterId ? (
          locked ? (
            <RankingCard characterId={characterId} accent={LOCK_COLOR} />
          ) : (
            <DraggableCard
              characterId={characterId}
              from={index}
              accent={wrong ? WRONG_COLOR : CARD_ACCENT}
              onTap={() => onRemove(index)}
            />
          )
        ) : (
          // Slot vide
          <div
            className="flex h-full w-full items-center justify-center rounded-xl border-2 border-dashed text-white/15"
            style={{
              borderColor: isOver ? CARD_ACCENT : "rgba(255,255,255,0.12)",
              background: isOver ? `${CARD_ACCENT}1a` : "rgba(255,255,255,0.02)",
            }}
          >
            <span className="font-display text-2xl">{index + 1}</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
