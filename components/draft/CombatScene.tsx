"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CharacterImage } from "@/components/CharacterImage";
import type { CombatResult, DraftCharacter } from "@/lib/games/draft/types";

interface CombatSceneProps {
  result: CombatResult;
  /** Avatar du joueur = perso draftÉ en « Sort inné ». */
  avatar: DraftCharacter;
  /** Appelé quand le combat est terminé (ou passé) → écran de résultat. */
  onFinish: () => void;
}

const ROUND_MS = 460;
const ROUNDS = 4;
/** Marge à partir de laquelle le coup final devient un Black Flash. */
const BLACK_FLASH_MARGIN = 35;

/**
 * Met en scène chaque duel : avatar du joueur vs boss, barre de vie qui descend
 * par paliers, screen-shake, flashs. L'issue est PRÉ-CALCULÉE (`result`) ;
 * l'animation ne fait que la raconter. Cliquable pour passer. Aucun score
 * chiffré n'est jamais affiché.
 */
export function CombatScene({ result, avatar, onFinish }: CombatSceneProps) {
  const { duels } = result;
  const [index, setIndex] = useState(0);
  const [bossHp, setBossHp] = useState(100);
  const [playerHp, setPlayerHp] = useState(100);
  const [ko, setKo] = useState(false);
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

    setBossHp(100);
    setPlayerHp(100);
    setKo(false);
    setFlash(false);

    const bigHit = duel.survived && duel.margin >= BLACK_FLASH_MARGIN;
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (let r = 1; r <= ROUNDS; r++) {
      timers.push(
        setTimeout(() => {
          setShakeKey((k) => k + 1);
          if (duel.survived) {
            setBossHp(Math.max(0, Math.round(100 - (100 * r) / ROUNDS)));
          } else {
            // Le boss encaisse mais résiste, puis ripostera.
            setBossHp(Math.max(45, Math.round(100 - (55 * r) / ROUNDS)));
            if (r >= ROUNDS - 1) setPlayerHp(Math.max(0, 100 - 45 * (r - (ROUNDS - 2))));
          }
        }, r * ROUND_MS),
      );
    }

    // Résolution du duel.
    timers.push(
      setTimeout(() => {
        setShakeKey((k) => k + 1);
        if (duel.survived) {
          setBossHp(0);
          if (bigHit) setFlash(true);
          setKo(true);
        } else {
          setPlayerHp(0);
        }
      }, (ROUNDS + 1) * ROUND_MS),
    );

    // Enchaînement.
    timers.push(
      setTimeout(
        () => {
          if (!duel.survived) {
            finish();
          } else if (index + 1 < duels.length) {
            setIndex(index + 1);
          } else {
            finish();
          }
        },
        (ROUNDS + 2) * ROUND_MS,
      ),
    );

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const duel = duels[index];
  if (!duel) return null;

  const killedSoFar = index + (ko ? 1 : 0);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-void-800/60 p-6 backdrop-blur sm:p-10">
      {/* Black Flash plein écran */}
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

      {/* En-tête : boss + compteur */}
      <div className="mb-6 flex items-center justify-between">
        <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-cursed-light">
          Boss {index + 1} / {duels.length}
        </p>
        <p className="text-xs uppercase tracking-wider text-white/55">
          Ennemis vaincus :{" "}
          <span className="font-bold text-domain-light">{killedSoFar}</span>
        </p>
      </div>

      {/* Arène */}
      <motion.div
        key={shakeKey}
        animate={{ x: [0, -5, 5, -3, 0] }}
        transition={{ duration: 0.22 }}
        className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6"
      >
        {/* Joueur */}
        <Fighter
          name={avatar.name}
          image={avatar.image}
          hp={playerHp}
          hpColor="#22c55e"
          align="left"
        />

        {/* VS / K.O. */}
        <div className="flex flex-col items-center">
          <AnimatePresence mode="wait">
            {ko ? (
              <motion.span
                key="ko"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 240, damping: 12 }}
                className="font-display text-3xl font-black text-cursed-light sm:text-4xl"
                style={{ textShadow: "0 0 24px rgba(220,38,38,0.8)" }}
              >
                K.O.!
              </motion.span>
            ) : (
              <motion.span
                key="vs"
                className="animate-glow-pulse font-display text-2xl font-black text-white/70"
              >
                VS
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Boss */}
        <Fighter
          name={duel.boss.name}
          image={duel.boss.image}
          hp={bossHp}
          hpColor="#dc2626"
          align="right"
        />
      </motion.div>

      {/* Passer */}
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

/** Carte combattant (portrait + barre de vie). Réutilisée par « JJK Random Battle ». */
export function Fighter({
  name,
  image,
  hp,
  hpColor,
  align,
}: {
  name: string;
  image?: string;
  hp: number;
  hpColor: string;
  align: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <div
        className="relative mx-auto aspect-[3/4] w-full max-w-[160px] overflow-hidden rounded-2xl border-2 bg-void-900"
        style={{ borderColor: `${hpColor}88`, boxShadow: `0 0 26px ${hpColor}44` }}
      >
        <CharacterImage character={{ name, image }} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-void-900 to-transparent" />
      </div>
      <p className="mt-2 truncate font-display text-sm font-bold text-white">
        {name}
      </p>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full"
          style={{ background: hpColor }}
          animate={{ width: `${hp}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}
