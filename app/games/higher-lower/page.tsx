import { getCurrentUser } from "@/lib/auth/session";
import { getHigherLowerPool, MIN_HL_POOL } from "@/lib/games/higher-lower/queries";
import { HigherLowerLeaderboard } from "@/components/leaderboard/HigherLowerLeaderboard";
import { parseScope } from "@/lib/leaderboard/store";
import { redirect } from "next/navigation";
import { isGameEnabled } from "@/lib/config/app-config";
import { HigherLowerGame } from "./HigherLowerGame";

export const metadata = {
  title: "JJK Higher/Lower — JJK Arcade",
};

// Auth par cookie + leaderboard à jour à chaque requête.
export const dynamic = "force-dynamic";

/**
 * Page serveur : résout l'utilisateur (auth) et vérifie que le roster a assez de
 * personnages notés. Toute la logique de jeu (démarrage, choix, fin) passe par
 * les routes serveur (anti-triche) : le client ne connaît jamais la valeur cachée.
 */
export default async function HigherLowerPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  if (!(await isGameEnabled("higher-lower"))) redirect("/games");
  const user = await getCurrentUser();
  const [{ scope }, pool] = await Promise.all([
    searchParams,
    getHigherLowerPool(),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
      <HigherLowerGame
        isAuthed={Boolean(user)}
        hasEnoughRoster={pool.length >= MIN_HL_POOL}
      />

      <div className="mt-10">
        <HigherLowerLeaderboard limit={20} scope={parseScope(scope)} />
      </div>
    </main>
  );
}
