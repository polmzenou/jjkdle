"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CoinIcon } from "@/components/progress/CoinWallet";
import {
  leaveTableAction,
  placeBetAction,
  playAction,
  tickTableAction,
  type CasinoResult,
} from "@/lib/casino/actions";
import { CASINO_EVENTS, casinoChannel, type TableStatePayload } from "@/lib/casino/events";
import { canDouble } from "@/lib/casino/hand";
import {
  BETTING_MS,
  DEALER_MS,
  DEAL_MS,
  RECAP_MS,
  STUCK_MS,
  TURN_MS,
} from "@/lib/casino/rules";
import type { CasinoPhaseValue, CasinoTableView, Move } from "@/lib/casino/types";
import { createPusherClient, isPusherClientConfigured } from "@/lib/pusher/client";
import { BetPad } from "./BetPad";
import { DealerArea } from "./DealerArea";
import { PhaseTimer, usePhaseCountdown } from "./PhaseTimer";
import { PlayerSeat } from "./PlayerSeat";

/**
 * LA TABLE de blackjack.
 *
 * Le serveur est autoritaire de bout en bout : ce composant n'applique jamais un
 * coup lui-même, il envoie une intention et affiche le snapshot renvoyé. Rien
 * n'est optimiste — une carte affichée est une carte réellement tirée en base.
 *
 * Trois sources font avancer l'affichage, par ordre d'autorité :
 *  1. le snapshot renvoyé par ma propre action (le plus frais, il porte mon solde) ;
 *  2. le snapshot Pusher diffusé aux autres joueurs ;
 *  3. le TICK, quand l'échéance de la phase tombe.
 *
 * ── Le tick, et pourquoi le client s'en charge ────────────────────────────
 * Vercel n'a ni tâche de fond ni cron : personne côté serveur ne peut « attendre
 * 20 secondes puis distribuer ». Ce sont donc les clients qui réclament
 * l'avancement à l'expiration du chrono. Ça n'ouvre aucune triche : le serveur
 * revérifie l'échéance et un seul appel l'emporte (cf. lib/casino/engine.ts).
 */

const PHASE_LABEL: Record<CasinoPhaseValue, string> = {
  BETTING: "Faites vos jeux",
  DEALING: "Distribution",
  PLAYER_TURNS: "Aux joueurs",
  DEALER: "Le croupier joue",
  SETTLED: "Résultats",
};

/** Durée nominale de chaque phase, pour dimensionner la barre de décompte. */
const PHASE_TOTAL: Record<CasinoPhaseValue, number> = {
  BETTING: BETTING_MS,
  DEALING: DEAL_MS,
  PLAYER_TURNS: TURN_MS,
  DEALER: DEALER_MS,
  SETTLED: RECAP_MS,
};

