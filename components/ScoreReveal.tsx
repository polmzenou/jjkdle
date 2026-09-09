"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GradeTier } from "@/lib/scoring/grades";
import type { CategoryBreakdown } from "@/lib/scoring/scoring";
import { MAX_SCORE } from "@/lib/scoring/scoring";
import { CategoryTile } from "./CategoryTile";
import { ExpReward } from "./progress/ExpReward";
import { BoosterDrop } from "./cards/BoosterDrop";
import type { DroppedBooster } from "@/lib/progress/recompute";

interface ScoreRevealProps {
  score: number;
  grade: GradeTier;
  breakdown: CategoryBreakdown[];
  bestScore: number;
  isNewRecord: boolean;
  /** true si le joueur n'est pas connecté (score NON enregistré au classement). */
  needsAuth: boolean;
  /** XP empochée automatiquement (null = non connecté). */
  gainedExp: number | null;
  /** Coins empochés en même temps (dérivés de l'XP ; null = non connecté). */
  gainedCoins: number | null;
  /** Badges débloqués par l'octroi d'XP. */
  expBadges: string[];
  /** Booster tombé en fin de partie (1 sur 2), à ouvrir sur place. */
  droppedBooster?: DroppedBooster | null;
  onRestart: () => void;
}

export function ScoreReveal({
  score,
  grade,
  breakdown,
  bestScore,
  isNewRecord,
  needsAuth,
  gainedExp,
  gainedCoins,
  expBadges,
  droppedBooster,
  onRestart,
}: ScoreRevealProps) {
  const animatedScore = useCountUp(score, 1100);
  const { boxRef, columns, tileWidth } = useFittedGrid(breakdown.length);
  useScrollLock();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-void-900/85 p-2 backdrop-blur-sm sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex h-full max-h-[880px] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-void-800/70 p-4 text-center backdrop-blur sm:p-6"
      >
        {/* ── Haut : hauteur naturelle, jamais comprimé ───────────────── */}
        <div className="shrink-0">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40 sm:text-sm">
            Build terminé
          </p>

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: 0.2,
              type: "spring",
              stiffness: 200,
              damping: 14,
            }}
            className="my-1 font-display text-4xl font-black sm:my-2 sm:text-5xl"
            style={{
              color: grade.color,
              textShadow: `0 0 28px ${grade.color}88`,
            }}
          >
            {grade.label}
          </motion.div>

          <div className="font-display text-3xl font-bold text-white sm:text-4xl">
            {animatedScore}
            <span className="text-xl text-white/40"> / {MAX_SCORE}</span>
          </div>

          {isNewRecord ? (
            <p className="mt-1 animate-glow-pulse text-sm font-semibold text-cursed-light">
              ⚡ Nouveau record&nbsp;!
            </p>
          ) : (
            <p className="mt-1 text-xs text-white/50 sm:text-sm">
              Meilleur score&nbsp;:{" "}
              <span className="font-semibold text-white">{bestScore}</span>
            </p>
          )}

          <ExpReward
            gainedExp={gainedExp}
            gainedCoins={gainedCoins}
            newBadges={expBadges}
          />

          <BoosterDrop booster={droppedBooster} />
        </div>

        {/* ── Milieu : SEULE zone élastique, elle absorbe ce qui reste ──
            Récap des choix, mêmes cartes que le jeu et sans les points. La
            grille est dimensionnée par `useFittedGrid` sur la place réellement
            disponible : c'est ce qui garantit qu'un build de onze catégories
            tient à l'écran sans scroll, aussi bien sur un portable 720p que sur
            un 27 pouces. */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 py-2">
          <p className="shrink-0 text-xs uppercase tracking-[0.2em] text-white/40">
            Ton build
          </p>
          <div ref={boxRef} className="min-h-0 w-full flex-1">
            <div
              className="grid h-full place-content-center gap-2"
              style={{
                gridTemplateColumns: `repeat(${columns}, ${tileWidth}px)`,
              }}
            >
              {breakdown.map(({ category, character }) => (
                <CategoryTile
                  key={category.id}
                  category={category}
                  character={character}
                  locked
                  onTap={() => {}}
                  drawKey={0}
                  // Sous ~120 px de large, le libellé de catégorie et le nom du
                  // personnage ne tiennent plus à la taille normale.
                  compact={tileWidth < 120}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Bas : hauteur naturelle, jamais comprimé ────────────────── */}
        <div className="shrink-0">
          <div className="mx-auto max-w-sm">
            {needsAuth ? (
              <div className="rounded-xl border border-amber-300/30 bg-amber-300/5 px-4 py-2 text-sm">
                <p className="text-white/70">
                  🔒 Connecte-toi pour gagner de l&apos;XP, enregistrer ton score
                  et apparaître au classement.
                </p>
                <Link
                  href="/login"
                  className="mt-1 inline-block font-display text-xs font-bold uppercase tracking-wide text-amber-200 underline-offset-4 hover:underline"
                >
                  Se connecter / créer un compte →
                </Link>
              </div>
            ) : (
              <p className="rounded-xl border border-amber-300/30 bg-amber-300/5 px-4 py-2 text-sm font-semibold text-amber-200">
                ✓ Score enregistré au classement&nbsp;!
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onRestart}
            className="mt-3 rounded-xl bg-domain px-6 py-2.5 font-display font-bold uppercase tracking-wide text-white shadow-glow transition-transform hover:scale-105 active:scale-95"
          >
            Rejouer
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Fige le scroll de la page derrière l'écran de fin.
 *
 * Le verrou est posé sur `<html>` et non sur `<body>` : `BoosterOpening`, qui
 * peut s'ouvrir PAR-DESSUS cet écran, pose le sien sur `<body>` et le relâche
 * en se fermant. Deux verrous sur la même propriété et le booster rendrait la
 * page scrollable en se refermant, alors que l'écran de fin est toujours là.
 */
function useScrollLock() {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, []);
}

/** Espace entre deux tuiles du récap, en pixels (doit suivre le `gap-2`). */
const TILE_GAP = 8;
/** Ratio d'une CategoryTile (`aspect-[3/4]`). */
const TILE_RATIO = 3 / 4;

/**
 * Choisit le découpage en colonnes ET la taille de tuile qui remplissent au
 * mieux la place disponible, sans jamais la dépasser.
 *
 * Pourquoi en JS plutôt qu'en CSS : les tuiles ont un ratio fixe, donc leur
 * hauteur dépend de leur largeur. Un `flex-wrap` ne sait pas arbitrer entre
 * « moins de colonnes, tuiles plus larges » et « plus de colonnes, tuiles plus
 * courtes » — il rend simplement autant de lignes qu'il en faut, et la carte
 * finissait par déborder de l'écran. Ici on essaie chaque nombre de lignes,
 * on calcule la taille de tuile que la largeur ET la hauteur autorisent, et on
 * garde la plus grande.
 */
function useFittedGrid(count: number) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return useMemo(() => {
    let best = { columns: count || 1, tileWidth: 0 };
    if (count > 0 && box.width > 0 && box.height > 0) {
      for (let rows = 1; rows <= count; rows++) {
        const columns = Math.ceil(count / rows);
        const byWidth = (box.width - TILE_GAP * (columns - 1)) / columns;
        // Largeur qu'autorise la hauteur d'une ligne, via le ratio de la tuile.
        const byHeight =
          ((box.height - TILE_GAP * (rows - 1)) / rows) * TILE_RATIO;
        const tileWidth = Math.floor(Math.min(byWidth, byHeight));
        if (tileWidth > best.tileWidth) best = { columns, tileWidth };
      }
    }
    return { boxRef, ...best };
  }, [box.width, box.height, count]);
}

/** Compteur animé de 0 → `target` sur `durationMs`. */
function useCountUp(target: number, durationMs: number): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}
