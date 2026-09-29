"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CoinIcon } from "@/components/progress/CoinWallet";
import {
  ROULETTE_BETS,
  MAX_BET_SPOTS,
  WHEEL_ORDER,
  pocketColor,
  type RouletteSpinResult,
} from "@/lib/casino/roulette";
import { spinRouletteAction } from "@/lib/casino/roulette-actions";
import {
  CHIP_VALUES,
  RouletteBoard,
  chipStyleFor,
  formatChip,
} from "./roulette/RouletteBoard";
import { RouletteWheelEU, SLICE, type WheelSpin } from "./roulette/RouletteWheelEU";

/**
 * ROULETTE EUROPÉENNE.
 *
 * On pose des jetons sur le tapis (autant qu'on veut, où l'on veut), puis on
 * lance. Le serveur valide chaque emplacement, débite le total, tire le numéro
 * et règle ; la roue ne fait que rejoindre le numéro renvoyé — même principe que
 * la roue de la boutique (components/roulette/RouletteSection.tsx). L'aléa
 * visuel (tours en plus, position de départ) est cosmétique : il ne touche
 * jamais au numéro.
 */

type Bets = Record<string, number>;

const SPIN_S = 6.2;
const HISTORY_MAX = 18;

const COLOR_CLASS: Record<ReturnType<typeof pocketColor>, string> = {
  green: "bg-emerald-600 text-white",
  red: "bg-red-600 text-white",
  black: "bg-zinc-900 text-white border border-white/15",
};

const mod = (n: number, m: number) => ((n % m) + m) % m;
const sum = (bets: Bets) => Object.values(bets).reduce((a, b) => a + b, 0);

interface SessionStats {
  spins: number;
  wins: number;
  best: number;
  net: number;
}

