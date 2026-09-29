import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUniverse } from "@/lib/universes/current";
import { bannerStyle } from "@/lib/profile/banners";
import { normalizeProfileLayout } from "@/lib/profile/layout";
import { getCurrentUser } from "@/lib/auth/session";
import { getDeckShowcase } from "@/lib/cards/store";
import { getUserScores } from "@/lib/leaderboard/store";
import { getUserDraftScore } from "@/lib/games/draft/store";
import { getUserJjkdleScore } from "@/lib/games/jjkdle/leaderboard";
import { getUserHigherLowerScore } from "@/lib/games/higher-lower/store";
import { getUserGuessWhoStats } from "@/lib/games/guesswho/stats";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { PalmaresView } from "@/components/profile/PalmaresView";
import { UniverseLink } from "@/components/universe/UniverseLink";

export const dynamic = "force-dynamic";

/** Charge le profil public (données non sensibles) d'un utilisateur par pseudo.
 * Le loadout et le streak sont ceux de l'UNIVERS COURANT (UserUniverseProfile). */
async function getPublicProfile(username: string) {
  const { id: universeId } = await getCurrentUniverse();
  return prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      role: true,
      totalXp: true,
      level: true,
      badges: { select: { badgeKey: true } },
      universeProfiles: {
        where: { universeId },
        select: {
          bannerKey: true,
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
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) return { title: "Profil introuvable" };
  return {
    title: profile.username,
    description: `Profil de ${profile.username} : niveau ${profile.level}, badges et progression sur JJK Arcade.`,
    robots: { index: false, follow: false },
  };
}

/**
 * Profil PUBLIC d'un joueur : le même hero et le même Palmarès que `/account`,
 * sans le bouton EDIT ni la bascule Mon compte / Palmarès. Aucune donnée
 * sensible (ni email, ni édition).
 *
 * Le joueur choisit ce qu'il expose (titre, cadre, badges, scores, deck) depuis
 * l'onglet « Visibilité » de sa modale d'édition ; l'ordre des sections est fixe.
 */
export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const [profile, { id: universeId, slug: universeSlug }, viewer] =
    await Promise.all([
      getPublicProfile(username),
      getCurrentUniverse(),
      getCurrentUser(),
    ]);
  if (!profile) notFound();

  // Loadout + streak de l'univers courant (0 ou 1 ligne).
  const prof = profile.universeProfiles[0];
  const layout = normalizeProfileLayout(prof?.profileLayout ?? null);
  const visible = (key: "badges" | "scores" | "cards") =>
    layout.sections.find((s) => s.key === key)?.visible ?? true;
  const visibility = {
    badges: visible("badges"),
    scores: visible("scores"),
    cards: visible("cards"),
  };

  // Les scores alimentent aussi la carte « Meilleur rang » : toujours chargés.
  const [
    classicScores,
    draftScore,
    jjkdleScore,
    higherLowerScore,
    guessWhoStats,
    deckShowcase,
  ] = await Promise.all([
    getUserScores(profile.id),
    getUserDraftScore(profile.id),
    getUserJjkdleScore(profile.id),
    getUserHigherLowerScore(profile.id),
    visibility.scores ? getUserGuessWhoStats(profile.id) : null,
    visibility.cards ? getDeckShowcase(profile.id, universeId) : null,
  ]);
  const scores = [
    ...classicScores,
    ...(draftScore ? [draftScore] : []),
    ...(jjkdleScore ? [jjkdleScore] : []),
    ...(higherLowerScore ? [higherLowerScore] : []),
  ];
  const badgeKeys = profile.badges.map((b) => b.badgeKey);
  // Le propriétaire qui consulte son propre profil garde ses raccourcis vers
  // /account/deck ; un visiteur ne voit que la vitrine.
  const isOwner = viewer?.id === profile.id;

  return (
    <main className="mx-auto w-full max-w-[1600px] px-5 py-10 sm:px-6 sm:py-14 lg:w-3/4">
      <UniverseLink
        href="/games"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white"
      >
        ← Retour aux jeux
      </UniverseLink>

      <ProfileHero
        username={profile.username}
        role={profile.role}
        avatarImage={prof?.avatarCharacter?.image}
        frameKey={layout.showFrame ? (prof?.equippedFrameKey ?? null) : null}
        titleKey={layout.showTitle ? (prof?.equippedTitleKey ?? null) : null}
        nameColorKey={prof?.nameColorKey ?? null}
        totalXp={profile.totalXp}
        bannerGradient={bannerStyle(prof?.bannerKey).gradient}
        stats={
          <ProfileStats
            streak={prof?.jjkdleStreak ?? 0}
            bestStreak={prof?.jjkdleBestStreak ?? 0}
            badgeKeys={badgeKeys}
            universeSlug={universeSlug}
            scores={scores}
          />
        }
      />

      <div className="mt-10">
        <PalmaresView
          badgeKeys={badgeKeys}
          universeSlug={universeSlug}
          scores={scores}
          guessWhoStats={guessWhoStats}
          deckShowcase={deckShowcase}
          isOwner={isOwner}
          visibility={visibility}
        />
      </div>
    </main>
  );
}
