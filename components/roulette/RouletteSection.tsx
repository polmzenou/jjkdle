"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { CardArt } from "@/components/cards/CardArt";
import { ChevronIcon } from "@/components/cards/CardIcons";
import { CoinIcon } from "@/components/progress/CoinWallet";
import { useUniverse } from "@/components/universe/UniverseProvider";
import { RouletteWheel } from "@/components/roulette/RouletteWheel";
import { spinRouletteAction } from "@/app/[universe]/shop/actions";
import { BOOSTERS, type BoosterKind } from "@/lib/cards/boosters";
import type { CardView } from "@/lib/cards/types";
import {
  PAID_SPIN_PRICE,
  ROULETTE_SLOTS,
  slotIndex,
  slotLabel,
  type RouletteSlot,
} from "@/lib/roulette/prizes";
import type { RouletteState, SpinOutcome } from "@/lib/roulette/types";

/**
 * Section ROULETTE de la boutique : la roue à gauche, le panneau d'état à
 * droite (titre de l'univers, lots, prochain tour gratuit, dernier gain).
 *
 * Déroulé d'un tour : server action (le serveur tire ET livre le lot) → la roue
 * tourne jusqu'à la case renvoyée → révélation → `router.refresh()` pour le
 * solde. Le refresh attend la fin de l'animation, sinon le solde de la nav
 * trahirait le lot avant que la roue ne s'arrête.
 */

const SLICE = 360 / ROULETTE_SLOTS.length;

