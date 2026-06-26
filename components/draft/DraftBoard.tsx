"use client";

import type { ReactNode } from "react";
import { DraftCard } from "./DraftCard";
import { DRAFT_CATEGORIES } from "@/lib/games/draft/categories";
import { BUDGET } from "@/lib/games/draft/scoring";
import { canSelect } from "@/lib/games/draft/budget";
import type {
  DraftCategoryId,
  DraftCharacter,
  DraftPick,
  DraftSelection,
  DraftTier,
} from "@/lib/games/draft/types";

interface DraftBoardProps {
  draw: DraftPick;
  selection: DraftSelection;
  rosterById: Record<string, DraftCharacter>;
  onSelect: (categoryId: DraftCategoryId, character: DraftCharacter) => void;
  onLaunch: () => void;
}

/** Ordre d'affichage des cartes : du rang le plus haut au plus bas. */
const TIER_RANK: Record<DraftTier, number> = { S: 0, A: 1, B: 2, C: 3 };

function byRankDesc(cards: DraftCharacter[]): DraftCharacter[] {
  return [...cards].sort(
    (a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier] || b.statValue - a.statValue,
  );
}

/** Étiquette verticale « Rang le plus haut / bas » bordant la ligne de choix. */
function RankTag({ children }: { children: ReactNode }) {
  return (
    <span className="flex w-10 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-void-900/40 px-1 text-center text-[9px] font-semibold uppercase leading-tight tracking-wide text-white/40 sm:w-12">
      {children}
    </span>
  );
}

/**
 * Plateau de draft : budget en évidence, 8 catégories de 5 cartes, bouton
 * « Lancer le combat » actif seulement quand les 8 slots sont remplis. Les
 * scores cachés ne sont jamais affichés.
 */
export function DraftBoard({
  draw,
  selection,
  rosterById,
  onSelect,
  onLaunch,
}: DraftBoardProps) {
  const spent = Object.values(selection).reduce(
    (sum, id) => sum + (id ? rosterById[id]?.cost ?? 0 : 0),
    0,
  );
  const left = BUDGET - spent;
  const filled = DRAFT_CATEGORIES.filter((c) => selection[c.id]).length;
  const allFilled = filled === DRAFT_CATEGORIES.length;
  const pct = Math.max(0, Math.min(100, (left / BUDGET) * 100));

  return (
    <div>
      {/* Bandeau budget (sticky) */}
      <div className="sticky top-0 z-20 -mx-4 mb-5 border-b border-white/10 bg-void-900/80 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.25em] text-domain-light">
              Budget restant
            </p>
            <p className="font-display text-2xl font-black text-white">
              {left}
              <span className="text-base font-bold text-white/35"> / {BUDGET}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-white/45">
              Sorciers draftÉs
            </p>
            <p className="font-display text-lg font-bold text-white">
              {filled}
              <span className="text-white/35"> / {DRAFT_CATEGORIES.length}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onLaunch}
            disabled={!allFilled}
            className="shrink-0 rounded-xl bg-cursed px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-white shadow-glow-cursed transition-transform enabled:hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ⚔️ Lancer le combat
          </button>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-domain transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Catégories — disposition en lignes (cf. maquette) */}
      <div className="space-y-3">
        {DRAFT_CATEGORIES.map((category) => {
          const picks = byRankDesc(draw[category.id]);
          const pickedId = selection[category.id];

          return (
            <section
              key={category.id}
              className="flex flex-col gap-3 rounded-2xl border border-white/15 bg-void-800/40 p-3 sm:flex-row sm:items-center sm:gap-4"
            >
              {/* Nom de la catégorie */}
              <div className="sm:w-44 sm:shrink-0">
                <h3 className="font-display text-sm font-bold uppercase tracking-[0.12em] text-domain-light">
                  {category.label}
                </h3>
                <p className="mt-0.5 text-[11px] leading-tight text-white/35">
                  {category.description}
                </p>
              </div>

              {/* Ligne de choix : rang le plus haut → le plus bas */}
              <div className="flex flex-1 items-stretch gap-2">
                <RankTag>Rang le plus haut</RankTag>
                <div className="grid flex-1 grid-cols-5 gap-2">
                  {picks.map((character) => {
                    const selected = pickedId === character.id;
                    const affordable = canSelect(
                      selection,
                      draw,
                      category.id,
                      character,
                      rosterById,
                    );
                    return (
                      <DraftCard
                        key={character.id}
                        character={character}
                        selected={selected}
                        disabled={!affordable}
                        onSelect={() => onSelect(category.id, character)}
                      />
                    );
                  })}
                </div>
                <RankTag>Rang le plus bas</RankTag>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
