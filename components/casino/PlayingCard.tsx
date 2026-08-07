"use client";

import { motion } from "framer-motion";
import { isRedSuit, parseCard, SUIT_SYMBOL, type Suit } from "@/lib/casino/cards";
import { resolveCardBack } from "@/lib/casino/skins";

/**
 * Une carte à jouer. Rendu 100 % CSS — aucune image à charger, donc aucune
 * carte qui apparaît en retard au milieu d'une distribution.
 *
 * Le DOS passe par `resolveCardBack` : c'est la seule couture d'abstraction du
 * visuel, celle qui permettra de rendre les dos personnalisables en admin sans
 * toucher un seul composant.
 */

/** Rangs affichés : "T" se lit "10" à l'écran mais reste "T" en base. */
function displayRank(rank: string): string {
  return rank === "T" ? "10" : rank;
}

export function PlayingCard({
  card,
  cardBack,
  index = 0,
  small = false,
}: {
  /** `null` = carte face cachée (carte du croupier avant sa phase). */
  card: string | null;
  cardBack: string;
  /** Rang dans la main : décale l'animation d'entrée. */
  index?: number;
  small?: boolean;
}) {
  const size = small ? "h-16 w-11 text-[11px]" : "h-24 w-16 text-sm sm:h-28 sm:w-20";

  return (
    <motion.div
      initial={{ opacity: 0, y: -18, rotateZ: -8 }}
      animate={{ opacity: 1, y: 0, rotateZ: 0 }}
      transition={{ duration: 0.28, delay: index * 0.07, ease: "easeOut" }}
      className={`relative shrink-0 rounded-lg ${size}`}
    >
      {card === null ? (
        <CardBack cardBack={cardBack} />
      ) : (
        <CardFace card={card} small={small} />
      )}
    </motion.div>
  );
}

/** Face visible : rang + symbole, en haut à gauche et retourné en bas à droite. */
function CardFace({ card, small }: { card: string; small: boolean }) {
  const { rank, suit } = parseCard(card);
  const red = isRedSuit(suit);
  const symbol = SUIT_SYMBOL[suit as Suit] ?? "?";
  const color = red ? "text-red-600" : "text-neutral-900";

  return (
    <div
      className={`flex h-full w-full flex-col justify-between rounded-lg bg-neutral-50 p-1.5 shadow-[0_4px_14px_rgb(0_0_0_/_0.45)] ring-1 ring-inset ring-black/10 ${color}`}
    >
      <span className="font-display font-black leading-none">
        {displayRank(rank)}
        <span className="block leading-none">{symbol}</span>
      </span>
      <span
        aria-hidden
        className={`self-center leading-none ${small ? "text-lg" : "text-2xl sm:text-3xl"}`}
      >
        {symbol}
      </span>
      <span
        aria-hidden
        className="self-end rotate-180 font-display font-black leading-none"
      >
        {displayRank(rank)}
        <span className="block leading-none">{symbol}</span>
      </span>
    </div>
  );
}

/** Dos de carte, piloté par le skin configuré en admin. */
export function CardBack({ cardBack }: { cardBack: string }) {
  const back = resolveCardBack(cardBack);
  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-lg shadow-[0_4px_14px_rgb(0_0_0_/_0.45)] ${back.backClass}`}
    >
      {back.pattern && (
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage: back.pattern.backgroundImage,
            backgroundSize: back.pattern.backgroundSize,
          }}
        />
      )}
      <span className="absolute inset-1.5 rounded-[5px] border border-white/25" />
    </div>
  );
}

/** Emplacement vide (siège sans carte). */
export function CardSlot({ small = false }: { small?: boolean }) {
  const size = small ? "h-16 w-11" : "h-24 w-16 sm:h-28 sm:w-20";
  return (
    <div
      aria-hidden
      className={`shrink-0 rounded-lg border border-dashed border-white/10 ${size}`}
    />
  );
}
