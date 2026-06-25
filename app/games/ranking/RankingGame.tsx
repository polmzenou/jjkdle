"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { RankingCondition } from "@/data/ranking/conditions";
import { SLOT_COUNT } from "@/data/ranking/conditions";
import {
  MAX_ATTEMPTS,
  checkPlacement,
  isComplete,
  pickRandomCondition,
  scoreForAttempt,
  shuffledPool,
} from "@/lib/ranking/ranking";
import { saveBestScore } from "@/lib/bestScore";
import { formatScore } from "@/lib/format";
import type { Character } from "@/data/roster/characters";
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
  isAuthed: boolean;
  /** Conditions du jeu (depuis la base). */
  conditions: RankingCondition[];
  /** Roster indexé par id, pour résoudre les cartes côté client. */
  characterById: Record<string, Character>;
}

type Status = "playing" | "won" | "lost";

const emptySlots = () => Array<string | null>(SLOT_COUNT).fill(null);
const emptyFlags = () => Array<boolean>(SLOT_COUNT).fill(false);

export function RankingGame({
  initialBestScore,
  isAuthed,
  conditions,
  characterById,
}: RankingGameProps) {
  // Conditions lues via une ref : `startNewGame` reste à deps [] (identité
  // stable) pour ne pas réinitialiser la partie lors d'un refresh de route
  // (déclenché par la soumission de score au leaderboard).
  const conditionsRef = useRef(conditions);
  conditionsRef.current = conditions;
  // Tiré côté client (post-montage) pour éviter le mismatch d'hydratation.
  const [condition, setCondition] = useState<RankingCondition | null>(null);
  const [poolOrder, setPoolOrder] = useState<string[]>([]);
  const [slots, setSlots] = useState<(string | null)[]>(emptySlots);
  const [locked, setLocked] = useState<boolean[]>(emptyFlags);
  const [wrongFlash, setWrongFlash] = useState<boolean[]>(emptyFlags);
  const [attempt, setAttempt] = useState(1);
  const [status, setStatus] = useState<Status>("playing");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(initialBestScore);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Mémorise la condition courante pour ne jamais la retirer 2 fois de suite.
  const lastConditionId = useRef<string | undefined>(undefined);

  // Stable (deps []) : l'init ne doit tourner qu'au montage. Sinon un refresh de
  // route (déclenché par le Server Action saveBestScore) réinitialiserait la
  // partie et ferait disparaître le modal de victoire.
  const startNewGame = useCallback(() => {
    if (conditionsRef.current.length === 0) return;
    const c = pickRandomCondition(
      conditionsRef.current,
      Math.random,
      lastConditionId.current,
    );
    lastConditionId.current = c.id;
    setCondition(c);
    setPoolOrder(shuffledPool(c));
    setSlots(emptySlots());
    setLocked(emptyFlags());
    setWrongFlash(emptyFlags());
    setAttempt(1);
    setStatus("playing");
    setScore(0);
    setIsNewRecord(false);
    setActiveId(null);
  }, []);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  // Personnages restant à placer (ordre d'affichage stable, mélangé une fois).
  const poolIds = useMemo(
    () => poolOrder.filter((id) => !slots.includes(id)),
    [poolOrder, slots],
  );
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

  // Tap-to-place : place dans le 1er slot libre non verrouillé.
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
    if (!condition || !allFilled || status !== "playing") return;

    const flags = checkPlacement(slots, condition.order);
    const newLocked = locked.map((l, i) => l || flags[i]);

    if (isComplete(flags)) {
      const earned = scoreForAttempt(attempt);
      setLocked(newLocked);
      setStatus("won");
      setScore(earned);
      void saveBestScore("ranking", earned).then((r) => {
        setBestScore(r.best);
        setIsNewRecord(r.isNewRecord);
      });
      return;
    }

    // Échec : verrouille les bons, flash rouge + renvoi des faux au pool.
    const wrong = slots.map((s, i) => s !== null && !flags[i] && !locked[i]);
    setLocked(newLocked);
    setWrongFlash(wrong);
    setTimeout(() => {
      setSlots((prev) => prev.map((s, i) => (wrong[i] ? null : s)));
      setWrongFlash(emptyFlags());
    }, 500);

    if (attempt >= MAX_ATTEMPTS) {
      setStatus("lost");
    } else {
      setAttempt((a) => a + 1);
    }
  }, [condition, allFilled, status, slots, locked, attempt]);

  if (conditions.length === 0) {
    return (
      <p className="py-24 text-center text-white/40">
        Aucune condition disponible pour le moment.
      </p>
    );
  }

  if (!condition) {
    return <p className="py-24 text-center text-white/40">Chargement…</p>;
  }

  return (
    <RosterProvider value={characterById}>
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
          <p className="text-sm">
            <span className="text-xs uppercase tracking-wider text-domain-light">
              Catégorie
            </span>{" "}
            <span className="font-bold text-white">{condition.category}</span>
          </p>
          <p className="text-xs text-white/45">
            Rank 1 to 8 · 4 attempts · Correct positions lock
          </p>
        </div>
        <p className="mt-1 text-sm text-white/65">{condition.prompt}</p>
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

      <AttemptsBar attempt={attempt} canCheck={allFilled} onCheck={handleCheck} />

      {status === "won" && (
        <VictoryModal
          order={condition.order}
          category={condition.category}
          score={score}
          bestScore={bestScore}
          isNewRecord={isNewRecord}
          isAuthed={isAuthed}
          onReplay={startNewGame}
        />
      )}
      {status === "lost" && (
        <GameOverScreen
          order={condition.order}
          category={condition.category}
          onRetry={startNewGame}
        />
      )}
    </div>
    </RosterProvider>
  );
}
