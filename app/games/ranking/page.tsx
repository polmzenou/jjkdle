import { getBestScore } from "@/lib/bestScore";
import { RankingGame } from "./RankingGame";

export const metadata = {
  title: "JJK Pyramid — JJK Arcade",
};

/**
 * Page serveur : charge le best score (cookie). Le composant client tire la
 * condition + mélange le pool côté client (anti-mismatch d'hydratation).
 */
export default async function RankingPage() {
  const bestScore = await getBestScore("ranking");

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <RankingGame initialBestScore={bestScore} />
    </main>
  );
}
