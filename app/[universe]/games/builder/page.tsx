import type { Metadata } from "next";
import { getBestScore } from "@/lib/bestScore";
import { getCurrentUser } from "@/lib/auth/session";
import { getCategories, getRoster } from "@/lib/content/queries";
import { Leaderboard } from "@/components/leaderboard/Leaderboard";
import { parseScope } from "@/lib/leaderboard/store";
import { redirect } from "next/navigation";
import { isGameEnabled } from "@/lib/config/app-config";
import { BuilderGame } from "./BuilderGame";
import { CategoryAdminPanel } from "./CategoryAdminPanel";
import { GameJsonLd } from "@/components/seo/JsonLd";
import { gameMetadata } from "@/lib/seo/config";
import { universeHref } from "@/lib/universes/current";
import { listCategories } from "@/lib/admin/category-store";

/** Métadonnées de l'univers courant (résolu par hostname). */
export async function generateMetadata(): Promise<Metadata> {
  return gameMetadata("builder");
}

// Le leaderboard lit le fichier à chaque requête (scores à jour).
export const dynamic = "force-dynamic";

/**
 * Page serveur : charge le best score (cookie) et passe la data statique au
 * composant client qui pilote la boucle de jeu (la barre de tête, le footer
 * ranks et le reveal sont gérés par BuilderGame).
 */
export default async function BuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  if (!(await isGameEnabled("builder"))) redirect(await universeHref("/games"));
  const [{ scope }, bestScore, user, categories, roster] = await Promise.all([
    searchParams,
    getBestScore("builder"),
    getCurrentUser(),
    getCategories(),
    getRoster(),
  ]);

  // Panneau d'édition des catégories, réservé aux admins : chargé seulement pour
  // eux (une requête de plus, jamais pour un joueur).
  const isAdmin = user?.role === "ADMIN";
  const adminCategories = isAdmin ? await listCategories() : [];

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
      <GameJsonLd id="builder" />
      <BuilderGame
        categories={categories}
        roster={roster}
        initialBestScore={bestScore}
        isAuthed={Boolean(user)}
      />

      {isAdmin && <CategoryAdminPanel categories={adminCategories} />}

      <div className="mt-10">
        <Leaderboard game="builder" limit={8} scope={parseScope(scope)} />
      </div>
    </main>
  );
}
