"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Fighter } from "@/components/draft/CombatScene";
import type { SerializedLobby } from "@/lib/multiplayer/events";
import type { RosterMap } from "@/lib/multiplayer/state";
import { battleValueOf } from "@/lib/games/battle/battleValues";
import { buildDuelScript } from "@/lib/games/battle/combat";
import type { BattleState } from "@/lib/games/battle/types";

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

/**
 * Met en scène la séquence de duels (réutilise le `Fighter` de Jujutsu Draft).
 * - Mode normal : 5 duels indépendants (perso i vs perso i).
 * - Mode hardcore : gauntlet « le vainqueur reste » — le même combattant
 *   enchaîne tant qu'il gagne. L'issue est PRÉ-CALCULÉE côté serveur ;
 *   l'animation ne fait que la raconter.
 */
export function BattleCombat({
  lobby,
  gameState,
  rosterMap,
  currentUserId,
  onFinish,
}: BattleCombatProps) {
  // L'état de combat est figé pendant l'animation → on calcule le script une fois.
  const duels = useMemo(() => {
    const opponent = lobby.players.find((p) => p.userId !== currentUserId);
    const myDeck = gameState.decks[currentUserId] ?? [];
    const oppDeck = opponent ? (gameState.decks[opponent.userId] ?? []) : [];
    return buildDuelScript(myDeck, oppDeck, rosterMap, gameState.mode);
  }, [lobby.players, gameState.decks, gameState.mode, rosterMap, currentUserId]);

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

    const iWin = duel.outcome === "win";
    const iLose = duel.outcome === "lose";
    const margin = Math.abs(
      battleValueOf(duel.mineId ? rosterMap[duel.mineId] : null) -
        battleValueOf(duel.theirsId ? rosterMap[duel.theirsId] : null),
    );
    const bigHit = iWin && margin >= BLACK_FLASH_MARGIN;
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (let r = 1; r <= ROUNDS; r++) {
      timers.push(
        setTimeout(() => {
          setShakeKey((k) => k + 1);
          const hp = Math.max(0, Math.round(100 - (100 * r) / ROUNDS));
          if (iWin) setOppHp(hp);
          else if (iLose) setMyHp(hp);
          else {
            // Double K.O. : les deux tombent.
            setOppHp(hp);
            setMyHp(hp);
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
          } else if (iLose) {
            setMyHp(0);
          } else {
            setOppHp(0);
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

  const mine = duel.mineId ? rosterMap[duel.mineId] : null;
  const theirs = duel.theirsId ? rosterMap[duel.theirsId] : null;

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
          {gameState.mode === "hardcore" ? "Gauntlet" : "Duel"} {index + 1} /{" "}
          {duels.length}
        </p>
        {gameState.mode === "hardcore" && (
          <p className="mt-1 text-[10px] uppercase tracking-wider text-white/40">
            Hardcore · le vainqueur reste
          </p>
        )}
      </div>

      <motion.div
        key={shakeKey}
        animate={{ x: [0, -5, 5, -3, 0] }}
        transition={{ duration: 0.22 }}
        className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6"
      >
        <Fighter
          name={mine?.name ?? "—"}
          image={mine?.image}
          hp={myHp}
          hpColor="#22c55e"
          align="left"
        />
        <span className="animate-glow-pulse font-display text-2xl font-black text-white/70">
          VS
        </span>
        <Fighter
          name={theirs?.name ?? "—"}
          image={theirs?.image}
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
