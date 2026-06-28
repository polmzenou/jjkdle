"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { Fighter } from "@/components/draft/CombatScene";
import type { SerializedLobby } from "@/lib/multiplayer/events";
import type { RosterMap } from "@/lib/multiplayer/state";
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
/** Écart de HP à partir duquel le coup gagnant devient un Black Flash. */
const BLACK_FLASH_MARGIN = 30;

/** Pourcentage de remplissage de la barre (HP courant / HP max). */
function pct(hp: number, max: number): number {
  return max > 0 ? Math.max(0, Math.min(100, (hp / max) * 100)) : 0;
}

/** Couleur de la barre selon le remplissage : vire à l'orange puis rouge néon. */
function hpColor(percent: number, base: string): string {
  if (percent <= 25) return "#ef4444"; // rouge néon : danger
  if (percent <= 50) return "#f59e0b"; // orange : entamé
  return base;
}

/**
 * Met en scène la séquence de duels (réutilise le `Fighter` de Jujutsu Draft).
 * - Mode normal : 5 duels indépendants (perso i vs perso i), issue = cumul de
 *   battleValue ; les barres descendent de plein → 0 (purement visuel).
 * - Mode hardcore : gauntlet « le vainqueur reste » avec HP persistants — le
 *   champion encaisse les HP du perdant et continue affaibli, sa barre reste
 *   réduite d'un duel à l'autre. L'issue est PRÉ-CALCULÉE côté serveur ;
 *   l'animation ne fait que la raconter (mêmes entrées → même script).
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
  // HP courants (valeurs absolues) de chaque combattant en lice.
  const [myHp, setMyHp] = useState(0);
  const [oppHp, setOppHp] = useState(0);
  const [flash, setFlash] = useState(false);
  const shake = useAnimationControls();
  const finishedRef = useRef(false);

  // Secousse d'écran sans remonter l'arène (sinon les barres de vie « sautent »).
  const triggerShake = () =>
    void shake.start({ x: [0, -5, 5, -3, 0], transition: { duration: 0.22 } });

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish();
  };

  useEffect(() => {
    const duel = duels[index];
    if (!duel) return;

    // Les barres partent des HP d'ENTRÉE (le champion qui reste garde ses HP).
    setMyHp(duel.mineHpStart);
    setOppHp(duel.theirsHpStart);
    setFlash(false);

    const bigHit =
      duel.outcome === "win" &&
      duel.mineHpStart - duel.theirsHpStart >= BLACK_FLASH_MARGIN;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Interpolation linéaire start → end sur les rounds (les DEUX côtés bougent :
    // le vainqueur encaisse aussi les HP du perdant).
    for (let r = 1; r <= ROUNDS; r++) {
      timers.push(
        setTimeout(() => {
          triggerShake();
          const t = r / ROUNDS;
          setMyHp(duel.mineHpStart + (duel.mineHpEnd - duel.mineHpStart) * t);
          setOppHp(
            duel.theirsHpStart + (duel.theirsHpEnd - duel.theirsHpStart) * t,
          );
        }, r * ROUND_MS),
      );
    }

    // Coup final : on cale exactement sur les HP de fin (le perdant tombe à 0).
    timers.push(
      setTimeout(
        () => {
          triggerShake();
          setMyHp(duel.mineHpEnd);
          setOppHp(duel.theirsHpEnd);
          if (bigHit) setFlash(true);
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
  const isHardcore = gameState.mode === "hardcore";

  const myPct = pct(myHp, duel.mineMaxHp);
  const oppPct = pct(oppHp, duel.theirsMaxHp);

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
          {isHardcore ? "Gauntlet" : "Duel"} {index + 1} / {duels.length}
        </p>
        {isHardcore && (
          <p className="mt-1 text-[10px] uppercase tracking-wider text-white/40">
            Hardcore · le vainqueur reste (PV persistants)
          </p>
        )}
      </div>

      <motion.div
        animate={shake}
        className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6"
      >
        <Fighter
          name={mine?.name ?? "—"}
          image={mine?.image}
          hp={myPct}
          hpColor={hpColor(myPct, "#22c55e")}
          align="left"
          hpValue={isHardcore ? myHp : undefined}
          hpMax={isHardcore ? duel.mineMaxHp : undefined}
        />
        <span className="animate-glow-pulse font-display text-2xl font-black text-white/70">
          VS
        </span>
        <Fighter
          name={theirs?.name ?? "—"}
          image={theirs?.image}
          hp={oppPct}
          hpColor={hpColor(oppPct, "#dc2626")}
          align="right"
          hpValue={isHardcore ? oppHp : undefined}
          hpMax={isHardcore ? duel.theirsMaxHp : undefined}
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
