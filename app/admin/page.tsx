import type { Metadata } from "next";
import { adminConfigured, isAdminAuthed } from "@/lib/admin/auth";
import { readRoster, writesAllowed } from "@/lib/admin/roster-store";
import { ROSTER, type Character } from "@/data/roster/characters";
import { CATEGORIES } from "@/data/roster/categories";
import { AdminLogin } from "./AdminLogin";
import { AdminDashboard } from "./AdminDashboard";

export const metadata: Metadata = {
  title: "Admin — JJK Arcade",
  robots: { index: false, follow: false },
};

// Toujours dynamique (auth par cookie + lecture du fichier à jour).
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!adminConfigured()) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-white">
          Admin désactivé
        </h1>
        <p className="mt-3 text-sm text-white/55">
          Définis la variable d&apos;environnement{" "}
          <code className="rounded bg-void-700 px-1.5 py-0.5 text-domain-light">
            ADMIN_PASSWORD
          </code>{" "}
          (dans <code className="text-white/70">.env</code>) pour activer la vue
          admin.
        </p>
      </main>
    );
  }

  if (!(await isAdminAuthed())) {
    return <AdminLogin />;
  }

  // Lit le fichier à jour ; repli sur le ROSTER importé si lecture impossible.
  let roster: Character[];
  try {
    roster = await readRoster();
  } catch {
    roster = ROSTER;
  }

  return (
    <AdminDashboard
      roster={roster}
      categories={CATEGORIES}
      canWrite={writesAllowed()}
    />
  );
}