export function BlackjackTable({
  initialTable,
  pusherReady,
}: {
  initialTable: CasinoTableView;
  pusherReady: boolean;
}) {
  const router = useRouter();
  const [table, setTable] = useState(initialTable);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Le snapshot le plus récent, lisible depuis les callbacks sans les recréer
  // (un `useEffect` qui dépendrait de `table` se réabonnerait à chaque carte).
  const tableRef = useRef(table);
  tableRef.current = table;

  const me = table.seats.find((seat) => seat.isYou) ?? null;
  const myHand = me?.hands[me.activeHand] ?? null;
  const myTurn = me !== null && table.activeSeat === me.seat;

  /**
   * Applique un résultat d'action. Un snapshot venu de MON action l'emporte
   * toujours : il est plus frais et il porte mon solde, que la diffusion Pusher
   * (anonyme, canal partagé) ne contient pas.
   */
  const apply = useCallback(
    (result: CasinoResult) => {
      if (result.ok) {
        if (result.table) setTable(result.table);
        setError(null);
      } else {
        setError(result.error);
        if (result.needsAuth) router.push("/login");
      }
    },
    [router],
  );

  // ── Le tick ─────────────────────────────────────────────────────────────
  // Protégé contre les rafales : une seule requête en vol à la fois. Sans ça,
  // l'intervalle du décompte pourrait en lancer quatre par seconde sur une
  // table bloquée.
  const ticking = useRef(false);
  const tick = useCallback(async () => {
    if (ticking.current) return;
    ticking.current = true;
    try {
      const result = await tickTableAction(tableRef.current.code);
      // Un tick ne porte pas mon solde de façon fiable (il peut être gagné par
      // un autre client) : on prend l'état, il fait foi sur le reste.
      if (result.ok && result.table) setTable(result.table);
      if (!result.ok && result.error.includes("n'existe plus")) {
        router.push("/casino/blackjack");
      }
    } finally {
      ticking.current = false;
    }
  }, [router]);

  const remaining = usePhaseCountdown(
    table.phaseDeadlineMs,
    table.serverNowMs,
    tick,
  );

  /**
   * WATCHDOG. Une table sans échéance alors qu'elle devrait tourner est une
   * table dont le tick est mort avant d'écrire (timeout de fonction,
   * redéploiement). On la relance ; le serveur rejoue la transition depuis
   * l'état persisté, ce qui est sûr parce qu'elle est une fonction pure.
   *
   * Les phases où une table SOLO attend légitimement le joueur sont exclues.
   */
  useEffect(() => {
    if (table.phaseDeadlineMs !== null) return;
    const waitsForMe =
      table.mode === "SOLO" &&
      (table.phase === "BETTING" ||
        table.phase === "PLAYER_TURNS" ||
        table.phase === "SETTLED");
    if (waitsForMe) return;

    const id = setTimeout(tick, STUCK_MS + 1_000);
    return () => clearTimeout(id);
  }, [table.phaseDeadlineMs, table.mode, table.phase, tick]);

  // ── Temps réel ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pusherReady || !isPusherClientConfigured()) return;
    if (initialTable.mode === "SOLO") return; // personne d'autre à écouter

    const client = createPusherClient();
    const channel = client.subscribe(casinoChannel(initialTable.code));

    channel.bind(CASINO_EVENTS.tableState, (payload: TableStatePayload) => {
      // Le snapshot diffusé est ANONYME (canal partagé) : il ne porte ni mon
      // `isYou` ni mon solde. On les réinjecte depuis l'état local, sinon mon
      // siège se « dépersonnaliserait » à chaque coup joué par un autre.
      setTable((current) => ({
        ...payload.table,
        yourCoins: current.yourCoins,
        seats: payload.table.seats.map((seat) => ({
          ...seat,
          isYou: current.seats.some((s) => s.isYou && s.userId === seat.userId),
        })),
      }));
    });

    channel.bind("pusher:subscription_error", () => {
      setError("Connexion temps réel impossible. Recharge la page.");
    });

    return () => {
      channel.unbind_all();
      client.unsubscribe(casinoChannel(initialTable.code));
      client.disconnect();
    };
  }, [pusherReady, initialTable.code, initialTable.mode]);

  // ── Actions ─────────────────────────────────────────────────────────────

  const bet = (amount: number) => {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      apply(await placeBetAction(table.code, amount, table.version));
    });
  };

  const play = (move: Move) => {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      apply(await playAction(table.code, move, table.version));
    });
  };

  const leave = () => {
    startTransition(async () => {
      await leaveTableAction(table.code);
      router.push("/casino/blackjack");
      router.refresh();
    });
  };

  // Une table solo attend le joueur en SETTLED : c'est lui qui relance.
  const canRelaunch = table.mode === "SOLO" && table.phase === "SETTLED";
  const canBet =
    table.phase === "BETTING" && me !== null && !me.hasBet && !me.leaving;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      {/* En-tête : phase, chrono, sortie */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-cursed/30 bg-cursed/10 px-3 py-1.5 font-display text-xs font-black uppercase tracking-wider text-cursed-light">
            {PHASE_LABEL[table.phase]}
          </span>
          <PhaseTimer
            remainingMs={remaining}
            totalMs={PHASE_TOTAL[table.phase]}
            label={table.mode === "SOLO" ? "À toi de jouer" : "Table"}
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-black tabular-nums text-amber-300">
            <CoinIcon />
            {table.yourCoins.toLocaleString("fr-FR")}
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

      {/* Le tapis */}
      <div className="rounded-3xl border border-domain/25 bg-domain/[0.06] px-4 py-8 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.06)] sm:px-8 sm:py-10">
        <DealerArea
          dealer={table.dealer}
          cardBack={table.cardBack}
          dealing={table.phase !== "BETTING" && table.phase !== "SETTLED"}
        />

        <div className="my-8 flex items-center gap-3">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/12 to-transparent" />
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/25">
            Le croupier reste à 17 · Blackjack paie 3:2
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/12 to-transparent" />
        </div>

        <div className="flex flex-wrap items-start justify-center gap-3">
          {table.seats
            .slice()
            .sort((a, b) => a.seat - b.seat)
            .map((seat) => (
              <PlayerSeat
                key={seat.seat}
                seat={seat}
                cardBack={table.cardBack}
                active={table.activeSeat === seat.seat}
                phase={table.phase}
              />
            ))}
          {table.mode === "PUBLIC" &&
            Array.from({ length: Math.max(0, table.maxSeats - table.seats.length) }).map(
              (_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex min-w-[9rem] items-center justify-center rounded-2xl border border-dashed border-white/8 px-3 py-8 text-[11px] font-semibold uppercase tracking-wider text-white/20"
                >
                  Place libre
                </div>
              ),
            )}
        </div>
      </div>

      {/* Erreurs */}
      {error && (
        <p className="mt-4 rounded-xl border border-cursed/40 bg-cursed/10 px-4 py-3 text-center text-sm text-cursed-light">
          {error}
        </p>
      )}

      {/* Commandes */}
      <div className="mt-6 flex flex-col items-center gap-4">
        {canBet && (
          <BetPad
            coins={table.yourCoins}
            minBet={table.minBet}
            disabled={false}
            pending={pending}
            onBet={bet}
          />
        )}

        {table.phase === "BETTING" && me?.hasBet && (
          <p className="text-sm text-white/45">
            Mise placée. {table.mode === "SOLO" ? "Distribution…" : "On attend les autres."}
          </p>
        )}

        {myTurn && myHand && (
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <ActionButton label="Tirer" onClick={() => play("HIT")} disabled={pending} />
            <ActionButton
              label="Rester"
              onClick={() => play("STAND")}
              disabled={pending}
              tone="neutral"
            />
            <ActionButton
              label="Doubler"
              onClick={() => play("DOUBLE")}
              disabled={
                pending ||
                !canDouble(myHand.cards, myHand.doubled) ||
                table.yourCoins < myHand.bet
              }
              tone="gold"
              hint={
                table.yourCoins < myHand.bet ? "Solde insuffisant pour doubler" : undefined
              }
            />
          </div>
        )}

        {table.phase === "PLAYER_TURNS" && !myTurn && (
          <p className="text-sm text-white/40">
            {table.activeSeat === null
              ? "…"
              : `Au tour de ${
                  table.seats.find((s) => s.seat === table.activeSeat)?.username ?? "…"
                }.`}
          </p>
        )}

        {canRelaunch && (
          <button
            type="button"
            disabled={pending}
            onClick={tick}
            className="rounded-xl bg-cursed px-8 py-3 font-display text-sm font-black uppercase tracking-wider text-white transition hover:bg-cursed-light disabled:opacity-40"
          >
            Rejouer
          </button>
        )}
      </div>

      <p className="mt-8 text-center text-[11px] text-white/25">
        Table {table.code} · main #{table.handNumber + 1} · {table.shoeRemaining} cartes
        au sabot
      </p>
    </main>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  tone = "primary",
  hint,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  tone?: "primary" | "neutral" | "gold";
  hint?: string;
}) {
  const tones = {
    primary: "bg-domain text-white hover:bg-domain-light",
    neutral: "border border-white/20 bg-white/[0.05] text-white/80 hover:bg-white/10",
    gold: "border border-cursed/50 bg-cursed/15 text-cursed-light hover:bg-cursed/25",
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={hint}
      className={`min-w-[7rem] rounded-xl px-6 py-3 font-display text-sm font-black uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-35 ${tones[tone]}`}
    >
      {label}
    </button>
  );
}
