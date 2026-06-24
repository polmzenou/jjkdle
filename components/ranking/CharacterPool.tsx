"use client";

import { useDroppable } from "@dnd-kit/core";
import { AnimatePresence, motion } from "framer-motion";
import { DraggableCard } from "./DraggableCard";

interface CharacterPoolProps {
  /** IDs encore à placer (déjà dans l'ordre d'affichage mélangé). */
  ids: string[];
  /** Tap-to-place : place le perso dans le 1er slot libre. */
  onTapPlace: (characterId: string) => void;
}

/** Zone "AVAILABLE" : les personnages restant à classer (drop pour renvoyer ici). */
export function CharacterPool({ ids, onTapPlace }: CharacterPoolProps) {
  const { setNodeRef, isOver } = useDroppable({ id: "pool" });

  return (
    <div
      ref={setNodeRef}
      className="min-h-[8rem] rounded-2xl border p-3 transition-colors"
      style={{
        borderColor: isOver ? "#7c3aed" : "rgba(255,255,255,0.08)",
        background: isOver ? "rgba(124,58,237,0.08)" : "transparent",
      }}
    >
      {ids.length === 0 ? (
        <p className="py-10 text-center text-sm text-white/30">
          Tous les personnages sont placés.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {ids.map((id) => (
              <motion.div
                key={id}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.2 }}
              >
                <DraggableCard
                  characterId={id}
                  from="pool"
                  onTap={() => onTapPlace(id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
