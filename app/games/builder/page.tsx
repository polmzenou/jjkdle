import { getBestScore } from "@/lib/bestScore";
import { getCurrentUser } from "@/lib/auth/session";
import { getCategories, getRoster } from "@/lib/content/queries";
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
  const [bestScore, user, categories, roster] = await Promise.all([
    getBestScore("builder"),
    getCurrentUser(),
    getCategories(),
    getRoster(),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
      <BuilderGame
        categories={categories}
        roster={roster}
        initialBestScore={bestScore}
        isAuthed={Boolean(user)}
      />

      <div className="mt-10">
        <Leaderboard game="builder" limit={8} />
      </div>
    </main>
  );
}
