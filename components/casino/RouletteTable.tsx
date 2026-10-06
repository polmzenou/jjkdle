"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CoinIcon } from "@/components/progress/CoinWallet";
import { CASINO_EVENTS, casinoChannel } from "@/lib/casino/events";
import { MAX_BET_SPOTS, ROULETTE_BETS, WHEEL_ORDER, pocketColor } from "@/lib/casino/roulette";
import {
  ROULETTE_BETTING_MS,
  ROULETTE_RECAP_MS,
  ROULETTE_SPIN_MS,
  sumBets,
  type RouletteTableView,
} from "@/lib/casino/roulette-table";
import {
  getRouletteTableAction,
  leaveRouletteTableAction,
  setRouletteBetsAction,
  tickRouletteAction,
  type RouletteTableResult,
} from "@/lib/casino/roulette-table-actions";
import { STUCK_MS } from "@/lib/casino/rules";
import { createPusherClient, isPusherClientConfigured } from "@/lib/pusher/client";
import { PhaseTimer, usePhaseCountdown } from "./PhaseTimer";
import {
  CHIP_VALUES,
  RouletteBoard,
  chipStyleFor,
  formatChip,
  type OtherBets,
} from "./roulette/RouletteBoard";
import { RigToggle } from "./roulette/RigToggle";
import { RouletteWheelEU, SLICE, type WheelSpin } from "./roulette/RouletteWheelEU";

/**
 * La TABLE DE ROULETTE À PLUSIEURS.
 *
 * Mes jetons sont posés LOCALEMENT tout de suite (le tapis doit répondre au
 * clic), puis envoyés au serveur par paquets : l'état complet de mes mises part
 * ~250 ms après le dernier clic, une requête à la fois. Le serveur débite la
 * différence et diffuse le tapis aux autres, qui voient mes jetons en
 * transparence avec mon pseudo dessous.
 *
 * Le tirage, lui, est entièrement serveur (cf. lib/casino/roulette-engine.ts) :
 * à l'entrée en SETTLED le numéro est déjà tiré et les gains déjà versés, la
 * roue ne fait que le rejoindre.
 */

type Bets = Record<string, number>;

const SPIN_S = 6.2;
const SYNC_DELAY_MS = 250;

const COLOR_CLASS: Record<ReturnType<typeof pocketColor>, string> = {
  green: "bg-emerald-600 text-white",
  red: "bg-red-600 text-white",
  black: "bg-zinc-900 text-white border border-white/15",
};

const mod = (n: number, m: number) => ((n % m) + m) % m;
const sameBets = (a: Bets, b: Bets) =>
  Object.keys(a).length === Object.keys(b).length &&
  Object.entries(a).every(([k, v]) => b[k] === v);

