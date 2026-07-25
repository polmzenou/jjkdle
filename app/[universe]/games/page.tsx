import type { Metadata } from "next";
import { GameCard } from "@/components/GameCard";
import { MultiplayerPicker } from "@/components/multiplayer/MultiplayerPicker";
import { GamesListJsonLd } from "@/components/seo/JsonLd";
import { GAMES } from "@/lib/games/registry";
import { getGameFlags } from "@/lib/config/app-config";

export const metadata: Metadata = {
  title: "Tous les jeux Jujutsu Kaisen",
  description:
    "Tous les mini-jeux Jujutsu Kaisen de JJK Arcade : JJKdle, Qui est-ce ?, JJK Pyramid, Jujutsu Draft, Random Battle, Higher/Lower… Gratuits, sans compte, dans le navigateur.",
  alternates: { canonical: "/games" },
  openGraph: {
    type: "website",
    url: "/games",
    title: "Tous les jeux Jujutsu Kaisen · JJK Arcade",
    description:
      "JJKdle, Qui est-ce ?, JJK Pyramid, Jujutsu Draft, Random Battle, Higher/Lower… tous les mini-jeux Jujutsu Kaisen, gratuits et sans compte.",
  },
};

const FEATURES = ["Sans compte", "Best score local"];

/** Hub : liste tous les jeux du registre (système pluggable). */
export default async function GamesPage() {
  // Flags d'activation admin (défaut true) : un jeu désactivé est grisé/non cliquable.
  const flags = await getGameFlags();
  const liveCount = GAMES.filter(
    (g) => g.status !== "coming-soon" && flags[g.id] !== false,
  ).length;
  // Jeux proposés dans la modale multi : ceux qui déclarent un mode multi et ne
  // sont pas "multi uniquement" (ces derniers ont déjà leur propre carte).
  const multiplayerGames = GAMES.filter(
    (g) => g.multiplayer && !g.multiplayerOnly && flags[g.id] !== false,
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-14 sm:py-20">
      <GamesListJsonLd />
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
            <GameCard
              key={game.id}
              game={game}
              index={i}
              disabled={flags[game.id] === false}
            />
          ))}
        </div>
      </section>

      {/* ── Mode multijoueur (modale multi-jeux) ── */}
      <section className="mt-12">
        <MultiplayerPicker games={multiplayerGames} />
      </section>

      <footer className="mt-auto pt-20 text-center text-xs text-white/30">
        Fan-projet non officiel · aucun asset copyrighté.
      </footer>
    </main>
  );
}
