import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { readRoster } from "@/lib/admin/roster-store";
import { getCategories } from "@/lib/content/queries";
import { listDraftCharacters } from "@/lib/games/draft/queries";
import { listAllScores } from "@/lib/leaderboard/store";
import { listUsers } from "@/lib/admin/users";
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

export default async function AdminPage() {
  const user = await getCurrentUser();

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

  return (
    <AdminDashboard
      roster={roster}
      draftRoster={draftRoster}
      categories={categories}
      scores={scores}
      users={users}
      currentUserId={user.id}
    />
  );
}
