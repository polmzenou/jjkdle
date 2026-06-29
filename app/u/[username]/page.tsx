import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { bannerStyle } from "@/lib/profile/banners";
import { UserAvatar } from "@/components/UserAvatar";
import { LevelBar } from "@/components/LevelBar";
import { VipBadge } from "@/components/VipBadge";
import { TitleBadge } from "@/components/TitleBadge";
import { BadgeShelf } from "@/components/badges/BadgeShelf";

export const dynamic = "force-dynamic";

/** Charge le profil public (données non sensibles) d'un utilisateur par pseudo. */
async function getPublicProfile(username: string) {
  return prisma.user.findUnique({
    where: { username },
    select: {
      username: true,
      role: true,
      level: true,
      totalXp: true,
      bannerKey: true,
      jjkdleStreak: true,
      equippedTitleKey: true,
      equippedFrameKey: true,
      avatarCharacter: { select: { name: true, image: true } },
      badges: { select: { badgeKey: true } },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) return { title: "Profil introuvable — JJK Arcade" };
  return {
    title: `${profile.username} — JJK Arcade`,
    description: `Profil de ${profile.username} : niveau ${profile.level}, badges et progression sur JJK Arcade.`,
  };
}

/**
 * Profil PUBLIC d'un joueur : bannière, avatar, pseudo, niveau et badges.
 * Aucune donnée sensible (ni email, ni édition) — accessible à tous via un clic
 * sur le pseudo dans un leaderboard ou depuis l'admin.
 */
export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) notFound();

  const banner = bannerStyle(profile.bannerKey);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
      <Link
        href="/games"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white"
      >
        ← Retour aux jeux
      </Link>

      {/* Bannière + avatar + niveau */}
      <div
        className="relative overflow-hidden rounded-2xl border border-white/10 p-5"
        style={{ background: banner.gradient }}
      >
        <div className="flex flex-wrap items-center gap-4">
          <UserAvatar
            username={profile.username}
            image={profile.avatarCharacter?.image}
            level={profile.level}
            frameKey={profile.equippedFrameKey}
            size={72}
          />
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-black tracking-tight text-white drop-shadow sm:text-4xl">
              {profile.username}
              {profile.role === "VIP" && <VipBadge className="ml-2 text-sm" />}
            </h1>
            {profile.equippedTitleKey && (
              <TitleBadge titleKey={profile.equippedTitleKey} className="mt-1.5 text-sm" />
            )}
            {profile.jjkdleStreak > 0 && (
              <p className="mt-1 text-sm font-bold text-white/85">
                🔥 {profile.jjkdleStreak} jour{profile.jjkdleStreak > 1 ? "s" : ""} de streak JJKdle
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-void-800/60 p-5 backdrop-blur">
        <LevelBar totalXp={profile.totalXp} />
      </div>

      {/* Badges */}
      <section className="mt-10">
        <h2 className="mb-4 font-display text-lg font-bold uppercase tracking-wider text-white/80">
          🎖️ Badges
        </h2>
        <BadgeShelf unlockedKeys={profile.badges.map((b) => b.badgeKey)} />
      </section>
    </main>
  );
}
