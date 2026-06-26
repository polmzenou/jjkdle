import type { Metadata } from "next";
import Link from "next/link";
import { GameCard } from "@/components/GameCard";
import { GAMES } from "@/lib/games/registry";

export const metadata: Metadata = {
  title: "Les jeux — JJK Arcade",
  description:
    "Tous les mini-jeux maudits de JJK Arcade : Build the Perfect Sorcerer, JJK Pyramid, et plus à venir.",
};

const FEATURES = ["Sans compte", "Best score local"];

/** Hub : liste tous les jeux du registre (système pluggable). */
export default function GamesPage() {
  const liveCount = GAMES.filter((g) => g.status !== "coming-soon").length;

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-14 sm:py-20">
      {/* ── En-tête de page ── */}
      <header className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs font-medium uppercase tracking-[0.25em] text-domain-light backdrop-blur">
          <span className="h-1.5 w-1.5 animate-glow-pulse rounded-full bg-domain-light" />
          Catalogue
        </span>

        <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Les jeux maudits
        </h1>

        <p className="mx-auto mt-4 max-w-md text-balance text-white/55">
          Choisis ton défi et libère ton énergie maudite. Chaque jeu garde ton
          meilleur score en local — aucun compte requis.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {FEATURES.map((f) => (
            <span
              key={f}
              className="rounded-full border border-white/10 bg-void-800/40 px-3 py-1 text-xs text-white/55"
            >
              {f}
            </span>
          ))}
        </div>
      </header>

      {/* ── Grille de jeux ── */}
      <section className="mt-14">
        <div className="mb-6 flex items-center gap-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-white/45">
            Jeux disponibles
          </h2>
          <span className="rounded-full bg-domain/15 px-2 py-0.5 text-xs font-bold text-domain-light">
            {liveCount}
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {GAMES.map((game, i) => (
            <GameCard key={game.id} game={game} index={i} />
          ))}
        </div>
      </section>

      {/* ── Mode multijoueur (Builder) ── */}
      <section className="mt-12">
        <Link
          href="/games/multiplayer"
          className="group flex flex-col items-center gap-4 rounded-3xl border border-domain/30 bg-gradient-to-br from-domain/15 to-cursed/10 p-8 text-center transition-transform hover:scale-[1.01] sm:flex-row sm:text-left"
        >
          <span className="text-4xl">⚔️</span>
          <div className="flex-1">
            <h3 className="font-display text-xl font-bold text-white">
              Multijoueur — Build the Perfect Sorcerer
            </h3>
            <p className="mt-1 text-sm text-white/60">
              Lobby privé, jusqu'à 3 joueurs, en temps réel. Le meilleur build l'emporte.
            </p>
          </div>
          <span className="rounded-xl bg-domain px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-white shadow-glow transition-transform group-hover:scale-105">
            Jouer en ligne
          </span>
        </Link>
      </section>

      <footer className="mt-auto pt-20 text-center text-xs text-white/30">
        Fan-projet non officiel · aucun asset copyrighté.
      </footer>
    </main>
  );
}