/** Lots distincts pour la légende, du plus rare au plus banal. */
const LEGEND: RouletteSlot[] = (() => {
  const seen = new Set<string>();
  return [...ROULETTE_SLOTS]
    .sort((a, b) => a.weight - b.weight)
    .filter((s) => {
      const key = slotLabel(s);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
})();

/** Poids cumulés par libellé (les deux boosters simples ne font qu'un lot). */
const ODDS: { label: string; weight: number; slot: RouletteSlot }[] = LEGEND.map((slot) => ({
  label: slotLabel(slot),
  slot,
  weight: ROULETTE_SLOTS.filter((s) => slotLabel(s) === slotLabel(slot)).reduce(
    (sum, s) => sum + s.weight,
    0,
  ),
}));

interface RouletteSectionProps {
  state: RouletteState;
  coins: number;
  covers: Partial<Record<BoosterKind, CardView | null>>;
  /** Enchaîne sur l'animation d'ouverture de la boutique. */
  onOpenBooster: (boosterId: string) => void;
  /** Un achat/ouverture est en cours ailleurs dans la boutique. */
  busy: boolean;
}

export function RouletteSection({
  state,
  coins,
  covers,
  onOpenBooster,
  busy,
}: RouletteSectionProps) {
  const router = useRouter();
  const { labels } = useUniverse();
  const [pending, startTransition] = useTransition();

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [outcome, setOutcome] = useState<SpinOutcome | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Le booster gagné a déjà été ouvert : plus de bouton « Ouvrir » (un second
  // clic échouerait, l'ouverture est idempotente côté serveur).
  const [boosterOpened, setBoosterOpened] = useState(false);

  // Échéance du tour gratuit en horloge LOCALE, dérivée du délai calculé par
  // le serveur (l'horloge du visiteur peut être décalée : seul l'écoulement est
  // mesuré ici, même principe que <Countdown>).
  const [freeAt, setFreeAt] = useState(() => Date.now() + state.msUntilFree);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setFreeAt(Date.now() + state.msUntilFree);
  }, [state.msUntilFree]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = Math.max(0, freeAt - now);
  const freeAvailable = remaining === 0;
  const canPay = coins >= PAID_SPIN_PRICE;
  const locked = spinning || pending || busy;

  const spin = () => {
    if (locked) return;
    const paid = !freeAvailable;
    if (paid && !canPay) return;

    setError(null);
    setOutcome(null);
    setRevealed(false);
    setBoosterOpened(false);
    startTransition(async () => {
      const res = await spinRouletteAction(paid);
      if (!res.ok || !res.outcome) {
        setError(res.error ?? "La roue ne répond pas.");
        return;
      }
      const result = res.outcome;
      // Case i centrée à i×30° : la roue doit tourner de (360 − i×30) modulo un
      // tour, plus 6 tours complets de mise en scène et un léger décalage pour
      // ne pas s'arrêter pile au centre de la part à chaque fois.
      const jitter = (Math.random() - 0.5) * SLICE * 0.6;
      setRotation((current) => {
        const base = Math.ceil(current / 360) * 360 + 360 * 6;
        return base + ((360 - result.slotIndex * SLICE) % 360) + jitter;
      });
      setOutcome(result);
      setFreeAt(Date.now() + result.msUntilFree);
      setSpinning(true);
    });
  };

  const onSpinEnd = () => {
    if (!spinning) return;
    setSpinning(false);
    setRevealed(true);
    router.refresh();
  };

  const hub = pending || spinning ? "busy" : freeAvailable || canPay ? "spin" : "locked";
  const wonSlot = outcome && revealed ? ROULETTE_SLOTS[outcome.slotIndex] : null;

  const lastWin = useMemo(() => {
    const w = state.lastWin;
    if (!w) return null;
    const slot = ROULETTE_SLOTS[slotIndex(w.slotId)];
    if (!slot) return null;
    if (slot.kind === "card") {
      return w.coinsWon > 0
        ? `${w.cardName ?? "une carte"} (doublon → ${w.coinsWon.toLocaleString("fr-FR")} coins)`
        : (w.cardName ?? "une carte");
    }
    return slotLabel(slot);
  }, [state.lastWin]);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-domain/25 bg-void-900/80 px-5 py-8 shadow-[0_30px_80px_-40px_rgb(var(--color-domain)/0.8)] backdrop-blur sm:px-8 lg:px-10">
      {/* Décor : l'affiche du booster doré en filigrane, voile aux couleurs de l'univers */}
      {covers.gold?.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          aria-hidden
          alt=""
          src={covers.gold.image}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.12] grayscale"
        />
      )}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(110deg, rgb(var(--color-domain-dark) / 0.55), rgb(var(--color-void-900) / 0.4) 45%, rgb(var(--color-void-900) / 0.9))",
        }}
      />
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-domain via-cursed-light to-transparent"
      />

      <div className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <RouletteWheel
          rotation={rotation}
          spinning={spinning}
          covers={covers}
          highlight={revealed && outcome ? outcome.slotIndex : null}
          hub={hub}
          onHubClick={spin}
          onSpinEnd={onSpinEnd}
        />

        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-domain-light">
            <span aria-hidden className="h-px w-6 bg-gradient-to-r from-transparent to-domain-light/60" />
            {labels.rouletteKicker}
          </span>
          <h2 className="mt-3 font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
            {labels.rouletteTitle}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60">{labels.rouletteLead}</p>

          {/* Légende des lots */}
          <ul className="mt-5 flex flex-wrap gap-2">
            {LEGEND.map((slot) => (
              <li
                key={slot.id}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-void-800/70 py-1 pl-1.5 pr-3 text-xs font-bold text-white/85"
              >
                <LegendDot slot={slot} />
                {slot.kind === "coins" ? slot.amount.toLocaleString("fr-FR") : slotLabel(slot)}
              </li>
            ))}
          </ul>

          {/* État + action */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-void-900/70 p-5">
            {freeAvailable ? (
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-300">
                Tour gratuit disponible
              </p>
            ) : (
              <>
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-white/45">
                  Prochain tour gratuit dans
                </p>
                <p
                  suppressHydrationWarning
                  className="mt-1 font-display text-4xl font-black tabular-nums tracking-wider text-white"
                >
                  {formatClock(remaining)}
                </p>
              </>
            )}

            <button
              type="button"
              onClick={spin}
              disabled={locked || (!freeAvailable && !canPay)}
              className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-display text-sm font-black uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-45 ${
                freeAvailable
                  ? "bg-domain text-white shadow-glow enabled:hover:scale-[1.02]"
                  : "border border-amber-300/50 bg-amber-300/10 text-amber-300 enabled:hover:bg-amber-300/20"
              }`}
            >
              {spinning || pending ? (
                "La roue tourne…"
              ) : freeAvailable ? (
                "Tourner gratuitement"
              ) : (
                <>
                  Tourner maintenant — {PAID_SPIN_PRICE}
                  <CoinIcon className="h-4 w-4" />
                </>
              )}
            </button>
            {!freeAvailable && !canPay && (
              <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-wider text-white/30">
                Solde insuffisant
              </p>
            )}

            {error && (
              <p className="mt-3 rounded-lg border border-cursed/40 bg-cursed/10 px-3 py-2 text-sm text-cursed-light">
                {error}
              </p>
            )}

            {lastWin && !wonSlot && !pending && !spinning && (
              <p className="mt-4 border-t border-white/10 pt-3 text-sm text-white/55">
                Dernier gain : <span className="font-bold text-amber-300">{lastWin}</span>
              </p>
            )}

            <AnimatePresence>
              {wonSlot && outcome && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 border-t border-white/10 pt-4"
                >
                  <WinPanel
                    slot={wonSlot}
                    outcome={outcome}
                    opened={boosterOpened}
                    onOpenBooster={(id) => {
                      setBoosterOpened(true);
                      onOpenBooster(id);
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <details className="group/odds mt-4">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-domain-light transition-colors hover:text-white [&::-webkit-details-marker]:hidden">
              <ChevronIcon className="h-3 w-3 -rotate-90 transition-transform group-open/odds:rotate-0" />
              Taux de la roue
            </summary>
            <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 rounded-xl border border-white/10 bg-void-800/70 p-3 text-xs sm:grid-cols-2">
              {ODDS.map((o) => (
                <li key={o.label} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-white/75">
                    <LegendDot slot={o.slot} />
                    {o.label}
                  </span>
                  <span className="font-bold tabular-nums text-white">{o.weight} %</span>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </div>
    </section>
  );
}

/** Ce que le joueur vient de gagner. */
function WinPanel({
  slot,
  outcome,
  opened,
  onOpenBooster,
}: {
  slot: RouletteSlot;
  outcome: SpinOutcome;
  opened: boolean;
  onOpenBooster: (boosterId: string) => void;
}) {
  if (slot.kind === "card" && outcome.card) {
    const card = outcome.card;
    return (
      <div className="flex items-center gap-4">
        <div className="w-20 shrink-0">
          <CardArt card={card} glow />
        </div>
        <p className="text-sm text-white/70">
          Tu gagnes <span className="font-bold text-white">{card.name}</span> !
          {card.duplicate ? (
            <span className="mt-1 block text-amber-300">
              Déjà dans ta collection → +{outcome.coinsWon.toLocaleString("fr-FR")} coins
            </span>
          ) : (
            <span className="mt-1 block text-emerald-300">Nouvelle carte ajoutée à ta collection.</span>
          )}
        </p>
      </div>
    );
  }

  if (slot.kind === "booster" && outcome.boosterId) {
    const def = BOOSTERS[slot.booster];
    const boosterId = outcome.boosterId;
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/70">
          Tu gagnes un{" "}
          <span className="font-bold" style={{ color: def.accent }}>
            {def.label.toLowerCase()}
          </span>{" "}
          !
        </p>
        {opened ? (
          <span className="text-xs font-bold uppercase tracking-wider text-white/40">
            Ouvert
          </span>
        ) : (
        <button
          type="button"
          onClick={() => onOpenBooster(boosterId)}
          className="rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors hover:bg-white/10"
          style={{ borderColor: `${def.accent}90`, color: def.accent }}
        >
          Ouvrir maintenant
        </button>
        )}
      </div>
    );
  }

  return (
    <p className="flex items-center gap-2 text-sm text-white/70">
      Tu gagnes
      <span className="flex items-center gap-1 font-display text-xl font-black text-amber-300">
        {outcome.coinsWon.toLocaleString("fr-FR")}
        <CoinIcon className="h-5 w-5" />
      </span>
    </p>
  );
}

function LegendDot({ slot }: { slot: RouletteSlot }) {
  if (slot.kind === "coins") return <CoinIcon className="h-4 w-4 text-amber-300" />;
  const color = slot.kind === "card" ? "rgb(var(--color-cursed-light))" : BOOSTERS[slot.booster].accent;
  return (
    <span
      aria-hidden
      className="h-4 w-3 rounded-[3px] border"
      style={{ borderColor: color, background: `color-mix(in srgb, ${color} 55%, transparent)` }}
    />
  );
}

function formatClock(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
