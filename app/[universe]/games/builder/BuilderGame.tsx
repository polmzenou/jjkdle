"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import type { CategoryConfig, CategoryId } from "@/data/roster/categories";
import type { Character } from "@/data/roster/characters";
import { computeBreakdown } from "@/lib/scoring/scoring";
import { getGrade } from "@/lib/scoring/grades";
import {
  startBuilderRun,
  lockBuilderCategory,
  cycleBuilderPool,
  type BuilderResult,
} from "./actions";
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

/**
 * Boucle de jeu en GRILLE (façon "tap game"), AUTORITATIVE côté serveur : chaque
 * tirage vient du serveur (`startBuilderRun` / `lockBuilderCategory` /
 * `cycleBuilderPool`) et le score final est recalculé serveur — impossible de
 * soumettre un score arbitraire. Voir app/games/builder/actions.ts.
 */
export function BuilderGame({
  categories,
  roster,
  initialBestScore,
  isAuthed,
}: BuilderGameProps) {
  const rosterById = useMemo(
    () => new Map(roster.map((c) => [c.id, c])),
    [roster],
  );

  // Tirage courant (ids) et sélection verrouillée (ids), pilotés par le serveur.
  const [drawIds, setDrawIds] = useState<Record<string, string | null>>({});
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
  const [drawKey, setDrawKey] = useState(0);
  const [finished, setFinished] = useState(false);
  const [finalSelection, setFinalSelection] = useState<Record<string, string>>({});
  const [finalScore, setFinalScore] = useState(0);
  const [bestScore, setBestScore] = useState(initialBestScore);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [gainedExp, setGainedExp] = useState<number | null>(null);
  const [expBadges, setExpBadges] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  // Résout un id de tirage en personnage (pour l'affichage des cartes).
  const draw = useMemo(() => {
    const out: Record<string, Character | null> = {};
    for (const [cat, id] of Object.entries(drawIds)) {
      out[cat] = id ? rosterById.get(id) ?? null : null;
    }
    return out;
  }, [drawIds, rosterById]);

  const applyResult = useCallback((res: BuilderResult) => {
    if (!res.ok) {
      if (res.needsRestart) {
        void startBuilderRun().then((r) => applyStep(r));
      } else {
        setError(res.error);
      }
      return;
    }
    if ("finished" in res) {
      setFinished(true);
      setFinalSelection(res.selection);
      setFinalScore(res.score);
      setBestScore(res.bestScore);
      setIsNewRecord(res.isNewRecord);
      setNeedsAuth(res.needsAuth);
      setGainedExp(res.gainedExp);
      setExpBadges(res.newBadges);
      return;
    }
    applyStep(res);
  }, []);

  // Applique une étape (tirage + verrouillages) et rejoue l'animation.
  function applyStep(res: {
    ok: true;
    draw: Record<string, string | null>;
    lockedIds: string[];
  }) {
    setDrawIds(res.draw);
    setLockedIds(new Set(res.lockedIds));
    setDrawKey((k) => k + 1);
    setLoading(false);
  }

  const startNewGame = useCallback(() => {
    setLoading(true);
    setFinished(false);
    setIsNewRecord(false);
    setNeedsAuth(false);
    setGainedExp(null);
    setExpBadges([]);
    setError(null);
    startTransition(async () => {
      applyStep(await startBuilderRun());
    });
  }, []);

  useEffect(() => {
    startNewGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = categories.length;
  const lockedCount = lockedIds.size;

  const handleTap = useCallback(
    (category: CategoryConfig) => {
      if (lockedIds.has(category.id) || finished) return;
      if (!drawIds[category.id]) return;
      startTransition(async () => {
        applyResult(await lockBuilderCategory(category.id));
      });
    },
    [lockedIds, finished, drawIds, applyResult],
  );

  const cyclePool = useCallback(() => {
    startTransition(async () => {
      applyResult(await cycleBuilderPool());
    });
  }, [applyResult]);

  // Récap de fin : reconstruit la sélection en personnages pour le breakdown.
  const finishedSelection = useMemo(() => {
    const out: Record<CategoryId, Character | null> = {} as Record<
      CategoryId,
      Character | null
    >;
    for (const [cat, id] of Object.entries(finalSelection)) {
      out[cat as CategoryId] = rosterById.get(id) ?? null;
    }
    return out;
  }, [finalSelection, rosterById]);

  const breakdown = useMemo(
    () => computeBreakdown(finishedSelection, categories),
    [finishedSelection, categories],
  );
  const grade = useMemo(() => getGrade(finalScore), [finalScore]);

  if (error) {
    return <p className="py-20 text-center text-white/40">{error}</p>;
  }

  return (
    <div>
      {/* Barre de tête unifiée : retour, logo, record */}
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
          score={finalScore}
          grade={grade}
          breakdown={breakdown}
          bestScore={bestScore}
          isNewRecord={isNewRecord}
          needsAuth={needsAuth}
          gainedExp={gainedExp}
          expBadges={expBadges}
          onRestart={startNewGame}
        />
      ) : (
        <>
          {/* Bandeau d'instruction + bouton recommencer */}
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
              animate={{ width: `${total ? (lockedCount / total) * 100 : 0}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>

          {loading && Object.keys(drawIds).length === 0 ? (
            <p className="py-20 text-center text-white/40">Tirage en cours…</p>
          ) : (
            <div className="flex flex-wrap justify-center gap-3">
              {categories.map((category) => (
                <div
                  key={category.id}
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
