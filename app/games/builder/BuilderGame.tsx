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
import { awardGameExpAction } from "@/lib/leaderboard/actions";
import { formatScore } from "@/lib/format";
import { CategoryTile } from "@/components/CategoryTile";
import { RankFooter } from "@/components/RankFooter";
import { Logo } from "@/components/Logo";
import { ScoreReveal } from "@/components/ScoreReveal";

interface BuilderGameProps {
  categories: CategoryConfig[];
  roster: Character[];
  initialBestScore: number;
  isAuthed: boolean;
}

/** Seuil de note pour le tirage resserré (cf. `minRating` dans `draw.ts`). */
const RATING_FLOOR = 90;

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
  isAuthed,
}: BuilderGameProps) {
  // Tirage initialisé côté client (post-montage) pour éviter un mismatch SSR.
  const [draw, setDraw] = useState<SingleDraw | null>(null);
  const [selection, setSelection] = useState<Selection>({});
  const [drawKey, setDrawKey] = useState(0);
  const [finished, setFinished] = useState(false);
  const [bestScore, setBestScore] = useState(initialBestScore);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [curated, setCurated] = useState(false);
  // XP empochée automatiquement en fin de partie (sans enregistrer au classement).
  const [gainedExp, setGainedExp] = useState<number | null>(null);
  const [expBadges, setExpBadges] = useState<string[]>([]);

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
    setCurated(false);
    setGainedExp(null);
    setExpBadges([]);
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
        // XP empochée automatiquement (connecté) — indépendant du classement.
        if (isAuthed) {
          void awardGameExpAction(score, "builder").then((res) => {
            if (res.ok) {
              setGainedExp(res.gainedExp ?? 0);
              setExpBadges(res.newBadges ?? []);
            }
          });
        }
        return;
      }

      setDraw(
        redrawUnlockedOne(
          draw,
          categories,
          nextLocked,
          roster,
          Math.random,
          curated ? RATING_FLOOR : undefined,
        ),
      );
      setDrawKey((k) => k + 1);
    },
    [draw, selection, lockedIds, total, categories, roster, curated, isAuthed],
  );

  // Re-tire aussitôt les cases encore libres avec le pool courant.
  const cyclePool = useCallback(() => {
    setCurated((on) => {
      const next = !on;
      setDraw((d) =>
        d
          ? redrawUnlockedOne(
              d,
              categories,
              lockedIds,
              roster,
              Math.random,
              next ? RATING_FLOOR : undefined,
            )
          : d,
      );
      setDrawKey((k) => k + 1);
      return next;
    });
  }, [categories, lockedIds, roster]);

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
      {/* Barre de tête unifiée : retour, logo, record (cf. JJK Pyramid) */}
      <header className="mb-4 flex items-center justify-between py-4">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-white/60 transition-colors hover:text-domain-light"
        >
          ← Back
        </Link>
        <Logo className="h-12 w-auto sm:h-14" />
        <span className="rounded-full bg-void-700/60 px-3 py-1 text-xs text-white/60">
          Record&nbsp;:{" "}
          <span className="font-bold text-domain-light">
            {formatScore(bestScore)}
          </span>
        </span>
      </header>

      {finished ? (
        <ScoreReveal
          score={score}
          grade={grade}
          breakdown={breakdown}
          bestScore={bestScore}
          isNewRecord={isNewRecord}
          isAuthed={isAuthed}
          gainedExp={gainedExp}
          expBadges={expBadges}
          onRestart={startNewGame}
        />
      ) : (
        <>
          {/* Bandeau d'instruction + bouton recommencer (déplacé hors du header) */}
          <div className="mb-5 flex items-center gap-2">
            <div
              onClick={cyclePool}
              className="flex-1 select-none rounded-xl border border-white/10 bg-void-800/60 px-4 py-3 text-center text-sm text-white/70 backdrop-blur"
            >
              👆 Tape une catégorie pour la <span className="font-semibold text-domain-light">verrouiller</span> ! ({lockedCount}/{total})
            </div>
            <button
              type="button"
              onClick={startNewGame}
              aria-label="Recommencer"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-domain text-white shadow-glow transition-transform hover:scale-110 active:scale-95"
            >
              ↻
            </button>
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
