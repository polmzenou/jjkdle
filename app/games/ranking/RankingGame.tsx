"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SLOT_COUNT } from "@/data/ranking/conditions";
import {
  startRankingRun,
  checkRankingRun,
  type RankingStartResult,
} from "./actions";
import type { RankingCardData } from "./types";
import { formatScore } from "@/lib/format";
import { RosterProvider } from "@/components/ranking/RosterContext";
import { RankingSlot } from "@/components/ranking/RankingSlot";
import { CharacterPool } from "@/components/ranking/CharacterPool";
import { AttemptsBar } from "@/components/ranking/AttemptsBar";
import { RankingCard } from "@/components/ranking/RankingCard";
import { VictoryModal } from "@/components/ranking/VictoryModal";
import { GameOverScreen } from "@/components/ranking/GameOverScreen";
import { Logo } from "@/components/Logo";

interface RankingGameProps {
  initialBestScore: number;
}

type Status = "playing" | "won" | "lost";

/** Intitulé de la manche courante (visuel seul, sans le classement correct). */
type Prompt = { pool: string; category: string; prompt: string };

const emptySlots = () => Array<string | null>(SLOT_COUNT).fill(null);
const emptyFlags = () => Array<boolean>(SLOT_COUNT).fill(false);

/**
 * JJK Pyramid — le CLIENT ne connaît jamais le classement correct : il reçoit 8
 * cartes mélangées de `startRankingRun`, et chaque « Vérifier » est validé par
 * `checkRankingRun` (score + XP + classement côté serveur). Voir app/games/ranking/actions.ts.
 */
