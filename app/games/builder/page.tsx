import { getBestScore } from "@/lib/bestScore";
import { CATEGORIES } from "@/data/roster/categories";
import { ROSTER } from "@/data/roster/characters";
import { Leaderboard } from "@/components/leaderboard/Leaderboard";
import { BuilderGame } from "./BuilderGame";

export const metadata = {
  title: "Build the Perfect Sorcerer — JJK Arcade",
};

// Le leaderboard lit le fichier à chaque requête (scores à jour).
export const dynamic = "force-dynamic";

/**
 * Page serveur : charge le best score (cookie) et passe la data statique au
 * composant client qui pilote la boucle de jeu (la barre de tête, le footer
 * ranks et le reveal sont gérés par BuilderGame).
 */
export default async function BuilderPage() {
  const bestScore = await getBestScore("builder");

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
      <BuilderGame
        categories={CATEGORIES}
        roster={ROSTER}
        initialBestScore={bestScore}
      />

      <div className="mt-10">
        <Leaderboard game="builder" limit={8} />
      </div>
    </main>
  );
}
