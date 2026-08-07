"use client";

import { CoinIcon } from "@/components/progress/CoinWallet";
import { handValue } from "@/lib/casino/hand";
import type { BjHand, SeatView } from "@/lib/casino/types";
import { CardSlot, PlayingCard } from "./PlayingCard";

/**
 * Un siège à la table : le joueur, sa mise, ses cartes, son résultat.
 *
 * Pas d'avatar — il vient de `UserUniverseProfile`, donc d'un univers, et le
 * casino n'en a aucun. Pseudo et niveau (tous deux globaux) suffisent, avec
 * l'initiale en pastille pour repérer les sièges d'un coup d'œil.
 */
export function PlayerSeat({
  seat,
  cardBack,
  active,
  phase,
}: {
  seat: SeatView;
  cardBack: string;
  /** C'est à ce siège de jouer. */
  active: boolean;
  phase: string;
}) {
  const dealt = seat.hands.length > 0;
  const waiting = phase === "BETTING" || phase === "SETTLED";

  return (
    <div
      className={`flex min-w-[9rem] flex-col items-center gap-2.5 rounded-2xl border px-3 py-3.5 transition ${
        active
          ? "border-cursed/60 bg-cursed/[0.07] shadow-[0_0_28px_-10px_rgb(var(--color-cursed))]"
          : seat.isYou
            ? "border-domain/40 bg-domain/[0.06]"
            : "border-white/10 bg-white/[0.02]"
      } ${seat.leaving ? "opacity-50" : ""}`}
    >
      {/* Identité */}
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-black uppercase ${
            seat.isYou
              ? "bg-domain/30 text-domain-light"
              : "bg-white/10 text-white/60"
          }`}
        >
          {seat.username.slice(0, 1)}
        </span>
        <span className="flex flex-col leading-tight">
          <span
            className={`max-w-[7rem] truncate text-xs font-bold ${
              seat.isYou ? "text-domain-light" : "text-white/75"
            }`}
          >
            {seat.isYou ? "Toi" : seat.username}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-white/35">
            Niv. {seat.level}
            {seat.leaving && " · part"}
          </span>
        </span>
      </div>

      {/* Cartes */}
      <div className="flex min-h-[4.5rem] items-end gap-1.5">
        {dealt ? (
          seat.hands.map((hand, hi) => (
            <HandStack
              key={hi}
              hand={hand}
              cardBack={cardBack}
              dimmed={seat.hands.length > 1 && hi !== seat.activeHand}
            />
          ))
        ) : waiting ? null : (
          <>
            <CardSlot small />
            <CardSlot small />
          </>
        )}
      </div>

      {/* Mise ou résultat */}
      {seat.lastResult && phase === "SETTLED" ? (
        <ResultPill net={seat.lastResult.net} />
      ) : seat.hasBet ? (
        <span className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[11px] font-black tabular-nums text-amber-300">
          <CoinIcon className="h-3 w-3" />
          {seat.bet.toLocaleString("fr-FR")}
        </span>
      ) : (
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/30">
          {phase === "BETTING" ? "Mise…" : "Passe"}
        </span>
      )}
    </div>
  );
}

/** Une main du siège : ses cartes + son total. */
function HandStack({
  hand,
  cardBack,
  dimmed,
}: {
  hand: BjHand;
  cardBack: string;
  dimmed: boolean;
}) {
  const value = handValue(hand.cards);
  const tone =
    hand.status === "BUST"
      ? "bg-cursed/25 text-cursed-light"
      : hand.status === "BLACKJACK"
        ? "bg-cursed/25 text-cursed-light"
        : "bg-white/10 text-white/80";

  return (
    <div className={`flex flex-col items-center gap-1.5 ${dimmed ? "opacity-45" : ""}`}>
      <div className="flex gap-1">
        {hand.cards.map((card, i) => (
          <PlayingCard key={`${i}-${card}`} card={card} cardBack={cardBack} index={i} small />
        ))}
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] font-black tabular-nums ${tone}`}
      >
        {value.total}
        {hand.status === "BUST" && " ✕"}
        {hand.status === "BLACKJACK" && " BJ"}
        {hand.doubled && " ×2"}
      </span>
    </div>
  );
}

/** Bilan de la manche pour ce siège, en net. */
function ResultPill({ net }: { net: number }) {
  if (net === 0) {
    return (
      <span className="rounded-full border border-white/20 bg-white/[0.06] px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-white/60">
        Égalité
      </span>
    );
  }
  const win = net > 0;
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black tabular-nums ${
        win
          ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
          : "border-cursed/40 bg-cursed/15 text-cursed-light"
      }`}
    >
      <CoinIcon className="h-3 w-3" />
      {win ? "+" : ""}
      {net.toLocaleString("fr-FR")}
    </span>
  );
}
