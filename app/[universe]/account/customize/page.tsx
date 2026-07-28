import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getUniverseLoadout } from "@/lib/universes/profile";
import { normalizeProfileLayout } from "@/lib/profile/layout";
import { ProfileLayoutEditor } from "./ProfileLayoutEditor";
import { UniverseLink } from "@/components/universe/UniverseLink";
import { AccountTabs } from "../AccountTabs";

export const metadata: Metadata = {
  title: "Customiser mon profil",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Réglage de la mise en page du profil PUBLIC : ce que le joueur expose
 * (titre, cadre, badges, scores) et dans quel ordre apparaissent les sections.
 * L'en-tête (bannière + avatar + pseudo) reste toujours en haut, non configurable.
 */
export default async function CustomizeProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const loadout = await getUniverseLoadout(user.id);
  const layout = normalizeProfileLayout(loadout.profileLayout);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
      <header className="mb-8">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-domain-light/70">
          <span
            aria-hidden
            className="h-px w-6 bg-gradient-to-r from-transparent to-domain-light/60"
          />
          管理 · Customisation
        </span>
        <h1 className="mt-3 font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
          🎛️ Customiser mon profil
        </h1>
        <p className="mt-2 text-sm text-white/55">
          Choisis ce qui apparaît sur ton profil public et dans quel ordre. Le
          pseudo, l'avatar et la bannière restent toujours tout en haut.
        </p>
      </header>

      <AccountTabs />

      <ProfileLayoutEditor username={user.username} initialLayout={layout} />

      <UniverseLink
        href={`/u/${encodeURIComponent(user.username)}`}
        className="mt-6 inline-flex items-center gap-1.5 text-sm text-domain-light underline-offset-2 hover:underline"
      >
        Voir mon profil public <span aria-hidden>↗</span>
      </UniverseLink>
    </main>
  );
}
