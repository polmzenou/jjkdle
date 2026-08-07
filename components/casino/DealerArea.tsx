"use client";

import { AnimatePresence } from "framer-motion";
import { CardSlot, PlayingCard } from "./PlayingCard";
import type { DealerView } from "@/lib/casino/types";

/**
 * Le croupier : sa main et son total.
 *
 * Le total affiché est celui que le SERVEUR annonce (`visibleTotal`) — avant la
 * phase du croupier, il ne compte que l'upcard. On ne le recalcule pas ici : la
 * carte cachée n'est pas dans le payload, donc le client ne pourrait même pas
 * le faire.
 */
export function DealerArea({
  dealer,
  cardBack,
  dealing,
}: {
  dealer: DealerView;
  cardBack: string;
  /** Aucune main en cours : on affiche des emplacements vides. */
  dealing: boolean;
}) {
  const hasCards = dealer.cards.length > 0;
  const hidden = dealer.cards.some((card) => card === null);

  return (
    <section className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2.5">
        <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white/45">
          Croupier
        </span>
        {hasCards && (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-black tabular-nums ${
              dealer.bust
                ? "bg-cursed/20 text-cursed-light"
                : dealer.blackjack
                  ? "bg-cursed/20 text-cursed-light"
                  : "bg-white/10 text-white/80"
            }`}
          >
            {dealer.visibleTotal}
            {hidden && " +"}
            {dealer.bust && " · saute"}
            {dealer.blackjack && " · blackjack"}
          </span>
        )}
      </div>

      <div className="flex min-h-[6rem] items-center gap-2 sm:min-h-[7rem]">
        <AnimatePresence mode="popLayout">
          {hasCards ? (
            dealer.cards.map((card, i) => (
              <PlayingCard
                key={`${i}-${card ?? "back"}`}
                card={card}
                cardBack={cardBack}
                index={i}
              />
            ))
          ) : dealing ? (
            <>
              <CardSlot />
              <CardSlot />
            </>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}
