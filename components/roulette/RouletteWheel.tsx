"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CharacterImage } from "@/components/CharacterImage";
import { PackIcon } from "@/components/cards/CardIcons";
import { CoinIcon } from "@/components/progress/CoinWallet";
import { BOOSTERS, type BoosterKind } from "@/lib/cards/boosters";
import type { CardView } from "@/lib/cards/types";
import { ROULETTE_SLOTS, type RouletteSlot } from "@/lib/roulette/prizes";

/**
 * La ROUE, purement visuelle : elle tourne jusqu'à `rotation` (degrés, cumulés)
 * et prévient quand elle s'arrête. Elle ne sait rien du tirage — c'est la
 * section qui calcule l'angle à partir de la case renvoyée par le serveur.
 *
 * Thème : les cases coins et carte sont peintes avec les variables de l'univers
 * (`--color-domain`, `--color-cursed`, `--color-void-*`), donc la même roue est
 * violette en JJK, orange en CSM… Les cases booster gardent la couleur de MÉTAL
 * du pack (bronze, argent, or), identique partout, comme en boutique.
 *
 * Construite en HTML (conic-gradient + étiquettes tournées) plutôt qu'en SVG :
 * les affiches des boosters sont des <img> de personnages, qu'un
 * `<foreignObject>` tournant rend mal sur Safari.
 */

const SLICE = 360 / ROULETTE_SLOTS.length;

/** Remplissage d'une case (couleur CSS). */
function slotFill(slot: RouletteSlot, index: number): string {
  switch (slot.kind) {
    case "booster":
      return `color-mix(in srgb, ${BOOSTERS[slot.booster].accent} 55%, rgb(var(--color-void-900)))`;
    case "card":
      return "rgb(var(--color-cursed-dark))";
    case "coins":
      // Deux teintes de l'univers en alternance, pour que les parts voisines se
      // distinguent même sans séparateur.
      return index % 4 === 0
        ? "rgb(var(--color-domain-dark))"
        : "color-mix(in srgb, rgb(var(--color-domain)) 45%, rgb(var(--color-void-800)))";
  }
}

/** `conic-gradient` des 12 parts, part 0 centrée sous le pointeur. */
const WHEEL_BACKGROUND = `conic-gradient(from ${-SLICE / 2}deg, ${ROULETTE_SLOTS.map(
  (slot, i) => `${slotFill(slot, i)} ${i * SLICE}deg ${(i + 1) * SLICE}deg`,
).join(", ")})`;

/** Fins liserés entre les parts. */
const SEPARATORS = `repeating-conic-gradient(from ${-SLICE / 2}deg, rgb(255 255 255 / 0.28) 0deg 0.6deg, transparent 0.6deg ${SLICE}deg)`;

interface RouletteWheelProps {
  /** Rotation cible en degrés (cumulée, jamais remise à zéro). */
  rotation: number;
  spinning: boolean;
  /** Affiches des boosters (personnage du jour), par gamme. */
  covers: Partial<Record<BoosterKind, CardView | null>>;
  /** Case gagnante à mettre en valeur une fois la roue arrêtée. */
  highlight: number | null;
  /** Moyeu : action (tourner) ou cadenas si aucun tour n'est possible. */
  hub: "spin" | "locked" | "busy";
  onHubClick: () => void;
  onSpinEnd: () => void;
}

