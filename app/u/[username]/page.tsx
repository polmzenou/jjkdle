import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { bannerStyle } from "@/lib/profile/banners";
import { normalizeProfileLayout } from "@/lib/profile/layout";
import { UserAvatar } from "@/components/UserAvatar";
import { LevelBar } from "@/components/LevelBar";
import { VipBadge } from "@/components/VipBadge";
import { TitleBadge } from "@/components/TitleBadge";
import { BadgeShelf } from "@/components/badges/BadgeShelf";
import { ScoreCards } from "@/components/profile/ScoreCards";
import { getUserScores } from "@/lib/leaderboard/store";
import { getUserDraftScore } from "@/lib/games/draft/store";
import { getUserJjkdleScore } from "@/lib/games/jjkdle/leaderboard";

export const dynamic = "force-dynamic";

/** Charge le profil public (données non sensibles) d'un utilisateur par pseudo. */
async function getPublicProfile(username: string) {
  return prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      role: true,
      level: true,
      totalXp: true,
      bannerKey: true,
      jjkdleStreak: true,
      equippedTitleKey: true,
      equippedFrameKey: true,
      profileLayout: true,
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
 *
 * Ce que le joueur expose (titre, cadre, badges, scores) et l'ordre des sections
 * suivent ses préférences (`profileLayout`, cf. /account/customize). L'en-tête
 * (bannière + avatar + pseudo + niveau) reste toujours en haut.
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
  const layout = normalizeProfileLayout(profile.profileLayout);

  // Scores agrégés (un seul fetch ; non rendus si la section est masquée).
  const showScores = layout.sections.some((s) => s.key === "scores" && s.visible);
  const [classicScores, draftScore, jjkdleScore] = showScores
    ? await Promise.all([
        getUserScores(profile.id),
        getUserDraftScore(profile.id),
        getUserJjkdleScore(profile.id),
      ])
    : [[], null, null];
  const scores = [
    ...classicScores,
    ...(draftScore ? [draftScore] : []),
    ...(jjkdleScore ? [jjkdleScore] : []),
  ];

  /** Rend une section de corps selon son type (respecte l'ordre du layout). */
  const renderSection = (key: "badges" | "scores") => {
    if (key === "badges") {
      return (
        <section key="badges" className="mt-10">
          <h2 className="mb-4 font-display text-lg font-bold uppercase tracking-wider text-white/80">
            🎖️ Badges
          </h2>
          <BadgeShelf unlockedKeys={profile.badges.map((b) => b.badgeKey)} />
        </section>
      );
    }
    return (
      <section key="scores" className="mt-10">
        <h2 className="mb-4 font-display text-lg font-bold uppercase tracking-wider text-white/80">
          🏆 Scores
        </h2>
        {scores.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-void-800/60 px-6 py-10 text-center backdrop-blur">
            <p className="text-white/55">Aucun score enregistré pour le moment.</p>
          </div>
        ) : (
          <ScoreCards scores={scores} />
        )}
      </section>
    );
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
      <Link
        href="/games"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white"
      >
        ← Retour aux jeux
      </Link>

      {/* Bannière + avatar + niveau (toujours en haut) */}
      <div
        className="relative overflow-hidden rounded-2xl border border-white/10 p-5"
        style={{ background: banner.gradient }}
      >
        <div className="flex flex-wrap items-center gap-4">
          <UserAvatar
            username={profile.username}
            image={profile.avatarCharacter?.image}
            level={profile.level}
            frameKey={layout.showFrame ? profile.equippedFrameKey : null}
            size={72}
          />
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-black tracking-tight text-white drop-shadow sm:text-4xl">
              {profile.username}
              {profile.role === "VIP" && <VipBadge className="ml-2 text-sm" />}
            </h1>
            {layout.showTitle && profile.equippedTitleKey && (
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

      {/* Sections de corps dans l'ordre choisi par le joueur */}
      {layout.sections
        .filter((s) => s.visible)
        .map((s) => renderSection(s.key))}
    </main>
  );
}
