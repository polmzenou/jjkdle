"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { CoinIcon } from "@/components/progress/CoinWallet";
import { joinRouletteTableAction } from "@/lib/casino/roulette-table-actions";
import { ROULETTE_MAX_SEATS } from "@/lib/casino/roulette-table";

/**
 * Écran d'entrée de la roulette : solo ou table à plusieurs. Même parti pris
 * que le blackjack (cf. BlackjackEntry) : aucun code à partager, « Trouver une
 * table » assied le joueur au tapis ouvert ou en ouvre un.
 */
export function RouletteEntry({
  coins,
  minBet,
  pusherReady,
  resumeCode,
}: {
  coins: number;
  minBet: number;
  pusherReady: boolean;
  resumeCode: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const join = () => {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await joinRouletteTableAction();
      if (result.ok && result.code) router.push(`/casino/roulette/${result.code}`);
      else setError(result.ok ? "Impossible de rejoindre une table." : result.error);
    });
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-6 pb-24 pt-6 sm:pt-10">
      <div className="mb-8 flex sm:mb-10">
        <Link
          href="/casino"
          className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white/55 transition hover:border-cursed/40 hover:text-cursed-light"
        >
          ← Casino
        </Link>
      </div>
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center"
      >
        <span aria-hidden className="text-5xl">
          🎡
        </span>
        <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
          Roulette
        </h1>
        <p className="mx-auto mt-4 max-w-md text-balance leading-relaxed text-white/55">
          Faites vos jeux. Plein, cheval, carré, rouge ou noir — la bille décide.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
          <Rule>Européenne · un seul zéro</Rule>
          <Rule>Plein 35:1</Rule>
          <Rule>Mise min. {minBet.toLocaleString("fr-FR")}</Rule>
        </div>

        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-white/45">
          En poche
          <span className="flex items-center gap-1.5 font-black tabular-nums text-amber-300">
            <CoinIcon className="h-4 w-4" />
            {coins.toLocaleString("fr-FR")}
          </span>
        </p>
      </motion.header>

      {resumeCode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-8"
        >
          <Link
            href={`/casino/roulette/${resumeCode}`}
            className="flex items-center justify-between gap-3 rounded-2xl border border-cursed/40 bg-cursed/10 px-5 py-4 transition hover:bg-cursed/15"
          >
            <span className="text-sm text-white/70">
              Tu es déjà assis à la table{" "}
              <span className="font-black text-cursed-light">{resumeCode}</span>.
            </span>
            <span className="font-display text-sm font-black uppercase tracking-wider text-cursed-light">
              Reprendre →
            </span>
          </Link>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
        className="mt-8 grid gap-4 sm:grid-cols-2"
      >
        <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.02] p-6">
          <span aria-hidden className="text-3xl">
            🎯
          </span>
          <p className="font-display text-xl font-black tracking-tight text-white">Solo</p>
          <p className="flex-1 text-sm leading-relaxed text-white/45">
            Ton tapis, ta bille. Tu lances quand tu veux.
          </p>
          <Link
            href="/casino/roulette/solo"
            className="mt-2 rounded-xl bg-domain px-5 py-3 text-center font-display text-sm font-black uppercase tracking-wider text-white transition hover:bg-domain-light"
          >
            Jouer en solo
          </Link>
        </div>

        <div className="flex flex-col gap-3 rounded-3xl border border-cursed/25 bg-cursed/[0.05] p-6">
          <span aria-hidden className="text-3xl">
            👥
          </span>
          <p className="font-display text-xl font-black tracking-tight text-white">
            Table publique
          </p>
          <p className="flex-1 text-sm leading-relaxed text-white/45">
            {pusherReady
              ? `Un tapis partagé, jusqu'à ${ROULETTE_MAX_SEATS} joueurs. Tu vois où les autres posent leurs jetons.`
              : "Le multijoueur n'est pas configuré sur ce serveur."}
          </p>
          <button
            type="button"
            onClick={join}
            disabled={pending || !pusherReady}
            className="mt-2 rounded-xl bg-cursed px-5 py-3 font-display text-sm font-black uppercase tracking-wider text-white transition hover:bg-cursed-light disabled:cursor-not-allowed disabled:opacity-35"
          >
            {pusherReady ? (pending ? "…" : "Trouver une table") : "Indisponible"}
          </button>
        </div>
      </motion.div>

      {error && (
        <p className="mt-6 rounded-xl border border-cursed/40 bg-cursed/10 px-4 py-3 text-center text-sm text-cursed-light">
          {error}
        </p>
      )}

      <p className="mt-10 text-center text-xs text-white/30">
        Tu mises de vrais coins. Ce que tu perds ne revient pas.
      </p>
    </main>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-white/45">
      {children}
    </span>
  );
}
