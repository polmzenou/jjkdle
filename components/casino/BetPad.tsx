"use client";

import { useEffect, useState } from "react";
import { CoinIcon } from "@/components/progress/CoinWallet";

/**
 * Pavé de mise : jetons rapides + saisie libre.
 *
 * Il n'y a PAS de plafond de mise — un joueur peut engager tout son solde. Le
 * seul garde-fou est le minimum de la table. Le bouton « Tapis » est donc un
 * vrai tapis, et il est traité comme tel visuellement.
 *
 * Le montant saisi n'est jamais cru par le serveur : il est revalidé côté
 * action (minimum, entier, solde suffisant) avant tout débit.
 */

/** Jetons proposés. Filtrés à l'affichage selon le minimum et le solde. */
const CHIPS = [10, 50, 100, 500, 1_000, 5_000, 25_000];

export function BetPad({
  coins,
  minBet,
  disabled,
  pending,
  onBet,
}: {
  coins: number;
  minBet: number;
  disabled: boolean;
  pending: boolean;
  onBet: (amount: number) => void;
}) {
  const [amount, setAmount] = useState<number>(Math.min(Math.max(minBet, 100), coins));

  // Le solde change entre deux manches : on garde la mise dans les bornes plutôt
  // que de laisser un montant devenu impayable dans le champ.
  useEffect(() => {
    setAmount((current) => Math.min(Math.max(current, minBet), Math.max(coins, minBet)));
  }, [coins, minBet]);

  const tooPoor = coins < minBet;
  const valid = amount >= minBet && amount <= coins;
  const blocked = disabled || pending || tooPoor;

  return (
    <div className="flex w-full max-w-lg flex-col gap-3">
      {tooPoor ? (
        <p className="rounded-xl border border-cursed/30 bg-cursed/10 px-4 py-3 text-center text-sm text-cursed-light">
          Il te faut au moins {minBet.toLocaleString("fr-FR")} coins pour miser.
          Retourne gagner des coins dans les jeux d&apos;anime.
        </p>
      ) : (
        <>
          {/* Jetons */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {CHIPS.filter((chip) => chip >= minBet && chip <= coins).map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={blocked}
                onClick={() => setAmount(chip)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-black tabular-nums transition disabled:opacity-40 ${
                  amount === chip
                    ? "border-cursed bg-cursed/20 text-cursed-light"
                    : "border-white/15 bg-white/[0.04] text-white/65 hover:border-white/35 hover:text-white"
                }`}
              >
                {chip.toLocaleString("fr-FR")}
              </button>
            ))}
            <button
              type="button"
              disabled={blocked}
              onClick={() => setAmount(coins)}
              className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-amber-300 transition hover:bg-amber-400/20 disabled:opacity-40"
            >
              Tapis
            </button>
          </div>

          {/* Saisie libre + validation */}
          <div className="flex items-center gap-2">
            <span className="relative flex-1">
              <CoinIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-300/70" />
              <input
                type="number"
                inputMode="numeric"
                min={minBet}
                max={coins}
                step={1}
                value={amount}
                disabled={blocked}
                onChange={(e) => setAmount(Math.floor(Number(e.target.value) || 0))}
                className="w-full rounded-xl border border-white/12 bg-void-800/80 py-2.5 pl-9 pr-3 text-sm font-black tabular-nums text-white outline-none transition focus:border-cursed/60 disabled:opacity-40"
              />
            </span>
            <button
              type="button"
              disabled={blocked || !valid}
              onClick={() => onBet(amount)}
              className="rounded-xl bg-cursed px-6 py-2.5 font-display text-sm font-black uppercase tracking-wider text-white transition hover:bg-cursed-light disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? "…" : "Miser"}
            </button>
          </div>

          {!valid && amount > coins && (
            <p className="text-center text-xs text-cursed-light">
              Tu n&apos;as que {coins.toLocaleString("fr-FR")} coins.
            </p>
          )}
        </>
      )}
    </div>
  );
}
