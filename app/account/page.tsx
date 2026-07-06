import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserScores } from "@/lib/leaderboard/store";
import { getUserDraftScore } from "@/lib/games/draft/store";
import { getUserJjkdleScore } from "@/lib/games/jjkdle/leaderboard";
import { getUserHigherLowerScore } from "@/lib/games/higher-lower/store";
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
import { BADGES } from "@/lib/badges/definitions";
import { GAMES } from "@/lib/games/registry";
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
    higherLowerScore,
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
    getUserHigherLowerScore(user.id),
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
    ...(higherLowerScore ? [higherLowerScore] : []),
  ];

  // ── Stats résumées (dérivées de données déjà chargées, aucune requête en plus) ──
  const streak = profile?.jjkdleStreak ?? 0;
  const bestStreak = profile?.jjkdleBestStreak ?? 0;
  const badgeTotal = BADGES.length;
  const badgeCount = badgeKeys.length;
  const badgePct = badgeTotal > 0 ? Math.round((badgeCount / badgeTotal) * 100) : 0;
  const bestRanked = scores.length
    ? scores.reduce((best, s) => (s.rank < best.rank ? s : best))
    : null;
  const bestRankGame = bestRanked
    ? GAMES.find((g) => g.id === bestRanked.gameId)?.title ?? bestRanked.gameId
    : null;

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-6 sm:py-16">
      <header className="mb-12">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-domain-light/70">
          <span aria-hidden className="h-px w-6 bg-gradient-to-r from-transparent to-domain-light/60" />
          管理 · Mon compte
        </span>

        {/* Carte hero : bannière + avatar en débordement + identité + niveau */}
        <div className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-void-800/40 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur">
          {/* Bande bannière */}
          <div
            className="relative h-28 sm:h-36"
            style={{ background: banner.gradient }}
          >
            <span
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-void-800/80 via-transparent to-transparent"
            />
          </div>

          {/* Identité (avatar chevauche la bannière) */}
          <div className="px-5 pb-6 sm:px-8">
            <div className="-mt-12 flex flex-wrap items-end gap-4 sm:-mt-14 sm:gap-5">
              <UserAvatar
                username={user.username}
                image={profile?.avatarCharacter?.image}
                level={profile?.level ?? 1}
                frameKey={profile?.equippedFrameKey}
                size={104}
                className="rounded-full ring-4 ring-void-800"
              />
              <div className="min-w-0 pb-1">
                <h1 className="flex flex-wrap items-center gap-x-2 font-display text-3xl font-black tracking-tight text-white drop-shadow sm:text-4xl">
                  {user.username}
                  {user.role === "VIP" && <VipBadge className="text-sm" />}
                </h1>
                {profile?.equippedTitleKey && (
                  <TitleBadge titleKey={profile.equippedTitleKey} className="mt-2 text-sm" />
                )}
              </div>
            </div>

            {/* Barre de niveau intégrée */}
            <div className="mt-6">
              <LevelBar totalXp={profile?.totalXp ?? 0} />
            </div>
          </div>
        </div>

        {/* Actions profil (boutons pilule) */}
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/u/${encodeURIComponent(user.username)}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-void-800/60 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur transition-colors hover:border-domain/50 hover:text-white"
          >
            Voir mon profil public <span aria-hidden>↗</span>
          </Link>
          <Link
            href="/account/customize"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-void-800/60 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur transition-colors hover:border-domain/50 hover:text-white"
          >
            🎛️ Customiser mon profil
          </Link>
        </div>
      </header>

      {/* ── Cartes statistiques ── */}
      <section className="mb-12 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-void-800/60 p-5 backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-wider text-white/45">
            🔥 Streak JJKdle
          </p>
          <p className="mt-3 font-display text-3xl font-black text-white">
            {streak}
            <span className="ml-1.5 align-baseline text-base font-bold text-white/45">
              jour{streak > 1 ? "s" : ""}
            </span>
          </p>
          <p className="mt-1 text-xs text-white/40">record : {bestStreak}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-void-800/60 p-5 backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-wider text-white/45">
            🎖️ Badges
          </p>
          <p className="mt-3 font-display text-3xl font-black text-white">
            {badgeCount}
            <span className="ml-1.5 align-baseline text-base font-bold text-white/45">
              / {badgeTotal}
            </span>
          </p>
          <p className="mt-1 text-xs text-white/40">{badgePct} % débloqués</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-void-800/60 p-5 backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-wider text-white/45">
            🏆 Meilleur rang
          </p>
          {bestRanked ? (
            <>
              <p className="mt-3 font-display text-3xl font-black text-white">
                #{bestRanked.rank}
              </p>
              <p className="mt-1 truncate text-xs text-white/40">{bestRankGame}</p>
            </>
          ) : (
            <>
              <p className="mt-3 font-display text-3xl font-black text-white/30">—</p>
              <p className="mt-1 text-xs text-white/40">Pas encore classé</p>
            </>
          )}
        </div>
      </section>

      {/* ── Récap des scores ── */}
      <section className="mb-12">
        <h2 className="mb-5 font-display text-xl font-bold uppercase tracking-wider text-white/85">
          🏆 Mes scores
        </h2>

        {scores.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-void-800/60 px-6 py-12 text-center backdrop-blur">
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
        <h2 className="mb-5 font-display text-xl font-bold uppercase tracking-wider text-white/85">
          🎖️ Mes badges
        </h2>
        <BadgeShelf unlockedKeys={badgeKeys} />
      </section>

      {/* ── Personnalisation ── */}
      <section className="mb-12 space-y-4">
        <h2 className="mb-5 font-display text-xl font-bold uppercase tracking-wider text-white/85">
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
        <h2 className="mb-5 font-display text-xl font-bold uppercase tracking-wider text-white/85">
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