export function RankingGame({ initialBestScore }: RankingGameProps) {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [cardsById, setCardsById] = useState<Record<string, RankingCardData>>({});
  const [poolOrder, setPoolOrder] = useState<string[]>([]);
  const [slots, setSlots] = useState<(string | null)[]>(emptySlots);
  const [locked, setLocked] = useState<boolean[]>(emptyFlags);
  const [wrongFlash, setWrongFlash] = useState<boolean[]>(emptyFlags);
  const [attempt, setAttempt] = useState(1);
  const [status, setStatus] = useState<Status>("playing");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(initialBestScore);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [gainedExp, setGainedExp] = useState<number | null>(null);
  const [expBadges, setExpBadges] = useState<string[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);

  const applyStart = useCallback((res: RankingStartResult) => {
    if (!res.ok) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setPrompt({ pool: res.pool, category: res.category, prompt: res.prompt });
    setCardsById(Object.fromEntries(res.cards.map((c) => [c.id, c])));
    setPoolOrder(res.cards.map((c) => c.id));
    setSlots(emptySlots());
    setLocked(emptyFlags());
    setWrongFlash(emptyFlags());
    setAttempt(1);
    setStatus("playing");
    setScore(0);
    setIsNewRecord(false);
    setGainedExp(null);
    setExpBadges([]);
    setOrder([]);
    setNeedsAuth(false);
    setActiveId(null);
    setError(null);
    setLoading(false);
  }, []);

  const startNewGame = useCallback(() => {
    setLoading(true);
    startTransition(async () => {
      applyStart(await startRankingRun());
    });
  }, [applyStart]);

  // Démarrage au montage.
  useEffect(() => {
    startNewGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Personnages restant à placer (ordre d'affichage stable, mélangé une fois).
  const poolIds = poolOrder.filter((id) => !slots.includes(id));
  const allFilled = slots.every((s) => s !== null);

  const placeInSlot = useCallback(
    (charId: string, slotIndex: number) => {
      if (locked[slotIndex]) return;
      setSlots((prev) => {
        const sourceIndex = prev.indexOf(charId); // -1 si depuis le pool
        const displaced = prev[slotIndex];
        const next = [...prev];
        next[slotIndex] = charId;
        if (sourceIndex >= 0) next[sourceIndex] = displaced; // swap entre slots
        return next;
      });
    },
    [locked],
  );

  const removeFromSlot = useCallback(
    (slotIndex: number) => {
      if (locked[slotIndex]) return;
      setSlots((prev) => {
        const next = [...prev];
        next[slotIndex] = null;
        return next;
      });
    },
    [locked],
  );

  const tapPlaceFromPool = useCallback(
    (charId: string) => {
      const idx = slots.findIndex((s, i) => s === null && !locked[i]);
      if (idx >= 0) placeInSlot(charId, idx);
    },
    [slots, locked, placeInSlot],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 8 },
    }),
  );

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const charId = String(e.active.id);
    const from = e.active.data.current?.from as "pool" | number | undefined;
    const over = e.over;

    if (!over) {
      if (typeof from === "number") removeFromSlot(from);
      return;
    }
    const overId = String(over.id);
    if (overId === "pool") {
      if (typeof from === "number") removeFromSlot(from);
      return;
    }
    if (overId.startsWith("slot-")) {
      const slotIndex = Number(overId.slice(5));
      placeInSlot(charId, slotIndex);
    }
  };

  const handleCheck = useCallback(() => {
    if (!allFilled || status !== "playing" || pending) return;
    const placement = slots as string[]; // allFilled garantit l'absence de null

    startTransition(async () => {
      const res = await checkRankingRun(placement);
      if (!res.ok) {
        if (res.needsRestart) {
          startNewGame();
        } else {
          setError(res.error);
        }
        return;
      }

      const flags = res.flags;
      setLocked((prev) => prev.map((l, i) => l || flags[i]));

      if (res.status === "won") {
        setStatus("won");
        setScore(res.score);
        setOrder(res.order);
        setBestScore(res.bestScore);
        setIsNewRecord(res.isNewRecord);
        setGainedExp(res.gainedExp);
        setExpBadges(res.newBadges);
        setNeedsAuth(res.needsAuth);
        return;
      }

      if (res.status === "lost") {
        setStatus("lost");
        setOrder(res.order);
        return;
      }

      // playing : flash rouge sur les positions fausses, renvoyées au pool.
      setAttempt(res.attempt);
      const wrong = slots.map((s, i) => s !== null && !flags[i] && !locked[i]);
      setWrongFlash(wrong);
      setTimeout(() => {
        setSlots((prev) => prev.map((s, i) => (wrong[i] ? null : s)));
        setWrongFlash(emptyFlags());
      }, 500);
    });
  }, [allFilled, status, pending, slots, locked, startNewGame]);

  if (error && !prompt) {
    return (
      <p className="py-24 text-center text-white/40">{error}</p>
    );
  }

  if (loading || !prompt) {
    return <p className="py-24 text-center text-white/40">Chargement…</p>;
  }

  return (
    <RosterProvider value={cardsById}>
    <div>
      {/* En-tête */}
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

      {/* Bandeau consigne + infos */}
      <div className="mb-4 rounded-2xl border border-white/10 bg-void-800/50 px-5 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-domain/15 px-2.5 py-0.5 text-xs font-semibold text-domain-light">
              {prompt.pool}
            </span>
            <span className="rounded-full border border-white/10 bg-void-700/50 px-2.5 py-0.5 text-xs font-semibold text-white">
              {prompt.category}
            </span>
          </div>
          <p className="text-xs text-white/45">
            Rank 1 to 8 · 4 attempts · Correct positions lock
          </p>
        </div>
        <p className="mt-1 text-sm text-white/65">{prompt.prompt}</p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {/* YOUR RANKING */}
          <section className="rounded-2xl border border-white/10 bg-void-800/40 p-4">
            <h2 className="mb-3 text-center font-display text-sm font-bold uppercase tracking-[0.2em] text-domain-light">
              Your Ranking
            </h2>
            <div className="grid grid-cols-4 gap-3">
              {slots.map((id, i) => (
                <RankingSlot
                  key={i}
                  index={i}
                  characterId={id}
                  locked={locked[i]}
                  wrong={wrongFlash[i]}
                  onRemove={removeFromSlot}
                />
              ))}
            </div>
          </section>

          {/* AVAILABLE */}
          <section className="rounded-2xl border border-white/10 bg-void-800/40 p-4">
            <h2 className="mb-3 text-center font-display text-sm font-bold uppercase tracking-[0.2em] text-domain-light">
              Available
            </h2>
            <CharacterPool ids={poolIds} onTapPlace={tapPlaceFromPool} />
          </section>
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="w-28">
              <RankingCard characterId={activeId} dragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <AttemptsBar attempt={attempt} canCheck={allFilled && !pending} onCheck={handleCheck} />

      {status === "won" && (
        <VictoryModal
          order={order}
          category={prompt.category}
          score={score}
          bestScore={bestScore}
          isNewRecord={isNewRecord}
          needsAuth={needsAuth}
          gainedExp={gainedExp}
          expBadges={expBadges}
          onReplay={startNewGame}
        />
      )}
      {status === "lost" && (
        <GameOverScreen
          order={order}
          category={prompt.category}
          onRetry={startNewGame}
        />
      )}
    </div>
    </RosterProvider>
  );
}
