import { GameCard } from "@/components/GameCard";
import { GAMES } from "@/lib/games/registry";

/** Hub : liste tous les jeux du registre (système pluggable). */
export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-12 text-center">
        <p className="text-sm uppercase tracking-[0.4em] text-domain-light">
          Jujutsu Kaisen
        </p>
        <h1 className="glitch-hover mt-2 font-display text-5xl font-black tracking-tight text-white sm:text-6xl">
          JJK <span className="text-glow text-domain-light">ARCADE</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-white/55">
          Une collection de mini-jeux maudits. Choisis ton défi et libère ton
          énergie maudite.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>

      <footer className="mt-16 text-center text-xs text-white/30">
        Fan-projet non officiel · visuels 100 % originaux · aucun asset
        copyrighté.
      </footer>
    </main>
  );
}
