import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserDraftBest } from "@/lib/games/draft/store";
import {
  getDraftAvatarCategory,
  getDraftBosses,
  getDraftCategories,
  getDraftRoster,
} from "@/lib/games/draft/queries";
import { DraftLeaderboard } from "@/components/leaderboard/DraftLeaderboard";
import { parseScope } from "@/lib/leaderboard/store";
import { redirect } from "next/navigation";
import { isGameEnabled } from "@/lib/config/app-config";
import { JujutsuDraftGame } from "./JujutsuDraftGame";
import { GameJsonLd } from "@/components/seo/JsonLd";
import { gameMetadata } from "@/lib/seo/config";
import { universeHref } from "@/lib/universes/current";

/** Métadonnées de l'univers courant (résolu par hostname). */
export async function generateMetadata(): Promise<Metadata> {
  return gameMetadata("jujutsu-draft");
}

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
  // Tout est lancé en parallèle ; le flag est vérifié avant d'utiliser le reste.
  const userPromise = getCurrentUser();
  const [
    enabled,
    user,
    { scope },
    initialBest,
    roster,
    bosses,
    categories,
    avatarCategory,
  ] = await Promise.all([
    isGameEnabled("jujutsu-draft"),
    userPromise,
    searchParams,
    userPromise.then((u) => (u ? getUserDraftBest(u.id) : null)),
    getDraftRoster(),
    getDraftBosses(),
    getDraftCategories(),
    getDraftAvatarCategory(),
  ]);
  if (!enabled) redirect(await universeHref("/games"));

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
      <GameJsonLd id="jujutsu-draft" />
      <JujutsuDraftGame
        isAuthed={Boolean(user)}
        initialBest={initialBest}
        roster={roster}
        bosses={bosses}
        categories={categories}
        avatarCategory={avatarCategory}
      />

      <div className="mt-10">
        <DraftLeaderboard limit={8} scope={parseScope(scope)} />
      </div>
    </main>
  );
}
