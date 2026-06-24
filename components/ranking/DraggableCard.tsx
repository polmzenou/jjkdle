"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { RankingCard } from "./RankingCard";

interface DraggableCardProps {
  characterId: string;
  /** Identifie la source : "pool" ou index de slot (pour la logique de drop). */
  from: "pool" | number;
  accent?: string;
  /** Tap-to-place : clic simple (sans drag) sur la carte. */
  onTap?: () => void;
}

/** Carte déplaçable (drag) ET cliquable (tap-to-place via la contrainte d'activation). */
export function DraggableCard({
  characterId,
  from,
  accent,
  onTap,
}: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: characterId,
      data: { from },
    });

  return (
    <button
      type="button"
      ref={setNodeRef}
      onClick={onTap}
      {...listeners}
      {...attributes}
      style={{
        transform: CSS.Translate.toString(transform),
        // La carte d'origine devient fantôme pendant qu'on traîne le DragOverlay.
        opacity: isDragging ? 0.35 : 1,
        touchAction: "none",
      }}
      className="w-full cursor-grab touch-none active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-domain-light rounded-xl"
      aria-label={`Déplacer ${characterId}`}
    >
      <RankingCard characterId={characterId} accent={accent} />
    </button>
  );
}
