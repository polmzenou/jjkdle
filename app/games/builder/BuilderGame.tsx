"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import type { CategoryConfig, CategoryId } from "@/data/roster/categories";
import type { Character } from "@/data/roster/characters";
import {
  drawAllOne,
  redrawUnlockedOne,
  type SingleDraw,
} from "@/lib/draw/draw";
import {
  computeBreakdown,
  evaluateBuild,
  type Selection,
} from "@/lib/scoring/scoring";
import { saveBestScore } from "@/lib/bestScore";
import { CategoryTile } from "@/components/CategoryTile";
import { RankFooter } from "@/components/RankFooter";
import { ScoreReveal } from "@/components/ScoreReveal";

interface BuilderGameProps {
  categories: CategoryConfig[];
  roster: Character[];
  initialBestScore: number;
}

/**
 * Boucle de jeu en GRILLE (façon "tap game") :
 *  - chaque catégorie affiche UN personnage tiré aléatoirement parmi les éligibles ;
 *  - taper une carte verrouille ce personnage et re-mélange les catégories restantes ;
 *  - quand toutes les catégories sont verrouillées → reveal du score.
 */
export function BuilderGame({
  categories,
  roster,
  initialBestScore,
}: BuilderGameProps) {
  // Tirage initialisé côté client (post-montage) pour éviter un mismatch SSR.
  const [draw, setDraw] = useState<SingleDraw | null>(null);
  const [selection, setSelection] = useState<Selection>({});
  const [drawKey, setDrawKey] = useState(0);
  const [finished, setFinished] = useState(false);
  const [bestScore, setBestScore] = useState(initialBestScore);
  const [isNewRecord, setIsNewRecord] = useState(false);

  const lockedIds = useMemo(
    () =>
      new Set<CategoryId>(
        Object.entries(selection)
          .filter(([, c]) => c)
          .map(([id]) => id as CategoryId),
      ),
    [selection],
  );

  const startNewGame = useCallback(() => {
    setSelection({});
    setFinished(false);
    setIsNewRecord(false);
    setDraw(drawAllOne(categories, roster));
    setDrawKey((k) => k + 1);
  }, [categories, roster]);

  useEffect(() => {
    setDraw(drawAllOne(categories, roster));
  }, [categories, roster]);

  const lockedCount = lockedIds.size;
  const total = categories.length;

  const handleTap = useCallback(
    (category: CategoryConfig) => {
      if (!draw) return;
      const character = draw[category.id];
      if (!character) return; // catégorie sans éligible : non verrouillable

      const nextSelection: Selection = { ...selection, [category.id]: character };
      setSelection(nextSelection);

      const nextLocked = new Set(lockedIds);
      nextLocked.add(category.id);

      if (nextLocked.size === total) {
        setFinished(true);
        const { score } = evaluateBuild(nextSelection, categories);
        void saveBestScore("builder", score).then(({ best, isNewRecord }) => {
          setBestScore(best);
          setIsNewRecord(isNewRecord);
        });
        return;
      }

      setDraw(redrawUnlockedOne(draw, categories, nextLocked, roster));
      setDrawKey((k) => k + 1);
    },
    [draw, selection, lockedIds, total, categories, roster],
  );

  const { score, grade } = useMemo(
    () => evaluateBuild(selection, categories),
    [selection, categories],
  );
  const breakdown = useMemo(
    () => computeBreakdown(selection, categories),
    [selection, categories],
  );

  return (
    <div>
      {/* Barre de tête : retour, titre, compteur de taps */}
      <header className="sticky top-0 z-20 -mx-4 mb-6 flex items-center justify-between border-b border-white/10 bg-void-900/80 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-white/60 transition-colors hover:text-domain-light"
        >
          ← Home
        </Link>
        <h1 className="glitch-hover font-display text-lg font-black uppercase tracking-wider text-white">
          🩸 <span className="text-glow text-domain-light">Build the Sorcerer</span>
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-white/70">
            Tap! ({lockedCount}/{total})
          </span>
          <button
            type="button"
            onClick={startNewGame}
            aria-label="Recommencer"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-domain text-white shadow-glow transition-transform hover:scale-110 active:scale-95"
          >
            ↻
          </button>
        </div>
      </header>

      {finished ? (
        <ScoreReveal
          score={score}
          grade={grade}
          breakdown={breakdown}
          bestScore={bestScore}
          isNewRecord={isNewRecord}
          onRestart={startNewGame}
        />
      ) : (
        <>
          {/* Bandeau d'instruction */}
          <div className="mb-5 rounded-xl border border-white/10 bg-void-800/60 px-4 py-3 text-center text-sm text-white/70 backdrop-blur">
            👆 Tape une catégorie pour la <span className="font-semibold text-domain-light">verrouiller</span> ! ({lockedCount}/{total})
          </div>

          {/* Barre de progression */}
          <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-void-700">
            <motion.div
              className="h-full bg-gradient-to-r from-domain to-cursed"
              animate={{ width: `${(lockedCount / total) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>

          {!draw ? (
            <p className="py-20 text-center text-white/40">Tirage en cours…</p>
          ) : (
            <div className="flex flex-wrap justify-center gap-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  // Largeurs calées pour 2/3/4/5 colonnes ; le justify-center
                  // centre la dernière ligne incomplète tout en gardant l'alignement.
                  className="w-[calc(50%-12px)] sm:w-[calc(33.333%-12px)] md:w-[calc(25%-12px)] lg:w-[calc(20%-12px)]"
                >
                  <CategoryTile
                    category={category}
                    character={draw[category.id] ?? null}
                    locked={lockedIds.has(category.id)}
                    onTap={handleTap}
                    drawKey={drawKey}
                  />
                </div>
              ))}
            </div>
          )}

          <RankFooter bestScore={bestScore} />
        </>
      )}
    </div>
  );
}
