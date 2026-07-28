"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CardArt } from "@/components/cards/CardArt";
import {
  CARD_RARITIES,
  cardRarityStyle,
  type CardRarity,
} from "@/lib/cards/rarity";
import type { CollectionCard } from "@/lib/cards/types";

/**
 * Grille de cartes filtrable par rareté.
 *
 * Elle affiche TOUT le roster, les cartes non possédées grisées : elle sert
 * autant de collection que de checklist de complétion. Utilisée côté joueur
 * (onglet Deck) et côté admin (octroi ciblé).
 */

interface CardGridProps {
  cards: CollectionCard[];
  /**
   * Actions d'une carte (Équiper / Vendre). Rendues EN SURIMPRESSION dans le bas
   * de la carte, révélées au survol — la grille reste lisible, les commandes
   * n'apparaissent que sur la carte visée.
   */
  renderActions?: (card: CollectionCard) => ReactNode;
  /**
   * Pastille TOUJOURS visible, en haut à droite de la carte. Indispensable dès
   * qu'une action est cachée au survol : sans elle, plus rien ne signale d'un
   * coup d'œil quelles cartes sont équipées.
   */
  renderBadge?: (card: CollectionCard) => ReactNode;
  /** Clic sur la carte elle-même (mode admin : toggle direct). */
  onCardClick?: (card: CollectionCard) => void;
  /** Masquer les cartes non possédées (par défaut : grisées et visibles). */
  ownedOnly?: boolean;
  emptyLabel?: string;
}

const ALL = "__all__";

export function CardGrid({
  cards,
  renderActions,
  renderBadge,
  onCardClick,
  ownedOnly = false,
  emptyLabel = "Aucune carte pour l'instant.",
}: CardGridProps) {
  const [filter, setFilter] = useState<CardRarity | typeof ALL>(ALL);

  const base = useMemo(
    () => (ownedOnly ? cards.filter((c) => c.owned) : cards),
    [cards, ownedOnly],
  );

  // Comptes par rareté : possédées / total, affichés sur les puces de filtre.
  const counts = useMemo(() => {
    const out = new Map<CardRarity, { owned: number; total: number }>();
    for (const rarity of CARD_RARITIES) out.set(rarity, { owned: 0, total: 0 });
    for (const card of base) {
      const entry = out.get(card.rarity);
      if (!entry) continue;
      entry.total += 1;
      if (card.owned) entry.owned += 1;
    }
    return out;
  }, [base]);

  const visible = useMemo(
    () => (filter === ALL ? base : base.filter((c) => c.rarity === filter)),
    [base, filter],
  );

  const ownedTotal = base.filter((c) => c.owned).length;

  return (
    <div>
      {/* ── Filtres de rareté ── */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <FilterChip
          active={filter === ALL}
          onClick={() => setFilter(ALL)}
          label={`Toutes ${ownedTotal}/${base.length}`}
        />
        {CARD_RARITIES.map((rarity) => {
          const count = counts.get(rarity)!;
          if (count.total === 0) return null;
          const style = cardRarityStyle(rarity);
          return (
            <FilterChip
              key={rarity}
              active={filter === rarity}
              onClick={() => setFilter(rarity)}
              color={style.color}
              label={`${style.label} ${count.owned}/${count.total}`}
            />
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-void-800/60 px-6 py-12 text-center backdrop-blur">
          <p className="text-white/55">{emptyLabel}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {visible.map((card) => {
            const actions = renderActions?.(card);
            return (
              <div key={card.characterId} className="group relative">
                {onCardClick ? (
                  <button
                    type="button"
                    onClick={() => onCardClick(card)}
                    className="block w-full rounded-2xl transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-domain"
                    aria-label={`${card.owned ? "Retirer" : "Donner"} la carte ${card.name}`}
                  >
                    <CardArt card={card} owned={card.owned} />
                  </button>
                ) : (
                  <CardArt card={card} owned={card.owned} />
                )}

                {renderBadge && (
                  <div className="pointer-events-none absolute right-1.5 top-1.5 z-30">
                    {renderBadge(card)}
                  </div>
                )}

                {/* Actions au survol. Le dégradé est opaque en bas : il RECOUVRE
                    le nom et la rareté, les boutons prennent leur place au lieu
                    de s'empiler par-dessus. `pointer-events` suit l'opacité pour
                    qu'un bouton invisible reste incliquable. */}
                {actions && (
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] flex flex-col gap-1.5 rounded-b-2xl bg-gradient-to-t from-void-900 via-void-900/95 to-transparent p-2 pt-10 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100"
                  >
                    {actions}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
        active
          ? "border-domain/60 bg-domain/15 text-domain-light"
          : "border-white/10 bg-void-800/60 text-white/50 hover:border-white/25 hover:text-white/80"
      }`}
      style={active && color ? { borderColor: `${color}99`, color } : undefined}
    >
      {label}
    </button>
  );
}
