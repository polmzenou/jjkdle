"use client";

import { useState } from "react";
import type { Character } from "@/data/roster/characters";

/** Accent violet uniforme des cartes (couleur "domain"). */
export const CARD_ACCENT = "#7c3aed";

interface CharacterImageProps {
  character: Character;
  className?: string;
}

/**
 * Affiche l'image du personnage si `character.image` est défini et chargeable,
 * sinon retombe sur un placeholder (initiales sur fond violet uniforme).
 */
export function CharacterImage({ character, className = "" }: CharacterImageProps) {
  const [failed, setFailed] = useState(false);
  const showImage = character.image && !failed;

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      {showImage ? (
        // <img> volontaire (et non next/image) pour gérer le fallback onError.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={character.image}
          alt={character.name}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center font-display text-4xl font-bold text-white/85"
          style={{
            background: `radial-gradient(circle at 50% 30%, ${CARD_ACCENT}55, ${CARD_ACCENT}22 75%)`,
          }}
        >
          {initials(character.name)}
        </div>
      )}
    </div>
  );
}

/** Initiales utilisées comme placeholder visuel. */
function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
