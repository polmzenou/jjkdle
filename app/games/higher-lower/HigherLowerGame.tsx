"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { CharacterImage } from "@/components/CharacterImage";
import { ExpReward } from "@/components/progress/ExpReward";
import type { HLChoice, HLTurnView } from "@/lib/games/higher-lower/types";

type Phase = "idle" | "playing" | "gameover";

interface RevealState {
  value: number;
  correct: boolean;
}

interface GameOverState {
  score: number;
  xpEarned: number;
  needsAuth?: boolean;
  newBadges: string[];
}

interface HigherLowerGameProps {
  isAuthed: boolean;
  hasEnoughRoster: boolean;
}

type CardData = { id: string; name: string; image?: string; cursedEnergy?: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Petit compteur animé (ease-out cubic) pour le score / l'XP de fin de partie. */
function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

export function HigherLowerGame({ isAuthed, hasEnoughRoster }: HigherLowerGameProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [view, setView] = useState<HLTurnView | null>(null);
  const [score, setScore] = useState(0);
  const [reveal, setReveal] = useState<RevealState | null>(null);
  const [busy, setBusy] = useState(false);
  const [gameOver, setGameOver] = useState<GameOverState | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Évite un double appel à /end.
  const endingRef = useRef(false);

  const start = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/games/higher-lower/start", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Impossible de démarrer la partie.");
        setBusy(false);
        return;
      }
      setView(data.view as HLTurnView);
      setScore(data.view.score ?? 0);
      setReveal(null);
      setGameOver(null);
      endingRef.current = false;
      setPhase("playing");
    } catch {
      setError("Erreur réseau. Réessaie.");
    } finally {
      setBusy(false);
    }
  }, []);

  const finish = useCallback(async (fallbackScore: number) => {
    if (endingRef.current) return;
    endingRef.current = true;
    try {
      const res = await fetch("/api/games/higher-lower/end", { method: "POST" });
      const data = await res.json();
      setGameOver({
        score: data.score ?? fallbackScore,
        xpEarned: data.xpEarned ?? 0,
        needsAuth: data.needsAuth,
        newBadges: data.newBadges ?? [],
      });
    } catch {
      setGameOver({ score: fallbackScore, xpEarned: 0, newBadges: [] });
    } finally {
      setPhase("gameover");
      setBusy(false);
    }
  }, []);

  const guess = useCallback(
    async (choice: HLChoice) => {
      if (busy || !view) return;
      setBusy(true);
      try {
        const res = await fetch("/api/games/higher-lower/guess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ choice }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          await finish(score);
          return;
        }

        // Révèle la valeur du perso de droite (animation).
        setReveal({ value: data.revealedCursedEnergy, correct: data.correct });
        await sleep(950);

        if (data.correct && !data.gameOver) {
          setReveal(null);
          setView(data.next as HLTurnView);
          setScore(data.score);
          setBusy(false);
        } else {
          setReveal(null);
          setScore(data.score);
          await finish(data.score);
        }
      } catch {
        await finish(score);
      }
    },
    [busy, view, score, finish],
  );

  // ── Écran d'intro / roster insuffisant ──────────────────────────────────
  if (phase === "idle") {
    return (
      <div>
        <Header score={0} />
        <div className="mx-auto mt-6 max-w-md rounded-3xl border border-white/10 bg-void-800/50 p-8 text-center backdrop-blur">
          <p className="font-display text-2xl font-black text-white">
            Plus ou moins d&apos;énergie occulte ?
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Deux personnages s&apos;affichent. Devine si celui de{" "}
            <span className="text-white/90">droite</span> a{" "}
            <span className="text-domain-light">plus</span> ou{" "}
            <span className="text-cursed-light">moins</span> d&apos;énergie occulte
            que celui de gauche. Chaque bonne réponse fait avancer la chaîne. Une
            erreur et c&apos;est terminé.
          </p>
          {!isAuthed && (
            <p className="mt-4 text-xs text-white/40">
              Tu peux jouer sans compte, mais{" "}
              <Link href="/login" className="text-domain-light hover:underline">
                connecte-toi
              </Link>{" "}
              pour enregistrer ton score et gagner de l&apos;XP.
            </p>
          )}

          {hasEnoughRoster ? (
            <button
              type="button"
              onClick={start}
              disabled={busy}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-domain px-8 py-3 font-display text-sm font-bold uppercase tracking-wider text-white shadow-glow transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {busy ? "Chargement…" : "Jouer"}
              <span aria-hidden>→</span>
            </button>
          ) : (
            <p className="mt-6 rounded-xl border border-cursed/40 bg-cursed/10 px-4 py-3 text-sm text-cursed-light">
              Pas assez de personnages avec une énergie occulte renseignée pour
              lancer ce jeu.
            </p>
          )}
          {error && <p className="mt-4 text-sm text-cursed-light">{error}</p>}
        </div>
      </div>
    );
  }

  // ── Écran de jeu (+ modal de fin superposé) ──────────────────────────────
  return (
    <div>
      <Header score={score} />

      <p className="mb-6 text-center font-display text-4xl font-black tabular-nums text-white">
        {score}
        <span className="ml-2 align-middle text-sm font-bold uppercase tracking-wider text-white/40">
          {score > 1 ? "bonnes réponses" : "bonne réponse"}
        </span>
      </p>

      <p className="mb-5 text-center text-sm text-white/55">
        Le personnage de droite a-t-il{" "}
        <span className="text-domain-light">plus</span> ou{" "}
        <span className="text-cursed-light">moins</span> d&apos;énergie occulte ?
      </p>

      <div className="relative mx-auto grid max-w-3xl grid-cols-2 gap-6 sm:gap-16">
        {/* Carte GAUCHE (révélée) — slot fixe, contenu animé à l'intérieur */}
        <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-white/10 bg-void-800">
          <AnimatePresence initial={false}>
            {view && <CardFace key={view.left.id} card={view.left} revealValue={view.left.cursedEnergy} tone="neutral" />}
          </AnimatePresence>
        </div>

        {/* Carte DROITE (masquée jusqu'à la réponse) */}
        <div
          className="relative aspect-[3/4] overflow-hidden rounded-3xl border bg-void-800 transition-colors"
          style={{
            borderColor: reveal
              ? reveal.correct
                ? "#22c55e88"
                : "#dc262688"
              : "rgba(255,255,255,0.10)",
          }}
        >
          <AnimatePresence initial={false}>
            <CardFace
              key={view ? view.right.id : "empty"}
              card={view?.right ?? { id: "empty", name: "" }}
              revealValue={reveal ? reveal.value : undefined}
              tone={reveal ? (reveal.correct ? "good" : "bad") : "hidden"}
            />
          </AnimatePresence>
        </div>

        {/* Contrôles centraux : PLUS ↑ / MOINS ↓ entre les deux cartes. */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
          {reveal ? (
            <span
              className="flex h-11 w-11 items-center justify-center rounded-full border font-display text-xl font-black"
              style={{
                color: reveal.correct ? "#22c55e" : "#f87171",
                borderColor: reveal.correct ? "#22c55e88" : "#dc262688",
                background: "rgba(10,10,15,0.92)",
              }}
            >
              {reveal.correct ? "✓" : "✗"}
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => guess("higher")}
                disabled={busy}
                className="pointer-events-auto flex w-24 items-center justify-center gap-1 rounded-full border border-domain/60 bg-void-900/95 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-domain-light shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
              >
                Plus <span aria-hidden>↑</span>
              </button>
              <span className="font-display text-[10px] font-black uppercase tracking-widest text-white/40">
                ou
              </span>
              <button
                type="button"
                onClick={() => guess("lower")}
                disabled={busy}
                className="pointer-events-auto flex w-24 items-center justify-center gap-1 rounded-full border border-cursed/60 bg-void-900/95 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-cursed-light shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
              >
                Moins <span aria-hidden>↓</span>
              </button>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {phase === "gameover" && gameOver && (
          <ResultModal
            state={gameOver}
            isAuthed={isAuthed}
            onReplay={start}
            replaying={busy}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Sous-composants
// ──────────────────────────────────────────────────────────────────────────

function Header({ score }: { score: number }) {
  return (
    <header className="mb-4 flex items-center justify-between py-4">
      <Link
        href="/"
        className="flex items-center gap-1 text-sm text-white/60 transition-colors hover:text-domain-light"
      >
        ← Back
      </Link>
      <Logo className="h-12 w-auto sm:h-14" />
      <span className="rounded-full bg-void-700/60 px-3 py-1 text-xs text-white/60">
        Score&nbsp;: <span className="font-bold text-domain-light">{score}</span>
      </span>
    </header>
  );
}

/**
 * Face de carte (image + nom + valeur d'énergie). `tone` :
 *  - "neutral" (gauche révélée) → valeur en violet
 *  - "hidden"  (droite masquée) → « ? »
 *  - "good"/"bad" (droite révélée après réponse) → valeur en vert / rouge
 * Rendue en `absolute inset-0` dans un slot fixe → aucun décalage de mise en page.
 */
function CardFace({
  card,
  revealValue,
  tone,
}: {
  card: CardData;
  revealValue?: number;
  tone: "neutral" | "hidden" | "good" | "bad";
}) {
  const valueColor =
    tone === "good" ? "#22c55e" : tone === "bad" ? "#f87171" : "#a78bfa";
  return (
    <motion.div
      initial={{ opacity: 0, x: 40, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="absolute inset-0"
    >
      <CharacterImage character={card} className="opacity-70" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-void-900 via-void-900/80 to-transparent p-4 text-center">
        <p className="truncate font-display text-lg font-bold text-white">
          {card.name}
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-wider text-white/45">
          Énergie occulte
        </p>
        {tone === "hidden" ? (
          <p className="font-display text-4xl font-black text-white/30">?</p>
        ) : (
          <motion.p
            key={valueColor + String(revealValue)}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
            className="font-display text-4xl font-black tabular-nums"
            style={{ color: valueColor }}
          >
            {revealValue ?? "?"}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}

/** Modal de fin de partie — même DA que les autres jeux (Rejouer + classement). */
function ResultModal({
  state,
  isAuthed,
  onReplay,
  replaying,
}: {
  state: GameOverState;
  isAuthed: boolean;
  onReplay: () => void;
  replaying: boolean;
}) {
  const animatedScore = useCountUp(state.score, 900);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-void-900/85 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.35 }}
        className="my-auto w-full max-w-md rounded-3xl border border-white/10 bg-void-800/90 p-8 text-center"
      >
        <p className="text-sm uppercase tracking-[0.3em] text-white/40">
          Fin de partie
        </p>
        <h2
          className="my-2 font-display text-5xl font-black"
          style={{ color: "#dc2626", textShadow: "0 0 26px #dc262688" }}
        >
          Terminé
        </h2>

        <p className="mt-3 text-white/70">
          Score :{" "}
          <span className="font-display text-3xl font-black text-domain-light tabular-nums">
            {animatedScore}
          </span>{" "}
          <span className="text-white/40">
            {state.score > 1 ? "bonnes réponses" : "bonne réponse"}
          </span>
        </p>

        {state.needsAuth ? (
          <div className="mt-5 rounded-xl border border-domain/30 bg-domain/5 px-4 py-3 text-sm">
            <p className="text-white/70">
              🔒 Connecte-toi pour gagner de l&apos;XP, enregistrer ton score et
              apparaître au classement.
            </p>
            <Link
              href="/login"
              className="mt-2 inline-block font-display text-xs font-bold uppercase tracking-wide text-domain-light underline-offset-4 hover:underline"
            >
              Se connecter / créer un compte →
            </Link>
          </div>
        ) : (
          <>
            <ExpReward gainedExp={state.xpEarned} newBadges={state.newBadges} />
            {isAuthed && (
              <p className="mt-4 text-sm">
                <span className="font-semibold text-emerald-300">
                  ✓ Score enregistré au classement !
                </span>
              </p>
            )}
          </>
        )}

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onReplay}
            disabled={replaying}
            className="rounded-xl bg-domain px-6 py-3 font-display font-bold uppercase tracking-wide text-white shadow-glow transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {replaying ? "…" : "Rejouer"}
          </button>
          <a
            href="#leaderboard"
            className="rounded-xl border border-white/15 px-6 py-3 font-display font-bold uppercase tracking-wide text-white/80 transition-colors hover:border-domain/50 hover:text-white"
          >
            🏆 Classement
          </a>
        </div>
      </motion.div>
    </div>
  );
}
