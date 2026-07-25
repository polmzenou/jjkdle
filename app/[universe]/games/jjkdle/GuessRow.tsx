"use client";

import { motion } from "framer-motion";
import { CharacterImage } from "@/components/CharacterImage";
import type {
  AttributeColumn,
  AttributeHint,
  GuessRow as GuessRowData,
} from "@/lib/games/jjkdle/types";

/** Classes de couleur par statut d'indice. */
const STATUS_CLASS: Record<AttributeHint["status"], string> = {
  correct: "bg-emerald-600/80 border-emerald-400/60 text-white",
  close: "bg-amber-500/80 border-amber-300/60 text-void-900",
  wrong: "bg-cursed/25 border-cursed/40 text-white/80",
};

/**
 * Gabarit de grille : colonne avatar + une colonne par attribut. En style INLINE
 * et non en classe Tailwind, car le nombre de colonnes dépend de l'univers (donc
 * de la donnée) et ne peut pas être connu à la compilation.
 */
function gridStyle(columnCount: number) {
  return {
    gridTemplateColumns: `3rem repeat(${columnCount}, minmax(0, 1fr))`,
  };
}

interface GuessRowProps {
  row: GuessRowData;
  /** Colonnes de l'univers courant (ordre = ordre d'affichage). */
  columns: AttributeColumn[];
  /** Anime la révélation séquentielle (nouvelle ligne) ; sinon affichage direct. */
  animate?: boolean;
}

/**
 * Une proposition = avatar + une tuile par attribut. Les tuiles se révèlent en
 * cascade (stagger) pour une nouvelle ligne, dans l'esthétique violet/néon.
 */
export function GuessRow({ row, columns, animate = false }: GuessRowProps) {
  const labelByKey = new Map(columns.map((c) => [c.key, c.label]));

  return (
    <div className="grid gap-1.5 sm:gap-2" style={gridStyle(columns.length)}>
      {/* Avatar */}
      <div className="aspect-square overflow-hidden rounded-lg border border-white/10">
        <CharacterImage character={{ name: row.characterName, image: row.image }} />
      </div>

      {row.hints.map((hint, i) => (
        <motion.div
          key={hint.key}
          initial={animate ? { opacity: 0, rotateX: -90, scale: 0.9 } : false}
          animate={{ opacity: 1, rotateX: 0, scale: 1 }}
          transition={{ delay: animate ? i * 0.12 : 0, duration: 0.35, ease: "easeOut" }}
          className={`flex aspect-square flex-col items-center justify-center rounded-lg border p-1 text-center ${STATUS_CLASS[hint.status]}`}
          title={labelByKey.get(hint.key) ?? hint.key}
        >
          <span className="text-[10px] font-semibold leading-tight sm:text-xs">
            {hint.display}
          </span>
          {hint.direction && (
            <span className="mt-0.5 text-base font-black leading-none">
              {hint.direction === "up" ? "↑" : "↓"}
            </span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

/** En-tête de colonnes (avatar + libellés des attributs). */
export function GuessHeader({ columns }: { columns: AttributeColumn[] }) {
  return (
    <div className="grid gap-1.5 sm:gap-2" style={gridStyle(columns.length)}>
      <div />
      {columns.map((col) => (
        <div
          key={col.key}
          className="flex items-center justify-center px-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-white/40 sm:text-[10px]"
        >
          {col.label}
        </div>
      ))}
    </div>
  );
}