export function RouletteGame({
  initialCoins,
  minBet,
}: {
  initialCoins: number;
  minBet: number;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [coins, setCoins] = useState(initialCoins);
  const [chip, setChip] = useState<number>(() =>
    [...CHIP_VALUES].reverse().find((v) => v <= Math.max(minBet, 25) && v <= initialCoins) ?? 1,
  );
  const [bets, setBets] = useState<Bets>({});
  const [undoStack, setUndoStack] = useState<Bets[]>([]);
  const [lastBets, setLastBets] = useState<Bets | null>(null);
  const [eraser, setEraser] = useState(false);
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const [wheel, setWheel] = useState<WheelSpin>({ id: 0, wheel: 0, ball: 0, duration: 0 });
  const [spinning, setSpinning] = useState(false);
  const [pending, setPending] = useState<{ result: RouletteSpinResult; coins: number } | null>(null);
  const [result, setResult] = useState<RouletteSpinResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [stats, setStats] = useState<SessionStats>({ spins: 0, wins: 0, best: 0, net: 0 });

  const busy = useRef(false);

  useEffect(() => () => router.refresh(), [router]);

  const total = sum(bets);
  const locked = spinning;

  const commit = useCallback(
    (next: Bets) => {
      setUndoStack((stack) => [...stack.slice(-49), bets]);
      setBets(next);
      setResult(null);
      setNotice(null);
      setError(null);
    },
    [bets],
  );

  const place = (key: string) => {
    if (eraser) return remove(key);
    if (total + chip > coins) {
      setNotice(`Il ne te reste que ${(coins - total).toLocaleString("fr-FR")} coins à miser.`);
      return;
    }
    if (!(key in bets) && Object.keys(bets).length >= MAX_BET_SPOTS) {
      setNotice(`${MAX_BET_SPOTS} emplacements maximum par tour.`);
      return;
    }
    commit({ ...bets, [key]: (bets[key] ?? 0) + chip });
  };

  const remove = (key: string) => {
    const current = bets[key];
    if (!current) return;
    const next = { ...bets };
    const left = current - chip;
    if (left > 0) next[key] = left;
    else delete next[key];
    commit(next);
  };

  const undo = () => {
    const previous = undoStack.at(-1);
    if (previous === undefined) return;
    setUndoStack((stack) => stack.slice(0, -1));
    setBets(previous);
  };

  const clear = () => total > 0 && commit({});

  const double = () => {
    if (total === 0) return;
    if (total * 2 > coins) {
      setNotice("Pas assez de coins pour doubler.");
      return;
    }
    commit(Object.fromEntries(Object.entries(bets).map(([k, v]) => [k, v * 2])));
  };

  const rebet = () => {
    if (!lastBets) return;
    if (sum(lastBets) > coins) {
      setNotice("Pas assez de coins pour remiser.");
      return;
    }
    commit({ ...lastBets });
  };

  const spin = () => {
    if (busy.current || total === 0) return;
    if (total < minBet) {
      setNotice(`Mise minimale sur le tapis : ${minBet.toLocaleString("fr-FR")} coins.`);
      return;
    }
    busy.current = true;
    setError(null);
    setNotice(null);
    setResult(null);
    setSpinning(true);

    const placed = bets;
    void (async () => {
      const response = await spinRouletteAction(
        Object.entries(placed).map(([key, amount]) => ({ key, amount })),
      );
      if (!response.ok) {
        setError(response.error);
        setSpinning(false);
        busy.current = false;
        return;
      }

      // Les jetons quittent le solde affiché ; les gains arrivent à l'arrêt.
      setCoins((c) => c - response.spin.totalBet);
      setLastBets(placed);
      setBets({});
      setUndoStack([]);

      const index = WHEEL_ORDER.indexOf(response.spin.pocket);
      const duration = reduceMotion ? 1 : SPIN_S;
      setWheel((prev) => {
        const wheelEnd = prev.wheel + 720 + 60 + Math.random() * 240;
        const want = wheelEnd + index * SLICE;
        const ballStart = prev.ball - 360 * 5;
        const ballEnd = ballStart - mod(ballStart - want, 360);
        return { id: prev.id + 1, wheel: wheelEnd, ball: ballEnd, duration };
      });
      setPending({ result: response.spin, coins: response.coins });
    })();
  };

  const onSpinEnd = () => {
    if (!pending) return;
    const { result: outcome, coins: balance } = pending;
    setPending(null);
    setResult(outcome);
    setCoins(balance);
    setSpinning(false);
    busy.current = false;
    setHistory((past) => [outcome.pocket, ...past].slice(0, HISTORY_MAX));
    setStats((past) => ({
      spins: past.spins + 1,
      wins: past.wins + (outcome.payout > 0 ? 1 : 0),
      best: Math.max(past.best, outcome.net),
      net: past.net + outcome.net,
    }));
  };

  const hovered = hoverKey ? ROULETTE_BETS.get(hoverKey) : null;
  const needsAuth = error !== null && error.startsWith("Connecte-toi");
  const available = coins - total;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
      <div className="mb-4 flex justify-end">
        <Link
          href="/casino"
          className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white/55 transition hover:border-cursed/40 hover:text-cursed-light"
        >
          Quitter la table
        </Link>
      </div>

      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center"
      >
        <h1 className="font-display text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
          Roulette
        </h1>
        <p className="mx-auto mt-3 max-w-md text-balance leading-relaxed text-white/55">
          Faites vos jeux. Plein, cheval, carré, rouge ou noir — la bille décide.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
          <Rule>Européenne · un seul zéro</Rule>
          <Rule>Plein 35:1</Rule>
          <Rule>Mise min. {minBet.toLocaleString("fr-FR")}</Rule>
        </div>
      </motion.header>

      {/* ── Roue + panneau ── */}
      <div className="mt-8 grid items-center gap-8 md:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="relative mx-auto w-full max-w-[420px]">
          <RouletteWheelEU
            spin={wheel}
            highlight={spinning ? null : result?.pocket ?? null}
            onSpinEnd={onSpinEnd}
          />
        </div>

        <div className="flex flex-col gap-4">
          {/* Numéro sorti / état */}
          <div className="min-h-[124px]">
            <AnimatePresence mode="wait">
              {spinning ? (
                <motion.p
                  key="spin"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pt-8 text-center font-display text-lg font-black uppercase tracking-[0.3em] text-white/50"
                >
                  Rien ne va plus…
                </motion.p>
              ) : result ? (
                <motion.div
                  key={`r-${stats.spins}`}
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  role="status"
                  className={`flex items-center gap-4 rounded-2xl border bg-void-900 p-4 ${
                    result.payout > 0 ? "border-emerald-400/45" : "border-cursed/40"
                  }`}
                >
                  <span
                    className={`grid h-20 w-20 shrink-0 place-items-center rounded-full font-serif text-4xl font-black shadow-lg ${COLOR_CLASS[result.color]}`}
                  >
                    {result.pocket}
                  </span>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-white/50">
                      {result.pocket === 0
                        ? "Zéro"
                        : `${result.color === "red" ? "Rouge" : "Noir"} · ${result.pocket % 2 === 0 ? "Pair" : "Impair"} · ${result.pocket <= 18 ? "Manque" : "Passe"}`}
                    </p>
                    <p
                      className={`mt-1 flex items-center gap-1.5 font-display text-3xl font-black tabular-nums ${
                        result.net >= 0 ? "text-amber-300" : "text-cursed-light"
                      }`}
                    >
                      <CoinIcon className="h-6 w-6" />
                      {result.net > 0 ? "+" : ""}
                      {result.net.toLocaleString("fr-FR")}
                    </p>
                    <p className="text-xs text-white/40">
                      Misé {result.totalBet.toLocaleString("fr-FR")} · rendu{" "}
                      {result.payout.toLocaleString("fr-FR")}
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.p
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pt-8 text-center font-display text-lg font-black uppercase tracking-[0.3em] text-white/40"
                >
                  Faites vos jeux
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Historique */}
          {history.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {history.map((n, i) => (
                <li
                  key={`${stats.spins - i}`}
                  className={`grid h-8 w-8 place-items-center rounded-full text-xs font-black ${COLOR_CLASS[pocketColor(n)]} ${
                    i === 0 ? "ring-2 ring-amber-300" : "opacity-80"
                  }`}
                >
                  {n}
                </li>
              ))}
            </ul>
          )}

          {stats.spins > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Tours" value={stats.spins.toLocaleString("fr-FR")} />
              <Stat label="Gagnants" value={stats.wins.toLocaleString("fr-FR")} />
              <Stat label="Meilleur" value={`${stats.best > 0 ? "+" : ""}${stats.best.toLocaleString("fr-FR")}`} />
              <Stat
                label="Bilan"
                value={`${stats.net > 0 ? "+" : ""}${stats.net.toLocaleString("fr-FR")}`}
                tone={stats.net >= 0 ? "good" : "bad"}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Tapis ── */}
      <section className="mt-8 rounded-3xl border border-amber-900/60 bg-gradient-to-b from-amber-950 to-[#2a1406] p-2 shadow-[inset_0_2px_0_rgb(255_255_255/0.08),0_30px_60px_-30px_rgb(0_0_0/0.9)] sm:p-3">
        <div className="overflow-x-auto">
          <div className="min-w-[680px]">
            <RouletteBoard
              bets={bets}
              settled={result?.bets ?? null}
              winning={spinning ? null : result?.pocket ?? null}
              disabled={locked}
              onPlace={place}
              onRemove={remove}
              onHover={setHoverKey}
            />
          </div>
        </div>
        <p className="mt-2 h-5 text-center text-xs text-amber-100/60">
          {hovered
            ? `${hovered.label} · paie ${hovered.payout}:1${bets[hovered.key] ? ` · misé ${bets[hovered.key]!.toLocaleString("fr-FR")}` : ""}`
            : "Clic : poser un jeton · clic droit : en retirer · traits et coins : chevaux, carrés, transversales"}
        </p>
      </section>

      {/* ── Rack de jetons + commandes ── */}
      <section className="mt-4 flex flex-col items-center gap-4 lg:flex-row lg:justify-between">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {CHIP_VALUES.map((value) => {
            const style = chipStyleFor(value);
            const selected = chip === value;
            const affordable = value <= coins;
            return (
              <button
                key={value}
                type="button"
                disabled={!affordable || locked}
                onClick={() => {
                  setChip(value);
                  setEraser(false);
                }}
                aria-pressed={selected}
                aria-label={`Jeton de ${value}`}
                className={`grid h-12 w-12 place-items-center rounded-full text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-30 ${
                  selected && !eraser ? "-translate-y-1.5 ring-2 ring-amber-300 ring-offset-2 ring-offset-void-900" : "hover:-translate-y-0.5"
                }`}
                style={{
                  background: style.base,
                  color: style.text,
                  boxShadow: `inset 0 0 0 4px ${style.base}, inset 0 0 0 7px ${style.edge}, 0 6px 12px -4px rgb(0 0 0 / 0.7)`,
                }}
              >
                {formatChip(value)}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setEraser((v) => !v)}
            disabled={locked}
            aria-pressed={eraser}
            className={`rounded-full border px-3 py-2 text-[11px] font-black uppercase tracking-wider transition disabled:opacity-40 ${
              eraser
                ? "border-cursed bg-cursed/20 text-cursed-light"
                : "border-white/15 bg-white/[0.04] text-white/60 hover:text-white"
            }`}
          >
            Gomme
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Control onClick={undo} disabled={locked || undoStack.length === 0}>
            Annuler
          </Control>
          <Control onClick={clear} disabled={locked || total === 0}>
            Effacer
          </Control>
          <Control onClick={double} disabled={locked || total === 0}>
            Doubler
          </Control>
          <Control onClick={rebet} disabled={locked || total > 0 || !lastBets}>
            Remiser
          </Control>
        </div>
      </section>

      <section className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-6">
        <p className="flex items-center gap-4 text-sm text-white/50">
          <span>
            Sur le tapis{" "}
            <span className="font-black tabular-nums text-white">{total.toLocaleString("fr-FR")}</span>
          </span>
          <span className="flex items-center gap-1.5">
            En poche
            <span className="flex items-center gap-1 font-black tabular-nums text-amber-300">
              <CoinIcon className="h-4 w-4" />
              {available.toLocaleString("fr-FR")}
            </span>
          </span>
        </p>
        <button
          type="button"
          onClick={spin}
          disabled={locked || total === 0}
          className="rounded-full bg-cursed px-10 py-3 font-display text-base font-black uppercase tracking-[0.2em] text-white shadow-[0_10px_30px_-10px_rgb(var(--color-cursed))] transition hover:bg-cursed-light disabled:cursor-not-allowed disabled:opacity-40"
        >
          {spinning ? "…" : "Lancer la bille"}
        </button>
      </section>

      {(notice || error) && (
        <p className="mx-auto mt-4 max-w-lg rounded-xl border border-cursed/40 bg-cursed/10 px-4 py-3 text-center text-sm text-cursed-light">
          {error ?? notice}
          {needsAuth && (
            <>
              {" "}
              <Link href="/login" className="font-bold underline">
                Se reconnecter
              </Link>
            </>
          )}
        </p>
      )}

      <details className="mx-auto mt-10 max-w-2xl rounded-2xl border border-white/10 bg-void-800/60 px-5 py-4 text-sm text-white/55">
        <summary className="cursor-pointer font-display text-xs font-black uppercase tracking-[0.2em] text-white/60">
          Les mises et leurs paiements
        </summary>
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          <PayRow name="Plein (1 numéro)" pay="35:1" />
          <PayRow name="Cheval (2, sur un trait)" pay="17:1" />
          <PayRow name="Transversale (3, bord bas)" pay="11:1" />
          <PayRow name="Trio 0-1-2 / 0-2-3" pay="11:1" />
          <PayRow name="Carré (4, intersection)" pay="8:1" />
          <PayRow name="Premiers 4 (0-1-2-3)" pay="8:1" />
          <PayRow name="Sixain (6, coin bas)" pay="5:1" />
          <PayRow name="Douzaine / Colonne" pay="2:1" />
          <PayRow name="Rouge, Noir, Pair, Impair, Manque, Passe" pay="1:1" />
        </ul>
        <p className="mt-3 text-xs text-white/35">
          Sur le 0, toutes les chances simples sont perdues. L&apos;avantage de la
          maison est celui d&apos;une vraie roulette européenne : 1/37, soit 2,7 %.
        </p>
      </details>
    </main>
  );
}

function Control({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-wider text-white/70 transition hover:border-white/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function PayRow({ name, pay }: { name: string; pay: string }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-1.5">
      <span>{name}</span>
      <span className="font-display font-black tabular-nums text-amber-300">{pay}</span>
    </li>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-white/45">
      {children}
    </span>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  const color =
    tone === "good" ? "text-emerald-300" : tone === "bad" ? "text-cursed-light" : "text-white";
  return (
    <div className="rounded-xl border border-white/[0.08] bg-void-900/50 px-3 py-2.5 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{label}</p>
      <p className={`mt-1 font-display text-lg font-black tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
