import { GameCard } from "@/components/GameCard";
import { Logo } from "@/components/Logo";
import { GAMES } from "@/lib/games/registry";

const FEATURES = ["Sans compte", "Best score local"];

/** Hub : liste tous les jeux du registre (système pluggable). */
export default function HomePage() {
  const liveCount = GAMES.filter((g) => g.status !== "coming-soon").length;

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-16 sm:py-24">
      {/* ── Hero ── */}
      <header className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs font-medium uppercase tracking-[0.25em] text-domain-light backdrop-blur">
          <span className="h-1.5 w-1.5 animate-glow-pulse rounded-full bg-domain-light" />
          Jujutsu Kaisen · Fan Arcade
        </span>

        <h1 className="mt-4 flex justify-center">
          <Logo className="h-48 w-auto sm:h-64" glow />
        </h1>

        <p className="mx-auto mt-5 max-w-md text-balance text-white/55">
          Une collection de mini-jeux maudits autour de l'univers Jujutsu Kaisen.
          Choisis ton défi et libère ton énergie maudite.
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
      <section className="mt-16">
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

      <footer className="mt-auto pt-20 text-center text-xs text-white/30">
        Fan-projet non officiel · aucun asset
        copyrighté.
      </footer>
    </main>
  );
}
