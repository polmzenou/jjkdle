"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { CategoryConfig } from "@/data/roster/categories";
import type { Character } from "@/data/roster/characters";
import { CharacterImage, CARD_ACCENT } from "./CharacterImage";

interface CategoryTileProps {
  category: CategoryConfig;
  /** Personnage actuellement tiré pour cette catégorie (null si aucun éligible). */
  character: Character | null;
  locked: boolean;
  onTap: (category: CategoryConfig) => void;
  /** Change à chaque re-tirage → rejoue l'animation shuffle. */
  drawKey: number;
}

export function CategoryTile({
  category,
  character,
  locked,
  onTap,
  drawKey,
}: CategoryTileProps) {
  // Accent violet uniforme (plus de couleur selon le personnage).
  const accent = CARD_ACCENT;
  const empty = character === null;

  return (
    <motion.button
      type="button"
      layout
      disabled={empty || locked}
      onClick={() => onTap(category)}
      whileHover={empty || locked ? undefined : { scale: 1.03, y: -3 }}
      whileTap={empty || locked ? undefined : { scale: 0.97 }}
      className="group relative aspect-[3/4] w-full overflow-hidden rounded-2xl border-2 bg-void-800 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-domain-light disabled:cursor-default"
      style={{
        borderColor: locked ? accent : "rgba(255,255,255,0.10)",
        boxShadow: locked ? `0 0 26px ${accent}66` : undefined,
      }}
      aria-pressed={locked}
      aria-label={
        empty
          ? `${category.label} : aucun personnage`
          : `${category.label} : ${character?.name}. ${locked ? "Verrouillé" : "Taper pour verrouiller"}`
      }
    >
      {/* Image / placeholder du personnage (animée au re-tirage) */}
      <div className="absolute inset-0">
        <AnimatePresence mode="popLayout">
          {character ? (
            <motion.div
              key={`${character.id}-${drawKey}`}
              initial={{ opacity: 0, scale: 1.08 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <CharacterImage character={character} />
            </motion.div>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/30">
              —
            </div>
          )}
        </AnimatePresence>
        {/* Dégradé pour lisibilité du label */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-void-900 via-void-900/70 to-transparent" />
      </div>

      {/* Badge "verrouillé" */}
      {locked && (
        <span
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ background: accent }}
        >
          ✓
        </span>
      )}

      {/* Halo au survol */}
      {!locked && !empty && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ boxShadow: `inset 0 0 40px ${accent}40` }}
        />
      )}

      {/* Pied de carte : catégorie + nom + note */}
      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="font-display text-sm font-bold uppercase leading-tight tracking-wide text-white drop-shadow">
          {category.label}
        </p>
        {character && (
          // Le nom seul : on n'affiche PAS la note pour ne pas donner d'indice.
          <p className="mt-0.5 truncate text-xs text-white/70">{character.name}</p>
        )}
      </div>
    </motion.button>
  );
}
