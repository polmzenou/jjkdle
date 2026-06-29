import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserScores } from "@/lib/leaderboard/store";
import { getUserDraftScore } from "@/lib/games/draft/store";
import { getUserJjkdleScore } from "@/lib/games/jjkdle/leaderboard";
import { VipBadge } from "@/components/VipBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { LevelBar } from "@/components/LevelBar";
import { BadgeShelf } from "@/components/badges/BadgeShelf";
import { ScoreCards } from "@/components/profile/ScoreCards";
import { TitleBadge } from "@/components/TitleBadge";
import { TitleSelector } from "@/components/profile/TitleSelector";
import { FrameSelector } from "@/components/profile/FrameSelector";
import { bannerStyle } from "@/lib/profile/banners";
import { getUserBadgeKeys } from "@/lib/badges/evaluate";
import {
  buildUnlockContext,
  getUnlockedTitleKeys,
  getUnlockedFrameKeys,
} from "@/lib/cosmetics/unlock";
import { getTitleGrantKeys, getFrameGrantKeys } from "@/lib/cosmetics/grants";
import { getRoster } from "@/lib/content/queries";
import { prisma } from "@/lib/prisma";
import { AccountForms } from "./AccountForms";
import { ProfileEditor, type AvatarChoice } from "./ProfileEditor";

export const metadata: Metadata = {
  title: "Mon compte — JJK Arcade",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Scores classiques (table Score) + scores des jeux à table dédiée
  // (Draft, et JJKdle = score du jour). + profil/progression + badges + roster.
  const [
    classicScores,
    draftScore,
    jjkdleScore,
    profile,
    badgeKeys,
    roster,
    unlockCtx,
    titleGrantKeys,
    frameGrantKeys,
  ] = await Promise.all([
    getUserScores(user.id),
    getUserDraftScore(user.id),
    getUserJjkdleScore(user.id),
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        bannerKey: true,
        avatarCharacterId: true,
        totalXp: true,
        level: true,
        jjkdleStreak: true,
        jjkdleBestStreak: true,
        equippedTitleKey: true,
        equippedFrameKey: true,
        avatarCharacter: { select: { name: true, image: true } },
      },
    }),
    getUserBadgeKeys(user.id),
    getRoster(),
    buildUnlockContext(user.id),
    getTitleGrantKeys(user.id),
    getFrameGrantKeys(user.id),
  ]);

  const isAdmin = user.role === "ADMIN";
  const unlockedTitleKeys = [...getUnlockedTitleKeys(unlockCtx, titleGrantKeys)];
  const unlockedFrameKeys = [...getUnlockedFrameKeys(unlockCtx, frameGrantKeys)];

  const avatarChoices: AvatarChoice[] = roster.map((c) => ({
    id: c.id,
    name: c.name,
    ...(c.image ? { image: c.image } : {}),
  }));
  const banner = bannerStyle(profile?.bannerKey);
  const scores = [
    ...classicScores,
    ...(draftScore ? [draftScore] : []),
    ...(jjkdleScore ? [jjkdleScore] : []),
  ];

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
      <header className="mb-10">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-domain-light/70">
          <span aria-hidden className="h-px w-6 bg-gradient-to-r from-transparent to-domain-light/60" />
          管理 · Mon compte
        </span>

        {/* Bannière + avatar + niveau */}
        <div
          className="relative mt-4 overflow-hidden rounded-2xl border border-white/10 p-5"
          style={{ background: banner.gradient }}
        >
          <div className="flex flex-wrap items-center gap-4">
            <UserAvatar
              username={user.username}
              image={profile?.avatarCharacter?.image}
              level={profile?.level ?? 1}
              frameKey={profile?.equippedFrameKey}
              size={72}
            />
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-black tracking-tight text-white drop-shadow sm:text-4xl">
                {user.username}
                {user.role === "VIP" && <VipBadge className="ml-2 text-sm" />}
              </h1>
              {profile?.equippedTitleKey && (
                <TitleBadge titleKey={profile.equippedTitleKey} className="mt-1.5 text-sm" />
              )}
              {(profile?.jjkdleStreak ?? 0) > 0 && (
                <p className="mt-1 text-sm font-bold text-white/85">
                  🔥 {profile?.jjkdleStreak} jour{(profile?.jjkdleStreak ?? 0) > 1 ? "s" : ""} de streak JJKdle
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-void-800/60 p-5 backdrop-blur">
          <LevelBar totalXp={profile?.totalXp ?? 0} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link
            href={`/u/${encodeURIComponent(user.username)}`}
            className="inline-flex items-center gap-1.5 text-sm text-domain-light underline-offset-2 hover:underline"
          >
            Voir mon profil public <span aria-hidden>↗</span>
          </Link>
          <Link
            href="/account/customize"
            className="inline-flex items-center gap-1.5 text-sm text-domain-light underline-offset-2 hover:underline"
          >
            🎛️ Customiser mon profil
          </Link>
        </div>
      </header>

      {/* ── Récap des scores ── */}
      <section className="mb-12">
        <h2 className="mb-4 font-display text-lg font-bold uppercase tracking-wider text-white/80">
          🏆 Mes scores
        </h2>

        {scores.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-void-800/60 px-6 py-10 text-center backdrop-blur">
            <p className="text-white/55">
              Tu n'as pas encore de score enregistré.
            </p>
            <Link
              href="/games"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-domain px-6 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-white shadow-glow transition-transform hover:scale-105"
            >
              Jouer maintenant
              <span aria-hidden>→</span>
            </Link>
          </div>
        ) : (
          <ScoreCards scores={scores} />
        )}
      </section>

      {/* ── Badges ── */}
      <section className="mb-12">
        <h2 className="mb-4 font-display text-lg font-bold uppercase tracking-wider text-white/80">
          🎖️ Mes badges
        </h2>
        <BadgeShelf unlockedKeys={badgeKeys} />
      </section>

      {/* ── Personnalisation ── */}
      <section className="mb-12 space-y-4">
        <h2 className="mb-4 font-display text-lg font-bold uppercase tracking-wider text-white/80">
          🎨 Personnalisation
        </h2>
        <ProfileEditor
          username={user.username}
          roster={avatarChoices}
          initialBannerKey={profile?.bannerKey ?? "default"}
          initialAvatarId={profile?.avatarCharacterId ?? null}
          level={profile?.level ?? 1}
          isAdmin={isAdmin}
        />
        <TitleSelector
          unlockedKeys={unlockedTitleKeys}
          equippedKey={profile?.equippedTitleKey ?? null}
        />
        <FrameSelector
          username={user.username}
          avatarImage={profile?.avatarCharacter?.image}
          unlockedKeys={unlockedFrameKeys}
          equippedKey={profile?.equippedFrameKey ?? null}
        />
      </section>

      {/* ── Infos & édition ── */}
      <section>
        <h2 className="mb-4 font-display text-lg font-bold uppercase tracking-wider text-white/80">
          ⚙️ Mon compte
        </h2>

        <div className="mb-5 rounded-2xl border border-white/10 bg-void-800/60 p-5 backdrop-blur">
          <p className="text-xs uppercase tracking-wider text-white/45">
            Adresse email
          </p>
          <p className="mt-1 font-medium text-white">{user.email}</p>
          <p className="mt-1 text-xs text-white/35">
            L'email n'est pas modifiable.
          </p>
        </div>

        <AccountForms currentUsername={user.username} />
      </section>
    </main>
  );
}
