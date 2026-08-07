"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { CoinIcon } from "@/components/progress/CoinWallet";
import {
  joinPublicTableAction,
  startSoloTableAction,
} from "@/lib/casino/actions";

/**
 * Écran d'entrée du blackjack : solo ou table publique.
 *
 * Le multi n'expose AUCUN code de partie et aucun mot de passe — « Jouer »
 * lance un matchmaking qui assied le joueur à la table ouverte, ou en ouvre une.
 * C'est un choix de produit : une table de casino se rejoint, elle ne s'organise
 * pas.
 */
export function BlackjackEntry({
  coins,
  minBet,
  pusherReady,
  resumeCode,
}: {
  coins: number;
  minBet: number;
  /** Le multijoueur est disponible sur ce serveur. */
  pusherReady: boolean;
  /** Table où le joueur est déjà assis (reprise après un rechargement). */
  resumeCode: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const go = (action: () => Promise<{ ok: boolean; code?: string; error?: string }>) => {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok && result.code) {
        router.push(`/casino/blackjack/${result.code}`);
      } else {
        setError(result.error ?? "Impossible de rejoindre une table.");
      }
    });
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-6 pb-24 pt-14 sm:pt-20">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center"
      >
        <span aria-hidden className="text-5xl">
          ♠
        </span>
        <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
          Blackjack
        </h1>
        <p className="mx-auto mt-4 max-w-md text-balance leading-relaxed text-white/55">
          Approche-toi de 21 sans le dépasser, et fais mieux que le croupier.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
          <Rule>Blackjack paie 3:2</Rule>
          <Rule>Le croupier reste à 17</Rule>
          <Rule>Égalité = mise rendue</Rule>
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
            href={`/casino/blackjack/${resumeCode}`}
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
        <ModeCard
          icon="🃏"
          title="Solo"
          description="Face au croupier, à ton rythme. Aucun chrono, aucune attente."
          cta="Jouer en solo"
          disabled={pending}
          onClick={() => go(startSoloTableAction)}
        />
        <ModeCard
          icon="👥"
          title="Table publique"
          description={
            pusherReady
              ? "On t'assied à une table ouverte, jusqu'à 5 joueurs. Sans code, sans mot de passe."
              : "Le multijoueur n'est pas configuré sur ce serveur."
          }
          cta={pusherReady ? "Trouver une table" : "Indisponible"}
          disabled={pending || !pusherReady}
          onClick={() => go(joinPublicTableAction)}
          accent
        />
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

function ModeCard({
  icon,
  title,
  description,
  cta,
  disabled,
  onClick,
  accent = false,
}: {
  icon: string;
  title: string;
  description: string;
  cta: string;
  disabled: boolean;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-3xl border p-6 ${
        accent
          ? "border-cursed/25 bg-cursed/[0.05]"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <span aria-hidden className="text-3xl">
        {icon}
      </span>
      <p className="font-display text-xl font-black tracking-tight text-white">
        {title}
      </p>
      <p className="flex-1 text-sm leading-relaxed text-white/45">{description}</p>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`mt-2 rounded-xl px-5 py-3 font-display text-sm font-black uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-35 ${
          accent
            ? "bg-cursed text-white hover:bg-cursed-light"
            : "bg-domain text-white hover:bg-domain-light"
        }`}
      >
        {cta}
      </button>
    </div>
  );
}