export function RouletteTable({
  initialTable,
  pusherReady,
  rigged,
}: {
  initialTable: RouletteTableView;
  pusherReady: boolean;
  /** Défini pour un ADMIN seulement : état du truquage. */
  rigged?: boolean;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [, startTransition] = useTransition();
  const myUserId = initialTable.seats.find((s) => s.isYou)?.userId ?? null;

  const [table, setTable] = useState(initialTable);
  const tableRef = useRef(table);
  tableRef.current = table;

  const me = table.seats.find((s) => s.isYou) ?? null;

  // ── Mes jetons (vérité locale pendant les mises) ──────────────────────
  const [myBets, setMyBets] = useState<Bets>(() => me?.bets ?? {});
  const [ready, setReady] = useState(() => me?.ready ?? false);
  const [undoStack, setUndoStack] = useState<Bets[]>([]);
  const [lastBets, setLastBets] = useState<Bets | null>(null);
  const [chip, setChip] = useState<number>(() =>
    [...CHIP_VALUES].reverse().find((v) => v <= Math.max(initialTable.minBet, 25) && v <= initialTable.yourCoins) ?? 1,
  );
  const [eraser, setEraser] = useState(false);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const myBetsRef = useRef(myBets);
  myBetsRef.current = myBets;
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const dirty = useRef(false);
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundRef = useRef(table.round);
  const roundBetsRef = useRef<Bets>(myBets);

  // ── Roue ──────────────────────────────────────────────────────────────
  const [wheel, setWheel] = useState<WheelSpin>({ id: 0, wheel: 0, ball: 0, duration: 0 });
  const [spinning, setSpinning] = useState(false);
  const [coinsAtSpin, setCoinsAtSpin] = useState<number | null>(null);
  const animatedRound = useRef<number | null>(null);
  /** Solde affiché pendant les mises : celui qu'on garde tant que la bille roule. */
  const bettingCoins = useRef<number | null>(null);

  /**
   * Applique un snapshot. Les diffusions Pusher sont ANONYMES : on y réinjecte
   * mon `isYou` et on garde mon solde. Un snapshot plus vieux que celui affiché
   * (versions croisées) est ignoré.
   */
  const applyView = useCallback(
    (view: RouletteTableView, self: boolean) => {
      setTable((current) => {
        if (view.version < current.version) {
          return self ? { ...current, yourCoins: view.yourCoins } : current;
        }
        return {
          ...view,
          yourCoins: self ? view.yourCoins : current.yourCoins,
          seats: view.seats.map((s) => ({ ...s, isYou: s.userId === myUserId })),
        };
      });
    },
    [myUserId],
  );

  const handle = useCallback(
    (result: RouletteTableResult) => {
      if (result.table) applyView(result.table, true);
      if (!result.ok) {
        if (result.needsAuth) router.push("/login");
        else if (result.error.includes("n'existe plus")) router.push("/casino/roulette");
      }
      return result;
    },
    [applyView, router],
  );

  // ── Envoi des jetons ──────────────────────────────────────────────────
  const flush = useCallback(async () => {
    if (inFlight.current || !dirty.current) return;
    inFlight.current = true;
    dirty.current = false;
    const bets = myBetsRef.current;
    const result = handle(
      await setRouletteBetsAction(
        tableRef.current.code,
        Object.entries(bets).map(([key, amount]) => ({ key, amount })),
        tableRef.current.round,
        readyRef.current,
      ),
    );
    inFlight.current = false;
    if (result.ok) {
      roundBetsRef.current = bets;
    } else {
      setError(result.error);
      // Refusé : le tapis reprend ce que le serveur a vraiment enregistré.
      if (!dirty.current && result.table) {
        const mine = result.table.seats.find((s) => s.userId === myUserId);
        setMyBets(mine?.bets ?? {});
        setReady(mine?.ready ?? false);
      }
    }
    if (dirty.current) void flush();
  }, [handle, myUserId]);

  const schedule = useCallback(() => {
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SYNC_DELAY_MS);
  }, [flush]);

  // ── Réconciliation à chaque snapshot ──────────────────────────────────
  useEffect(() => {
    if (table.round !== roundRef.current) {
      // Nouveau tour : le tapis est vide, les jetons d'avant deviennent « Remiser ».
      roundRef.current = table.round;
      if (Object.keys(roundBetsRef.current).length > 0) setLastBets(roundBetsRef.current);
      roundBetsRef.current = {};
      dirty.current = false;
      setUndoStack([]);
      setError(null);
      setNotice(null);
    }
    if (table.phase === "BETTING" && !dirty.current && !inFlight.current) {
      const mine = table.seats.find((s) => s.isYou);
      const serverBets = mine?.bets ?? {};
      setMyBets((local) => (sameBets(local, serverBets) ? local : serverBets));
      setReady(mine?.ready ?? false);
    }
    // Évincé (AFK) ou table fermée sous mes pieds.
    if (!table.seats.some((s) => s.isYou)) router.push("/casino/roulette");
  }, [table, router]);

  // ── Le tick (cf. BlackjackTable) ──────────────────────────────────────
  const ticking = useRef(false);
  const tick = useCallback(async () => {
    if (ticking.current) return;
    ticking.current = true;
    try {
      handle(await tickRouletteAction(tableRef.current.code));
    } finally {
      ticking.current = false;
    }
  }, [handle]);

  const remaining = usePhaseCountdown(table.phaseDeadlineMs, table.serverNowMs, tick);

  useEffect(() => {
    if (table.phaseDeadlineMs !== null) return;
    const id = setTimeout(tick, STUCK_MS + 1_000);
    return () => clearTimeout(id);
  }, [table.phaseDeadlineMs, tick]);

  // ── Temps réel ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pusherReady || !isPusherClientConfigured()) return;
    const client = createPusherClient();
    const name = casinoChannel(initialTable.code);
    const channel = client.subscribe(name);

    channel.bind(CASINO_EVENTS.tableState, (payload: { table: RouletteTableView }) => {
      applyView(payload.table, false);
    });
    channel.bind(CASINO_EVENTS.tableSync, () => {
      void getRouletteTableAction(initialTable.code).then(handle);
    });
    channel.bind("pusher:subscription_error", () => {
      setError("Connexion temps réel impossible. Recharge la page.");
    });

    return () => {
      channel.unbind_all();
      client.unsubscribe(name);
      client.disconnect();
    };
  }, [pusherReady, initialTable.code, applyView, handle]);

  // ── Lancer de la bille (le numéro est déjà connu) ─────────────────────
  useEffect(() => {
    if (table.phase !== "SETTLED" || table.pocket === null) return;
    if (animatedRound.current === table.round) return;
    animatedRound.current = table.round;

    // Arrivé en cours de lancer (rechargement) : la bille finit plus vite.
    const settleStart =
      (table.phaseDeadlineMs ?? table.serverNowMs) - ROULETTE_SPIN_MS - ROULETTE_RECAP_MS;
    const elapsed = Math.max(0, table.serverNowMs - settleStart) / 1000;
    const duration = reduceMotion ? 1 : Math.max(1, SPIN_S - elapsed);

    // Le solde affiché reste celui d'avant les gains tant que la bille roule.
    setCoinsAtSpin(bettingCoins.current ?? table.yourCoins);

    const index = WHEEL_ORDER.indexOf(table.pocket);
    setWheel((prev) => {
      const wheelEnd = prev.wheel + 720 + 60 + Math.random() * 240;
      const want = wheelEnd + index * SLICE;
      const ballStart = prev.ball - 360 * 5;
      const ballEnd = ballStart - mod(ballStart - want, 360);
      return { id: prev.id + 1, wheel: wheelEnd, ball: ballEnd, duration };
    });
    setSpinning(true);
  }, [table, reduceMotion]);

  const onSpinEnd = () => {
    if (!spinning) return;
    setSpinning(false);
    setCoinsAtSpin(null);
    // Mon solde, gains compris (une diffusion Pusher ne le porte pas).
    void getRouletteTableAction(tableRef.current.code).then(handle);
  };

  // ── Commandes du tapis ────────────────────────────────────────────────
  const serverTotal = me?.total ?? 0;
  const total = sumBets(myBets);
  const budget = table.yourCoins + (table.phase === "BETTING" ? serverTotal : 0);
  const locked =
    table.phase !== "BETTING" || table.phaseDeadlineMs === null || remaining === 0;

  const commit = (next: Bets) => {
    setUndoStack((stack) => [...stack.slice(-49), myBets]);
    setMyBets(next);
    setReady(false);
    setNotice(null);
    setError(null);
    schedule();
  };

  const place = (key: string) => {
    if (locked) return;
    if (eraser) return remove(key);
    if (total + chip > budget) {
      setNotice(`Il ne te reste que ${Math.max(0, budget - total).toLocaleString("fr-FR")} coins à miser.`);
      return;
    }
    if (!(key in myBets) && Object.keys(myBets).length >= MAX_BET_SPOTS) {
      setNotice(`${MAX_BET_SPOTS} emplacements maximum par tour.`);
      return;
    }
    commit({ ...myBets, [key]: (myBets[key] ?? 0) + chip });
  };

  const remove = (key: string) => {
    if (locked) return;
    const current = myBets[key];
    if (!current) return;
    const next = { ...myBets };
    const left = current - chip;
    if (left > 0) next[key] = left;
    else delete next[key];
    commit(next);
  };

  const undo = () => {
    const previous = undoStack.at(-1);
    if (previous === undefined || locked) return;
    setUndoStack((stack) => stack.slice(0, -1));
    setMyBets(previous);
    setReady(false);
    schedule();
  };

  const clear = () => total > 0 && commit({});

  const double = () => {
    if (total === 0) return;
    if (total * 2 > budget) return setNotice("Pas assez de coins pour doubler.");
    commit(Object.fromEntries(Object.entries(myBets).map(([k, v]) => [k, v * 2])));
  };

  const rebet = () => {
    if (!lastBets) return;
    if (sumBets(lastBets) > budget) return setNotice("Pas assez de coins pour remiser.");
    commit({ ...lastBets });
  };

  const toggleReady = () => {
    if (locked) return;
    setReady((r) => !r);
    readyRef.current = !ready;
    schedule();
  };

  const leave = () => {
    startTransition(async () => {
      if (timer.current) clearTimeout(timer.current);
      await leaveRouletteTableAction(table.code);
      router.push("/casino/roulette");
      router.refresh();
    });
  };

  // ── Affichage ─────────────────────────────────────────────────────────
  const others: OtherBets[] = useMemo(
    () =>
      table.seats
        .filter((s) => !s.isYou && Object.keys(s.bets).length > 0)
        .map((s) => ({ username: s.username, bets: s.bets })),
    [table.seats],
  );

  const myResult =
    table.phase === "SETTLED" && me?.lastResult?.round === table.round ? me.lastResult : null;
  const showResult = table.phase === "SETTLED" && !spinning && table.pocket !== null;
  const boardBets = table.phase === "BETTING" ? myBets : spinning ? (me?.bets ?? {}) : {};
  const shownCoins =
    coinsAtSpin ?? (table.phase === "BETTING" ? table.yourCoins - (total - serverTotal) : table.yourCoins);
  if (table.phase === "BETTING") bettingCoins.current = shownCoins;
  const hovered = hoverKey ? ROULETTE_BETS.get(hoverKey) : null;
  const pocket = table.pocket;

  const phaseLabel =
    table.phase === "BETTING"
      ? table.phaseDeadlineMs === null
        ? "Rien ne va plus"
        : "Faites vos jeux"
      : spinning
        ? "Rien ne va plus"
        : "Résultats";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
      {/* En-tête : phase, chrono, solde, sortie */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-cursed/30 bg-cursed/10 px-3 py-1.5 font-display text-xs font-black uppercase tracking-wider text-cursed-light">
            {phaseLabel}
          </span>
          <PhaseTimer
            remainingMs={remaining}
            totalMs={table.phase === "BETTING" ? ROULETTE_BETTING_MS : ROULETTE_SPIN_MS + ROULETTE_RECAP_MS}
            label="Table"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-black tabular-nums text-amber-300">
            <CoinIcon />
            {shownCoins.toLocaleString("fr-FR")}
          </span>
          <button
            type="button"
            onClick={leave}
            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white/55 transition hover:border-cursed/40 hover:text-cursed-light"
          >
            Quitter
          </button>
        </div>
      </header>

      {/* ── Roue + joueurs ── */}
      <div className="grid items-center gap-8 md:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="relative mx-auto w-full max-w-[380px]">
          <RigToggle rigged={rigged}>
            <RouletteWheelEU spin={wheel} highlight={showResult ? pocket : null} onSpinEnd={onSpinEnd} />
          </RigToggle>
        </div>

        <div className="flex flex-col gap-4">
          <div className="min-h-[104px]">
            <AnimatePresence mode="wait">
              {showResult && pocket !== null ? (
                <motion.div
                  key={`r-${table.round}`}
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  role="status"
                  className={`flex items-center gap-4 rounded-2xl border bg-void-900 p-4 ${
                    myResult && myResult.net > 0 ? "border-emerald-400/45" : "border-white/10"
                  }`}
                >
                  <span
                    className={`grid h-16 w-16 shrink-0 place-items-center rounded-full font-serif text-3xl font-black shadow-lg ${COLOR_CLASS[pocketColor(pocket)]}`}
                  >
                    {pocket}
                  </span>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-white/50">
                      {pocket === 0
                        ? "Zéro"
                        : `${pocketColor(pocket) === "red" ? "Rouge" : "Noir"} · ${pocket % 2 === 0 ? "Pair" : "Impair"} · ${pocket <= 18 ? "Manque" : "Passe"}`}
                    </p>
                    {myResult ? (
                      myResult.refunded ? (
                        <p className="mt-1 text-sm text-white/60">
                          Mise sous le minimum ({table.minBet.toLocaleString("fr-FR")}) : rendue.
                        </p>
                      ) : (
                        <p
                          className={`mt-1 flex items-center gap-1.5 font-display text-2xl font-black tabular-nums ${
                            myResult.net >= 0 ? "text-amber-300" : "text-cursed-light"
                          }`}
                        >
                          <CoinIcon className="h-5 w-5" />
                          {myResult.net > 0 ? "+" : ""}
                          {myResult.net.toLocaleString("fr-FR")}
                        </p>
                      )
                    ) : (
                      <p className="mt-1 text-sm text-white/40">Tu n&apos;avais rien misé.</p>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.p
                  key={spinning ? "spin" : "idle"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pt-8 text-center font-display text-lg font-black uppercase tracking-[0.3em] text-white/45"
                >
                  {spinning || table.phaseDeadlineMs === null ? "Rien ne va plus…" : "Faites vos jeux"}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {table.history.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {table.history.map((n, i) => (
                <li
                  key={`${table.round}-${i}`}
                  className={`grid h-8 w-8 place-items-center rounded-full text-xs font-black ${COLOR_CLASS[pocketColor(n)]} ${
                    i === 0 && !(spinning && table.phase === "SETTLED") ? "ring-2 ring-amber-300" : "opacity-80"
                  } ${spinning && i === 0 ? "invisible" : ""}`}
                >
                  {n}
                </li>
              ))}
            </ul>
          )}

          {/* Joueurs */}
          <ul className="grid gap-2 sm:grid-cols-2">
            {table.seats.map((seat) => {
              const result =
                showResult && seat.lastResult?.round === table.round ? seat.lastResult : null;
              const seatTotal = seat.isYou && table.phase === "BETTING" ? total : seat.total;
              const seatReady = seat.isYou ? ready : seat.ready;
              return (
                <li
                  key={seat.seat}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${
                    seat.isYou ? "border-cursed/40 bg-cursed/[0.07]" : "border-white/[0.08] bg-void-900/50"
                  } ${seat.leaving ? "opacity-50" : ""}`}
                >
                  <span className="min-w-0 truncate font-bold text-white">
                    {seat.username}
                    {seat.isYou && <span className="ml-1 text-xs font-semibold text-white/40">(toi)</span>}
                    <span className="ml-1.5 text-[10px] font-semibold text-white/35">niv. {seat.level}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs tabular-nums">
                    {result && !result.refunded ? (
                      <span className={`font-black ${result.net >= 0 ? "text-emerald-300" : "text-cursed-light"}`}>
                        {result.net > 0 ? "+" : ""}
                        {result.net.toLocaleString("fr-FR")}
                      </span>
                    ) : (
                      <span className="text-white/55">
                        {seatTotal > 0 ? seatTotal.toLocaleString("fr-FR") : "—"}
                      </span>
                    )}
                    {table.phase === "BETTING" && seatReady && (
                      <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-300">
                        prêt
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
            {Array.from({ length: Math.max(0, table.maxSeats - table.seats.length) }).map((_, i) => (
              <li
                key={`empty-${i}`}
                className="hidden rounded-xl border border-dashed border-white/[0.08] px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-white/20 sm:block"
              >
                Place libre
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Tapis ── */}
      <section className="mt-8 rounded-3xl border border-amber-900/60 bg-gradient-to-b from-amber-950 to-[#2a1406] p-2 shadow-[inset_0_2px_0_rgb(255_255_255/0.08),0_30px_60px_-30px_rgb(0_0_0/0.9)] sm:p-3">
        <div className="overflow-x-auto">
          <div className="min-w-[680px]">
            <RouletteBoard
              bets={boardBets}
              others={others}
              settled={showResult ? (myResult?.bets ?? null) : null}
              winning={showResult ? pocket : null}
              disabled={locked}
              onPlace={place}
              onRemove={remove}
              onHover={setHoverKey}
            />
          </div>
        </div>
        <p className="mt-2 h-5 text-center text-xs text-amber-100/60">
          {hovered
            ? `${hovered.label} · paie ${hovered.payout}:1${myBets[hovered.key] ? ` · misé ${myBets[hovered.key]!.toLocaleString("fr-FR")}` : ""}`
            : "Clic : poser un jeton · clic droit : en retirer · les jetons transparents sont ceux des autres joueurs"}
        </p>
      </section>

      {/* ── Rack de jetons + commandes ── */}
      <section className="mt-4 flex flex-col items-center gap-4 lg:flex-row lg:justify-between">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {CHIP_VALUES.map((value) => {
            const style = chipStyleFor(value);
            const selected = chip === value;
            return (
              <button
                key={value}
                type="button"
                disabled={value > budget || locked}
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
              eraser ? "border-cursed bg-cursed/20 text-cursed-light" : "border-white/15 bg-white/[0.04] text-white/60 hover:text-white"
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
        <p className="text-sm text-white/50">
          Sur le tapis{" "}
          <span className="font-black tabular-nums text-white">{total.toLocaleString("fr-FR")}</span>
          {total > 0 && total < table.minBet && (
            <span className="ml-2 text-xs text-cursed-light">
              (min. {table.minBet.toLocaleString("fr-FR")}, sinon rendu)
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={toggleReady}
          disabled={locked}
          className={`rounded-full px-10 py-3 font-display text-base font-black uppercase tracking-[0.2em] transition disabled:cursor-not-allowed disabled:opacity-40 ${
            ready
              ? "border border-emerald-400/50 bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/25"
              : "bg-cursed text-white shadow-[0_10px_30px_-10px_rgb(var(--color-cursed))] hover:bg-cursed-light"
          }`}
        >
          {ready ? "Prêt ✓" : total > 0 ? "Je suis prêt" : "Je passe"}
        </button>
      </section>
      <p className="mt-2 text-center text-xs text-white/35">
        La bille part à la fin du chrono, ou dès que tout le monde est prêt.
      </p>

      {(notice || error) && (
        <p className="mx-auto mt-4 max-w-lg rounded-xl border border-cursed/40 bg-cursed/10 px-4 py-3 text-center text-sm text-cursed-light">
          {error ?? notice}
        </p>
      )}

      <p className="mt-8 text-center text-[11px] text-white/25">
        Table {table.code} · tour #{table.round + 1}
      </p>
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
