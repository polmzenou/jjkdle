import type { UserScore } from "@/lib/leaderboard/store";
import type { GuessWhoStats } from "@/lib/games/guesswho/stats";
import type { DeckShowcaseData } from "@/lib/cards/types";
import { BadgeShelf } from "@/components/badges/BadgeShelf";
import { DeckShowcase } from "@/components/cards/DeckShowcase";
import { ScoreCards } from "@/components/profile/ScoreCards";
import { UniverseLink } from "@/components/universe/UniverseLink";
import { GameIcon } from "@/components/icons/GameIcon";

interface PalmaresViewProps {
  badgeKeys: string[];
  universeSlug: string;
  scores: UserScore[];
  guessWhoStats: GuessWhoStats | null;
  /** null = section deck masquée (ou non chargée). */
  deckShowcase: DeckShowcaseData | null;
  /** Propriétaire : actions du deck + CTA « Jouer » sur l'état vide des scores. */
  isOwner: boolean;
  /** Sections exposées (profil public) ; tout est visible par défaut. */
  visibility?: { badges: boolean; scores: boolean; cards: boolean };
}

const ALL_VISIBLE = { badges: true, scores: true, cards: true };

/**
 * Vue « Palmarès », identique sur `/account` et `/u/[username]` :
 * badges pleine largeur, puis scores | deck côte à côte. Une colonne masquée
 * laisse l'autre prendre toute la largeur. L'ordre est FIXE (le layout ne porte
 * plus que la visibilité de chaque section).
 */
export function PalmaresView({
  badgeKeys,
  universeSlug,
  scores,
  guessWhoStats,
  deckShowcase,
  isOwner,
  visibility = ALL_VISIBLE,
}: PalmaresViewProps) {
  const showScores = visibility.scores;
  const showDeck = visibility.cards && deckShowcase !== null;
  const hasAnyScore = scores.length > 0 || Boolean(guessWhoStats);

  if (!visibility.badges && !showScores && !showDeck) {
    return (
      <div className="rounded-2xl border border-white/10 bg-void-800/60 px-6 py-12 text-center text-white/55 backdrop-blur">
        Ce joueur garde son palmarès pour lui.
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {visibility.badges && (
        <section>
          <SectionTitle>{isOwner ? "Mes badges" : "Badges"}</SectionTitle>
          <BadgeShelf unlockedKeys={badgeKeys} universeSlug={universeSlug} />
        </section>
      )}

      {(showScores || showDeck) && (
        <div
          className={`grid items-start gap-8 ${showScores && showDeck ? "lg:grid-cols-2" : ""}`}
        >
          {showScores && (
            <section className="min-w-0">
              <SectionTitle>{isOwner ? "Mes scores" : "Scores"}</SectionTitle>
              {!hasAnyScore ? (
                <div className="rounded-2xl border border-white/10 bg-void-800/60 px-6 py-12 text-center backdrop-blur">
                  <p className="text-white/55">
                    {isOwner
                      ? "Tu n'as pas encore de score enregistré."
                      : "Aucun score enregistré pour le moment."}
                  </p>
                  {isOwner && (
                    <UniverseLink
                      href="/games"
                      className="mt-5 inline-flex items-center gap-2 rounded-full bg-domain px-6 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-white shadow-glow transition-transform hover:scale-105"
                    >
                      Jouer maintenant <span aria-hidden>→</span>
                    </UniverseLink>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {scores.length > 0 && <ScoreCards scores={scores} />}
                  {guessWhoStats && <GuessWhoCard stats={guessWhoStats} />}
                </div>
              )}
            </section>
          )}

          {showDeck && (
            <section className="min-w-0">
              <SectionTitle>{isOwner ? "Mon deck" : "Deck"}</SectionTitle>
              <DeckShowcase data={deckShowcase} isOwner={isOwner} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 font-display text-lg font-bold uppercase tracking-wider text-white/85">
      {children}
    </h2>
  );
}

/** Bilan « Qui est-ce ? » (victoires / défaites), au format des cartes de score. */
function GuessWhoCard({ stats }: { stats: GuessWhoStats }) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-white/10 bg-void-800/60 p-5 backdrop-blur">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgb(var(--color-domain)), transparent)",
        }}
      />
      <p className="flex items-center gap-2 font-display font-bold text-white">
        <GameIcon id="guesswho" className="h-5 w-5 shrink-0 text-domain-light" />
        Qui est-ce ?
      </p>
      <p className="mt-1 text-xs uppercase tracking-wider text-white/45">
        {stats.total} partie{stats.total > 1 ? "s" : ""} jouée
        {stats.total > 1 ? "s" : ""}
      </p>
      <p className="mt-4 font-display text-3xl font-black text-domain-light">
        {stats.wins}
        <span className="text-white/35"> V</span>
        <span className="mx-2 align-middle text-lg text-white/25">/</span>
        {stats.losses}
        <span className="text-white/35"> D</span>
      </p>
    </article>
  );
}
