"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Fighter } from "@/components/draft/CombatScene";
import type { SerializedLobby } from "@/lib/multiplayer/events";
import type { RosterMap } from "@/lib/multiplayer/state";
import { battleValueOf } from "@/lib/games/battle/battleValues";
import { DECK_SIZE, type BattleState } from "@/lib/games/battle/types";

interface BattleCombatProps {
  lobby: SerializedLobby;
  gameState: BattleState;
  rosterMap: RosterMap;
  currentUserId: string;
  onFinish: () => void;
}

const ROUND_MS = 460;
const ROUNDS = 4;
/** Marge de battleValue à partir de laquelle le coup final devient un Black Flash. */
const BLACK_FLASH_MARGIN = 30;

interface Duel {
  mine: { name: string; image?: string } | null;
  theirs: { name: string; image?: string } | null;
  myVal: number;
  theirVal: number;
}

/**
 * Met en scène 5 duels séquentiels (mon perso i vs perso i de l'adversaire), en
 * réutilisant le composant `Fighter` du jeu Jujutsu Draft. Le vainqueur réel est
 * le cumul total (calculé côté serveur) ; cette animation ne fait que le raconter.
 */
export function BattleCombat({
  lobby,
  gameState,
  rosterMap,
  currentUserId,
  onFinish,
}: BattleCombatProps) {
  // L'état de combat est figé pendant l'animation → on calcule les duels une fois.
  const duels: Duel[] = useMemo(() => {
    const opponent = lobby.players.find((p) => p.userId !== currentUserId);
    const myDeck = gameState.decks[currentUserId] ?? [];
    const oppDeck = opponent ? (gameState.decks[opponent.userId] ?? []) : [];
    return Array.from({ length: DECK_SIZE }).map((_, i) => {
      const mine = myDeck[i] ? rosterMap[myDeck[i]] : null;
      const theirs = oppDeck[i] ? rosterMap[oppDeck[i]] : null;
      return {
        mine: mine ?? null,
        theirs: theirs ?? null,
        myVal: battleValueOf(mine),
        theirVal: battleValueOf(theirs),
      };
    });
  }, [lobby.players, gameState.decks, rosterMap, currentUserId]);

  const [index, setIndex] = useState(0);
  const [myHp, setMyHp] = useState(100);
  const [oppHp, setOppHp] = useState(100);
  const [flash, setFlash] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const finishedRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish();
  };

  useEffect(() => {
    const duel = duels[index];
    if (!duel) return;

    setMyHp(100);
    setOppHp(100);
    setFlash(false);

    const iWin = duel.myVal >= duel.theirVal;
    const margin = Math.abs(duel.myVal - duel.theirVal);
    const bigHit = iWin && margin >= BLACK_FLASH_MARGIN;
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (let r = 1; r <= ROUNDS; r++) {
      timers.push(
        setTimeout(() => {
          setShakeKey((k) => k + 1);
          if (iWin) {
            setOppHp(Math.max(0, Math.round(100 - (100 * r) / ROUNDS)));
          } else {
            setMyHp(Math.max(0, Math.round(100 - (100 * r) / ROUNDS)));
          }
        }, r * ROUND_MS),
      );
    }

    timers.push(
      setTimeout(
        () => {
          setShakeKey((k) => k + 1);
          if (iWin) {
            setOppHp(0);
            if (bigHit) setFlash(true);
          } else {
            setMyHp(0);
          }
        },
        (ROUNDS + 1) * ROUND_MS,
      ),
    );

    timers.push(
      setTimeout(
        () => {
          if (index + 1 < duels.length) setIndex(index + 1);
          else finish();
        },
        (ROUNDS + 2) * ROUND_MS,
      ),
    );

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const duel = duels[index];
  if (!duel) return null;

  return (
    <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-void-800/60 p-6 backdrop-blur sm:p-10">
      <AnimatePresence>
        {flash && (
          <motion.div
            key="bf"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.5, times: [0, 0.25, 1] }}
            className="pointer-events-none absolute inset-0 z-30"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(220,38,38,0.85), rgba(10,10,15,0.95) 70%)",
            }}
          />
        )}
      </AnimatePresence>

      <div className="mb-6 text-center">
        <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-cursed-light">
          Duel {index + 1} / {duels.length}
        </p>
      </div>

      <motion.div
        key={shakeKey}
        animate={{ x: [0, -5, 5, -3, 0] }}
        transition={{ duration: 0.22 }}
        className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6"
      >
        <Fighter
          name={duel.mine?.name ?? "—"}
          image={duel.mine?.image}
          hp={myHp}
          hpColor="#22c55e"
          align="left"
        />
        <span className="animate-glow-pulse font-display text-2xl font-black text-white/70">
          VS
        </span>
        <Fighter
          name={duel.theirs?.name ?? "—"}
          image={duel.theirs?.image}
          hp={oppHp}
          hpColor="#dc2626"
          align="right"
        />
      </motion.div>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={finish}
          className="rounded-full border border-white/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/55 transition-colors hover:text-white"
        >
          Passer ⏩
        </button>
      </div>
    </div>
  );
}
