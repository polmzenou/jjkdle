"use client";

import Link from "next/link";
import { motion } from "framer-motion";

/**
 * Accueil du casino : le choix du jeu.
 *
 * Composant client uniquement pour les animations d'entrée — toutes les données
 * sont résolues côté serveur (même découpage que le hub d'univers).
 *
 * Les tuiles « bientôt » ne sont pas du remplissage : elles occupent la place
 * des prochains jeux, donc la grille reste équilibrée quand il n'y en a qu'un
 * de jouable, et elles annoncent ce qui vient. Même rôle que `ComingSoonCard`
 * sur le hub.
 */

export interface CasinoGameTile {
  id: string;
  title: string;
  description: string;
  /** Symbole affiché en grand (aucune librairie d'icônes dans ce projet). */
  icon: string;
  href: string | null;
  status: "live" | "coming-soon";
  /** Ligne de teasing affichée sous le titre (mise minimale, nb de joueurs…). */
  hint?: string;
}

export function CasinoHome({
  games,
  coins,
  isLoggedIn,
}: {
  games: CasinoGameTile[];
  coins: number;
  isLoggedIn: boolean;
}) {
  return (
    <main className="relative mx-auto w-full max-w-5xl px-6 pb-24 pt-14 sm:pt-20">
      <header className="mx-auto max-w-2xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-cursed/30 bg-cursed/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-cursed-light">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgb(52_211_153)]"
            />
            Table ouverte
          </span>

          <h1 className="mt-6 font-display text-4xl font-black uppercase leading-[1.05] tracking-tight text-white sm:text-6xl">
            Le
            <span className="block bg-gradient-to-b from-cursed-light to-cursed/50 bg-clip-text text-transparent">
              casino
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-md text-balance leading-relaxed text-white/55">
            Tes coins, gagnés dans tous les univers, se misent ici. Le casino ne
            dépend d&apos;aucun anime — c&apos;est le même portefeuille partout.
          </p>

          {isLoggedIn ? (
            <p className="mt-5 text-sm text-white/45">
              En poche :{" "}
              <span className="font-black tabular-nums text-cursed-light">
                {coins.toLocaleString("fr-FR")}
              </span>{" "}
              coins
            </p>
          ) : (
            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-cursed/40 bg-cursed/15 px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-cursed-light transition hover:bg-cursed/25"
            >
              Se connecter pour jouer
            </Link>
          )}
        </motion.div>
      </header>

      <ul className="mt-14 grid gap-5 sm:mt-16 sm:grid-cols-2">
        {games.map((game, index) => (
          <GameTile key={game.id} game={game} index={index} />
        ))}
      </ul>
    </main>
  );
}

function GameTile({ game, index }: { game: CasinoGameTile; index: number }) {
  const soon = game.status === "coming-soon" || !game.href;

  const body = (
    <>
      <div className="relative h-28 overflow-hidden">
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background: soon
              ? "radial-gradient(120% 130% at 50% -10%, rgb(255 255 255 / 0.06) 0%, transparent 70%)"
              : "radial-gradient(120% 130% at 50% -10%, rgb(var(--color-domain) / 0.5) 0%, rgb(var(--color-domain) / 0.1) 45%, transparent 75%)",
          }}
        />
        {!soon && (
          <span
            aria-hidden
            className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[420%]"
          />
        )}
        <span
          aria-hidden
          className={`absolute inset-0 m-auto grid h-16 w-16 place-items-center text-4xl transition-transform duration-500 ${
            soon ? "opacity-30" : "group-hover:scale-110"
          }`}
        >
          {game.icon}
        </span>
        {soon && (
          <span className="absolute right-3 top-3 rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/45">
            Bientôt
          </span>
        )}
      </div>

      <span
        aria-hidden
        className="h-px w-full"
        style={{
          background: soon
            ? "linear-gradient(90deg, transparent, rgb(255 255 255 / 0.08), transparent)"
            : "linear-gradient(90deg, transparent, rgb(var(--color-cursed) / 0.8), transparent)",
        }}
      />

      <div className="flex flex-1 flex-col gap-3 p-6">
        <p
          className={`font-display text-2xl font-black tracking-tight ${
            soon ? "text-white/40" : "text-white"
          }`}
        >
          {game.title}
        </p>
        <p className="text-sm leading-relaxed text-white/45">{game.description}</p>
        {game.hint && (
          <span className="inline-flex w-fit items-center rounded-full border border-cursed/25 bg-cursed/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-cursed-light">
            {game.hint}
          </span>
        )}
        {!soon && (
          <span className="mt-auto flex items-center gap-2 pt-2 font-display text-sm font-bold uppercase tracking-wider text-white/60 transition-colors group-hover:text-white">
            À la table
            <span
              aria-hidden
              className="transition-transform duration-300 group-hover:translate-x-1.5"
            >
              →
            </span>
          </span>
        )}
      </div>
    </>
  );

  return (
    <motion.li
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 + index * 0.08, ease: "easeOut" }}
    >
      {soon ? (
        <div className="flex h-full min-h-[17rem] flex-col overflow-hidden rounded-3xl border border-dashed border-white/10 bg-white/[0.015]">
          {body}
        </div>
      ) : (
        <Link
          href={game.href!}
          className="group flex h-full min-h-[17rem] flex-col overflow-hidden rounded-3xl border border-white/10 bg-void-800/70 transition duration-300 hover:-translate-y-1.5 hover:border-cursed/60 hover:shadow-[0_30px_70px_-35px_rgb(var(--color-cursed))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cursed-light focus-visible:ring-offset-2 focus-visible:ring-offset-void-900"
        >
          {body}
        </Link>
      )}
    </motion.li>
  );
}
