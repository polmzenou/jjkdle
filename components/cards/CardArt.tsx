"use client";

import { CharacterImage } from "@/components/CharacterImage";
import { cardRarityStyle } from "@/lib/cards/rarity";
import type { CardView } from "@/lib/cards/types";

/**
 * Une CARTE à collectionner : rectangle 3/4, image du personnage en plein
 * cadre, nom puis libellé de rareté dans le bas.
 *
 * Le contour et la couleur du libellé portent la rareté — `common` reste
 * volontairement neutre (« pas de couleur »), et `exotic` passe en dégradé
 * arc-en-ciel animé au lieu d'une teinte unie.
 */

/** Dégradé arc-en-ciel partagé par le contour et le texte des cartes EXOTIC. */
export const RAINBOW_GRADIENT =
  "linear-gradient(90deg, #f87171, #fbbf24, #4ade80, #38bdf8, #a78bfa, #f472b6, #f87171)";

interface CardArtProps {
  card: CardView;
  /** `false` → carte grisée (non possédée), comme les badges verrouillés. */
  owned?: boolean;
  /** Halo coloré autour de la carte (révélation d'un booster). */
  glow?: boolean;
  className?: string;
}

export function CardArt({
  card,
  owned = true,
  glow = false,
  className = "",
}: CardArtProps) {
  const style = cardRarityStyle(card.rarity);

  return (
    <div
      className={`relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-void-900 transition-opacity ${
        owned ? "" : "opacity-40 grayscale"
      } ${className}`}
      style={
        glow && owned
          ? { boxShadow: `0 0 28px -4px ${style.color}aa` }
          : undefined
      }
    >
      {/* Contour de rareté. En arc-en-ciel : un fond dégradé masqué au centre,
          seul l'anneau de 2px reste visible. */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-20 rounded-2xl ${
          style.rainbow ? "animate-rainbow" : ""
        }`}
        style={
          style.rainbow
            ? {
                padding: 2,
                background: RAINBOW_GRADIENT,
                WebkitMask:
                  "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                WebkitMaskComposite: "xor",
                maskComposite: "exclude",
              }
            : {
                boxShadow: `inset 0 0 0 2px ${
                  card.rarity === "common" ? "rgba(255,255,255,0.15)" : style.color
                }`,
              }
        }
      />

      <CharacterImage character={{ name: card.name, ...(card.image ? { image: card.image } : {}) }} />

      {/* Voile dégradé : garantit la lisibilité du nom quelle que soit l'image. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-2/5 bg-gradient-to-t from-void-900 via-void-900/85 to-transparent"
      />

      <div className="absolute inset-x-0 bottom-0 z-10 px-2.5 pb-2.5 text-center">
        <p className="truncate font-display text-sm font-black leading-tight text-white drop-shadow sm:text-base">
          {card.name}
        </p>
        <p
          className={`mt-0.5 truncate text-[10px] font-bold uppercase tracking-[0.18em] sm:text-[11px] ${
            style.rainbow ? "animate-rainbow-pan bg-clip-text text-transparent" : ""
          }`}
          style={
            style.rainbow
              ? { backgroundImage: RAINBOW_GRADIENT, backgroundSize: "200% 100%" }
              : { color: style.color }
          }
        >
          {style.label}
        </p>
      </div>
    </div>
  );
}
