import { CardArt } from "@/components/cards/CardArt";
import { DECK_SIZE, deckMultipliers } from "@/lib/cards/deck";
import type { CardView } from "@/lib/cards/types";

/**
 * Rendu LECTURE SEULE du deck équipé, pour le profil public (`/u/[username]`).
 * Pendant de `components/badges/BadgeShelf.tsx` : mêmes conventions de grille
 * et d'état vide, aucune action.
 */

interface CardShelfProps {
  cards: CardView[];
  /** Afficher le bonus cumulé sous les cartes. */
  showBonus?: boolean;
}

export function CardShelf({ cards, showBonus = true }: CardShelfProps) {
  if (cards.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-void-800/60 px-6 py-10 text-center backdrop-blur">
        <p className="text-white/50">Aucune carte équipée.</p>
      </div>
    );
  }

  const bonus = deckMultipliers(cards.map((c) => c.rarity));

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:max-w-md">
        {cards.slice(0, DECK_SIZE).map((card) => (
          <CardArt key={card.characterId} card={card} />
        ))}
      </div>
      {showBonus && (bonus.xpPct > 0 || bonus.coinPct > 0) && (
        <p className="mt-3 text-xs font-bold uppercase tracking-wider text-white/45">
          Bonus : <span className="text-domain-light">+{bonus.xpPct} % XP</span>
          {bonus.coinPct > 0 && (
            <>
              {" · "}
              <span className="text-amber-300">+{bonus.coinPct} % coins</span>
            </>
          )}
        </p>
      )}
    </div>
  );
}