export function RouletteWheel({
  rotation,
  spinning,
  covers,
  highlight,
  hub,
  onHubClick,
  onSpinEnd,
}: RouletteWheelProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[440px] select-none">
      {/* Halo */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-6 rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, rgb(var(--color-domain) / 0.45), transparent 65%)" }}
      />

      {/* Jante + ampoules (fixes : seule la roue intérieure tourne) */}
      <div
        className="absolute inset-0 rounded-full border-2 border-domain-light/40 p-[5%] shadow-[0_0_40px_-8px_rgb(var(--color-domain)/0.8),inset_0_0_30px_rgb(0_0_0/0.6)]"
        style={{
          background:
            "radial-gradient(circle, rgb(var(--color-void-800)) 60%, rgb(var(--color-domain-dark)) 100%)",
        }}
      >
        {Array.from({ length: 24 }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className="absolute inset-0"
            style={{ transform: `rotate(${i * 15}deg)` }}
          >
            <span
              className={`absolute left-1/2 top-[1.6%] h-[2.2%] w-[2.2%] -translate-x-1/2 rounded-full ${
                spinning ? "animate-pulse" : ""
              }`}
              style={{
                background: i % 2 ? "rgb(var(--color-cursed-light))" : "rgb(var(--color-domain-light))",
                boxShadow: `0 0 8px ${i % 2 ? "rgb(var(--color-cursed-light))" : "rgb(var(--color-domain-light))"}`,
                animationDelay: `${(i % 4) * 120}ms`,
              }}
            />
          </span>
        ))}

        {/* Roue */}
        <motion.div
          className="relative h-full w-full overflow-hidden rounded-full border-4 border-void-900 shadow-[inset_0_0_40px_rgb(0_0_0/0.55)]"
          style={{ background: WHEEL_BACKGROUND }}
          initial={false}
          animate={{ rotate: rotation }}
          transition={{
            duration: reduceMotion ? 0.6 : 5.2,
            ease: [0.12, 0.72, 0.16, 1],
          }}
          onAnimationComplete={onSpinEnd}
        >
          <span aria-hidden className="absolute inset-0" style={{ background: SEPARATORS }} />
          {ROULETTE_SLOTS.map((slot, i) => (
            <div
              key={slot.id}
              className="absolute inset-0"
              style={{ transform: `rotate(${i * SLICE}deg)` }}
            >
              <div
                className={`absolute left-1/2 top-[5%] flex w-[22%] -translate-x-1/2 flex-col items-center text-center transition-[filter] duration-500 ${
                  highlight !== null && highlight !== i ? "brightness-50" : ""
                }`}
              >
                <SlotFace slot={slot} covers={covers} />
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Pointeur */}
      <div aria-hidden className="absolute left-1/2 top-[-3%] z-10 -translate-x-1/2">
        <svg viewBox="0 0 40 56" className="h-12 w-9 drop-shadow-[0_4px_10px_rgb(0_0_0/0.6)] sm:h-14 sm:w-10">
          <path
            d="M20 54 5 22a15 15 0 1 1 30 0Z"
            fill="rgb(var(--color-domain))"
            stroke="rgb(var(--color-domain-light))"
            strokeWidth="2"
          />
          <circle cx="20" cy="18" r="7" fill="rgb(var(--color-void-900))" />
          <circle cx="20" cy="18" r="3.2" fill="rgb(var(--color-cursed-light))" />
        </svg>
      </div>

      {/* Moyeu */}
      <button
        type="button"
        onClick={onHubClick}
        disabled={hub !== "spin"}
        aria-label={hub === "locked" ? "Roue verrouillée" : "Tourner la roue"}
        className="absolute left-1/2 top-1/2 z-10 grid h-[22%] w-[22%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-domain-light/50 font-display text-[11px] font-black uppercase tracking-widest text-white shadow-[0_0_30px_rgb(var(--color-domain)/0.7)] transition-transform enabled:hover:scale-105 disabled:cursor-default sm:text-xs"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, rgb(var(--color-domain-light)), rgb(var(--color-domain)) 45%, rgb(var(--color-domain-dark)))",
        }}
      >
        <span className="grid h-[62%] w-[62%] place-items-center rounded-full bg-void-900/85">
          {hub === "locked" ? (
            <LockIcon />
          ) : hub === "busy" ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            "Spin"
          )}
        </span>
      </button>
    </div>
  );
}

/** Contenu d'une part : montant, affiche de booster ou carte mystère. */
function SlotFace({
  slot,
  covers,
}: {
  slot: RouletteSlot;
  covers: Partial<Record<BoosterKind, CardView | null>>;
}) {
  if (slot.kind === "coins") {
    return (
      <>
        <CoinIcon className="h-5 w-5 text-amber-300 drop-shadow sm:h-6 sm:w-6" />
        <span className="mt-0.5 font-display text-sm font-black leading-none text-white drop-shadow sm:text-lg">
          {slot.amount >= 1000 ? `${slot.amount / 1000}K` : slot.amount}
        </span>
        <span className="text-[7px] font-bold uppercase tracking-widest text-white/60 sm:text-[8px]">
          coins
        </span>
      </>
    );
  }

  if (slot.kind === "card") {
    return (
      <>
        <span className="grid aspect-[3/4] w-[62%] place-items-center rounded-[4px] border-2 border-cursed-light/80 bg-void-900/80 font-display text-base font-black text-cursed-light shadow-lg sm:text-xl">
          ?
        </span>
        <span className="mt-1 text-[7px] font-black uppercase tracking-widest text-white sm:text-[8px]">
          Carte
        </span>
      </>
    );
  }

  const def = BOOSTERS[slot.booster];
  const cover = covers[slot.booster];
  return (
    <>
      <span
        className="relative block aspect-[3/4] w-[62%] overflow-hidden rounded-[4px] border-2 shadow-lg"
        style={{ borderColor: def.accent, boxShadow: `0 0 10px ${def.accent}88` }}
      >
        {cover ? (
          <CharacterImage
            character={{ name: cover.name, ...(cover.image ? { image: cover.image } : {}) }}
          />
        ) : (
          <span className="grid h-full w-full place-items-center bg-void-900" style={{ color: def.accent }}>
            <PackIcon className="h-6 w-6" />
          </span>
        )}
        <span
          aria-hidden
          className="absolute inset-x-0 top-1/3 h-2 -rotate-12"
          style={{ background: `linear-gradient(90deg, transparent, ${def.accent}88, transparent)` }}
        />
      </span>
      <span
        className="mt-1 font-display text-[8px] font-black uppercase leading-none tracking-wider drop-shadow sm:text-[10px]"
        style={{ color: slot.booster === "simple" ? "#fff" : def.accent }}
      >
        {def.label.replace("Booster ", "")}
      </span>
      <span className="text-[6px] font-bold uppercase tracking-widest text-white/60 sm:text-[7px]">
        pack
      </span>
    </>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
