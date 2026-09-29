import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserScores } from "@/lib/leaderboard/store";
import { getUserDraftScore } from "@/lib/games/draft/store";
import { getUserJjkdleScore } from "@/lib/games/jjkdle/leaderboard";
import { getUserHigherLowerScore } from "@/lib/games/higher-lower/store";
import { getUserGuessWhoStats } from "@/lib/games/guesswho/stats";
import { getCollectionCompletion, getDeckShowcase } from "@/lib/cards/store";
import { bannerStyle } from "@/lib/profile/banners";
import { normalizeProfileLayout } from "@/lib/profile/layout";
import { isEditTab } from "@/lib/profile/edit-tabs";
import { getUserBadgeKeys } from "@/lib/badges/evaluate";
import {
  buildUnlockContext,
  getUnlockedTitleKeys,
  getUnlockedFrameKeys,
} from "@/lib/cosmetics/unlock";
import { getTitleGrantKeys, getFrameGrantKeys } from "@/lib/cosmetics/grants";
import { getRoster } from "@/lib/content/queries";
import { getCurrentUniverse } from "@/lib/universes/current";
import { prisma } from "@/lib/prisma";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { PalmaresView } from "@/components/profile/PalmaresView";
import type { AvatarChoice } from "@/components/profile/BannerPicker";
import { UniverseLink } from "@/components/universe/UniverseLink";
import { AccountForms } from "./AccountForms";
import { AccountView } from "./AccountView";
import { ProfileEditLauncher } from "./ProfileEditModal";

export const metadata: Metadata = {
  title: "Mon compte",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Espace « Mon compte » : hero de profil (bannière, avatar, niveau, EDIT, stats)
 * puis la bascule MON COMPTE | PALMARÈS. Le palmarès est exactement la vue du
 * profil public (`/u/[username]`). La personnalisation se fait dans la modale
 * ouverte par EDIT (`?edit=<onglet>` l'ouvre directement).
 */
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; edit?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Univers courant : filtre le loadout/streak lus et les catalogues de
  // cosmétiques proposés (résolu une fois pour toute la page).
  const [universe, params] = await Promise.all([getCurrentUniverse(), searchParams]);

  const [
    classicScores,
    draftScore,
    jjkdleScore,
    higherLowerScore,
    guessWhoStats,
    profile,
    badgeKeys,
    roster,
    unlockCtx,
    titleGrantKeys,
    frameGrantKeys,
    deckShowcase,
    collectionPct,
  ] = await Promise.all([
    getUserScores(user.id),
    getUserDraftScore(user.id),
    getUserJjkdleScore(user.id),
    getUserHigherLowerScore(user.id),
    getUserGuessWhoStats(user.id),
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        totalXp: true,
        level: true,
        universeProfiles: {
          where: { universeId: universe.id },
          select: {
            bannerKey: true,
            avatarCharacterId: true,
            jjkdleStreak: true,
            jjkdleBestStreak: true,
            equippedTitleKey: true,
            equippedFrameKey: true,
            nameColorKey: true,
            profileLayout: true,
            avatarCharacter: { select: { name: true, image: true } },
          },
        },
      },
    }),
    getUserBadgeKeys(user.id),
    getRoster(),
    buildUnlockContext(user.id),
    getTitleGrantKeys(user.id),
    getFrameGrantKeys(user.id),
    getDeckShowcase(user.id, universe.id),
    getCollectionCompletion(user.id, universe.id),
  ]);

  // Loadout + streak de l'univers courant (0 ou 1 ligne) ; totalXp/level restent globaux.
  const prof = profile?.universeProfiles[0];
  const scores = [
    ...classicScores,
    ...(draftScore ? [draftScore] : []),
    ...(jjkdleScore ? [jjkdleScore] : []),
    ...(higherLowerScore ? [higherLowerScore] : []),
  ];
  const avatarChoices: AvatarChoice[] = roster.map((c) => ({
    id: c.id,
    name: c.name,
    ...(c.image ? { image: c.image } : {}),
  }));

  return (
    <main className="mx-auto w-full max-w-[1600px] px-5 py-10 sm:px-6 sm:py-14 lg:w-3/4">
      <ProfileHero
        username={user.username}
        role={user.role}
        avatarImage={prof?.avatarCharacter?.image}
        frameKey={prof?.equippedFrameKey}
        titleKey={prof?.equippedTitleKey}
        nameColorKey={prof?.nameColorKey}
        totalXp={profile?.totalXp ?? 0}
        bannerGradient={bannerStyle(prof?.bannerKey).gradient}
        actions={
          <>
            <ProfileEditLauncher
              initialTab={isEditTab(params.edit) ? params.edit : null}
              data={{
                username: user.username,
                level: profile?.level ?? 1,
                isAdmin: user.role === "ADMIN",
                universeSlug: universe.slug,
                roster: avatarChoices,
                bannerKey: prof?.bannerKey ?? "default",
                avatarId: prof?.avatarCharacterId ?? null,
                titleKey: prof?.equippedTitleKey ?? null,
                frameKey: prof?.equippedFrameKey ?? null,
                nameColorKey: prof?.nameColorKey ?? null,
                collectionPct,
                unlockedTitleKeys: [...getUnlockedTitleKeys(unlockCtx, titleGrantKeys)],
                unlockedFrameKeys: [...getUnlockedFrameKeys(unlockCtx, frameGrantKeys)],
                layout: normalizeProfileLayout(prof?.profileLayout ?? null),
              }}
            />
            <UniverseLink
              href={`/u/${encodeURIComponent(user.username)}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-void-900/60 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:border-domain/50 hover:text-white"
            >
              Voir mon profil public <span aria-hidden>↗</span>
            </UniverseLink>
          </>
        }
        stats={
          <ProfileStats
            streak={prof?.jjkdleStreak ?? 0}
            bestStreak={prof?.jjkdleBestStreak ?? 0}
            badgeKeys={badgeKeys}
            universeSlug={universe.slug}
            scores={scores}
          />
        }
      />

      <AccountView
        initialTab={params.tab === "compte" ? "compte" : "palmares"}
        palmares={
          <PalmaresView
            badgeKeys={badgeKeys}
            universeSlug={universe.slug}
            scores={scores}
            guessWhoStats={guessWhoStats}
            deckShowcase={deckShowcase}
            isOwner
          />
        }
        account={
          <section className="rounded-3xl border border-white/10 bg-void-800/40 p-5 backdrop-blur sm:p-6">
            <h2 className="mb-5 font-display text-lg font-bold uppercase tracking-wider text-white/85">
              Mon compte
            </h2>
            <div className="mb-5 rounded-2xl border border-white/10 bg-void-800/60 p-5">
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
        }
      />
    </main>
  );
}
