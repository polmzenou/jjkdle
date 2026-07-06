import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { readRoster } from "@/lib/admin/roster-store";
import { getCategories } from "@/lib/content/queries";
import { listDraftCharacters } from "@/lib/games/draft/queries";
import { listAllScores, type AdminScore } from "@/lib/leaderboard/store";
import { listAllDraftScores } from "@/lib/games/draft/store";
import { listAllJjkdleScores } from "@/lib/games/jjkdle/leaderboard";
import { listAllHigherLowerScores } from "@/lib/games/higher-lower/store";
import { listUsers } from "@/lib/admin/users";
import { getCachedImageCount } from "@/lib/admin/image-cache";
import { getOverviewStats } from "@/lib/admin/analytics";
import { getJjkdleAnalytics } from "@/lib/admin/jjkdle-analytics";
import {
  getGameFlags,
  getMaintenance,
  getForcedTarget,
} from "@/lib/config/app-config";
import { todayKey } from "@/lib/games/jjkdle/daily";
import type { Character } from "@/data/roster/characters";
import type { DraftCharacter } from "@/lib/games/draft/types";
import { AdminDashboard } from "./AdminDashboard";

export const metadata: Metadata = {
  title: "Admin — JJK Arcade",
  robots: { index: false, follow: false },
};

// Toujours dynamique (auth par cookie + lecture du fichier à jour).
export const dynamic = "force-dynamic";

/** Bloc d'accès refusé (non connecté ou rôle insuffisant). */
function AccessDenied({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="font-display text-2xl font-bold text-white">{title}</h1>
      <p className="mt-3 text-sm text-white/55">{children}</p>
    </main>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ jjkdleDate?: string }>;
}) {
  const [{ jjkdleDate }, user] = await Promise.all([
    searchParams,
    getCurrentUser(),
  ]);

  if (!user) {
    return (
      <AccessDenied title="Connexion requise">
        Cette section est réservée aux administrateurs.{" "}
        <Link
          href="/login"
          className="font-semibold text-domain-light hover:underline"
        >
          Se connecter
        </Link>
        .
      </AccessDenied>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <AccessDenied title="Accès refusé">
        Ton compte (<span className="text-white/80">{user.username}</span>) n
        &apos;a pas le rôle administrateur.
      </AccessDenied>
    );
  }

  let roster: Character[] = [];
  try {
    roster = await readRoster();
  } catch {
    roster = [];
  }
  let draftRoster: DraftCharacter[] = [];
  try {
    draftRoster = await listDraftCharacters();
  } catch {
    draftRoster = [];
  }
  const [categories, scores, users] = await Promise.all([
    getCategories(),
    listAllScores(),
    listUsers(),
  ]);
  let draftScores: AdminScore[] = [];
  try {
    draftScores = await listAllDraftScores();
  } catch {
    draftScores = [];
  }
  let jjkdleScores: AdminScore[] = [];
  try {
    jjkdleScores = await listAllJjkdleScores();
  } catch {
    jjkdleScores = [];
  }
  let higherLowerScores: AdminScore[] = [];
  try {
    higherLowerScores = await listAllHigherLowerScores();
  } catch {
    higherLowerScores = [];
  }

  // ── Sections analytics + config (calculées côté serveur) ──
  const analyticsDate = /^\d{4}-\d{2}-\d{2}$/.test(jjkdleDate ?? "")
    ? (jjkdleDate as string)
    : todayKey();
  const [overview, jjkdleAnalytics, gameFlags, maintenance, forcedTarget] =
    await Promise.all([
      getOverviewStats(roster),
      getJjkdleAnalytics(roster, analyticsDate),
      getGameFlags(),
      getMaintenance(),
      getForcedTarget(),
    ]);

  return (
    <AdminDashboard
      roster={roster}
      draftRoster={draftRoster}
      categories={categories}
      scores={[...scores, ...draftScores, ...jjkdleScores, ...higherLowerScores]}
      users={users}
      currentUserId={user.id}
      cachedImageCount={getCachedImageCount()}
      overview={overview}
      jjkdleAnalytics={jjkdleAnalytics}
      gameFlags={gameFlags}
      maintenance={maintenance}
      forcedTarget={forcedTarget}
    />
  );
}
