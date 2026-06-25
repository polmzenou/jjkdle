import { getBestScore } from "@/lib/bestScore";
import { getCurrentUser } from "@/lib/auth/session";
import { getConditions, getCharacterMap } from "@/lib/content/queries";
import { Leaderboard } from "@/components/leaderboard/Leaderboard";
import { RankingGame } from "./RankingGame";

export const metadata = {
  title: "JJK Pyramid — JJK Arcade",
};

// Le leaderboard lit le fichier à chaque requête (scores à jour).
export const dynamic = "force-dynamic";

/**
 * Page serveur : charge le best score (cookie). Le composant client tire la
 * condition + mélange le pool côté client (anti-mismatch d'hydratation).
 */
export default async function RankingPage() {
  const [bestScore, user, conditions, characterById] = await Promise.all([
    getBestScore("ranking"),
    getCurrentUser(),
    getConditions(),
    getCharacterMap(),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <RankingGame
        initialBestScore={bestScore}
        isAuthed={Boolean(user)}
        conditions={conditions}
        characterById={characterById}
      />

      <div className="mt-10">
        <Leaderboard game="ranking" limit={8} />
      </div>
    </main>
  );
}
