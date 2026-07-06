import { getCurrentUser } from "@/lib/auth/session";
import { getUserDraftBest } from "@/lib/games/draft/store";
import { getDraftRoster } from "@/lib/games/draft/queries";
import { DraftLeaderboard } from "@/components/leaderboard/DraftLeaderboard";
import { parseScope } from "@/lib/leaderboard/store";
import { redirect } from "next/navigation";
import { isGameEnabled } from "@/lib/config/app-config";
import { JujutsuDraftGame } from "./JujutsuDraftGame";

export const metadata = {
  title: "Jujutsu Draft — JJK Arcade",
};

// Auth par cookie + leaderboard à jour à chaque requête.
export const dynamic = "force-dynamic";

/**
 * Page serveur : résout l'utilisateur (auth) et son meilleur score. Le tirage
 * et toute la logique de jeu vivent côté client (anti-mismatch d'hydratation).
 */
export default async function JujutsuDraftPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  if (!(await isGameEnabled("jujutsu-draft"))) redirect("/games");
  const user = await getCurrentUser();
  const [{ scope }, initialBest, roster] = await Promise.all([
    searchParams,
    user ? getUserDraftBest(user.id) : Promise.resolve(null),
    getDraftRoster(),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
      <JujutsuDraftGame
        isAuthed={Boolean(user)}
        initialBest={initialBest}
        roster={roster}
      />

      <div className="mt-10">
        <DraftLeaderboard limit={8} scope={parseScope(scope)} />
      </div>
    </main>
  );
}
