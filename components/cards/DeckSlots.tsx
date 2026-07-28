"use client";

import { CardArt } from "@/components/cards/CardArt";
import { DECK_SIZE, deckMultipliers } from "@/lib/cards/deck";
import type { CardView } from "@/lib/cards/types";

/**
 * Les 3 slots du deck équipé, avec le bonus cumulé qu'ils rapportent.
 * Présentationnel : l'équipement se fait depuis la collection (bouton sous
 * chaque carte), ce composant ne gère que le retrait.
 */

interface DeckSlotsProps {
  cards: CardView[];
  onRemove?: (characterId: string) => void;
  pending?: boolean;
}

export function DeckSlots({ cards, onRemove, pending = false }: DeckSlotsProps) {
  const bonus = deckMultipliers(cards.map((c) => c.rarity));
  const slots = Array.from({ length: DECK_SIZE }, (_, i) => cards[i] ?? null);

  return (
    <div className="rounded-2xl border border-white/10 bg-void-800/60 p-5 backdrop-blur">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-white/45">
          {cards.length} / {DECK_SIZE} cartes équipées
        </p>
        <p className="text-xs font-bold uppercase tracking-wider">
          <span className="text-domain-light">+{bonus.xpPct} % XP</span>
          <span className="text-white/25"> · </span>
          <span className="text-amber-300">+{bonus.coinPct} % coins</span>
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:max-w-md">
        {slots.map((card, i) =>
          card ? (
            <div key={card.characterId} className="flex flex-col gap-2">
              <CardArt card={card} />
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(card.characterId)}
                  disabled={pending}
                  className="rounded-full border border-white/10 bg-void-800/80 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/60 transition-colors hover:border-cursed/50 hover:text-cursed-light disabled:opacity-50"
                >
                  Retirer
                </button>
              )}
            </div>
          ) : (
            <div
              key={`empty-${i}`}
              className="flex aspect-[3/4] w-full items-center justify-center rounded-2xl border-2 border-dashed border-white/10 text-center"
            >
              <span className="px-2 text-[11px] font-medium uppercase tracking-wider text-white/25">
                Slot libre
              </span>
            </div>
          ),
        )}
      </div>

      {cards.length === 0 && (
        <p className="mt-4 text-xs text-white/40">
          Équipe jusqu&apos;à {DECK_SIZE} cartes depuis ta collection pour gagner
          plus d&apos;XP et de coins à chaque partie.
        </p>
      )}
    </div>
  );
}
