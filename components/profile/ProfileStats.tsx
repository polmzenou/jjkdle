import type { UserScore } from "@/lib/leaderboard/store";
import { badgesForUniverse } from "@/lib/badges/definitions";
import { universeGameTitle } from "@/lib/games/universe";

interface ProfileStatsProps {
  streak: number;
  bestStreak: number;
  /** Clés de badges possédées (possession GLOBALE, filtrée ici sur l'univers). */
  badgeKeys: string[];
  universeSlug: string;
  scores: UserScore[];
}

/**
 * Les trois cartes de stats du hero (Streak du jeu du jour / Badges / Meilleur
 * rang). Partagées par `/account` et le profil public ; tout est dérivé des
 * données déjà chargées par la page.
 *
 * Le compteur de badges ne compte QUE les badges du catalogue de l'univers
 * courant : la possession est globale, et compter les badges des autres
 * univers donnait des « 31 / 14 · 221 % ».
 */
export async function ProfileStats({
  streak,
  bestStreak,
  badgeKeys,
  universeSlug,
  scores,
}: ProfileStatsProps) {
  const catalog = badgesForUniverse(universeSlug);
  const owned = new Set(badgeKeys);
  const badgeTotal = catalog.length;
  const badgeCount = catalog.filter((b) => owned.has(b.key)).length;
  const badgePct =
    badgeTotal > 0 ? Math.round((badgeCount / badgeTotal) * 100) : 0;

  const bestRanked = scores.length
    ? scores.reduce((best, s) => (s.rank < best.rank ? s : best))
    : null;
  const [dailyTitle, bestRankGame] = await Promise.all([
    universeGameTitle("jjkdle"),
    bestRanked ? universeGameTitle(bestRanked.gameId) : null,
  ]);

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatCard label={`Streak ${dailyTitle}`}>
        <Value>
          {streak}
          <Unit>jour{streak > 1 ? "s" : ""}</Unit>
        </Value>
        <Hint>record : {bestStreak}</Hint>
      </StatCard>

      <StatCard label="Badges">
        <Value>
          {badgeCount}
          <Unit>/ {badgeTotal}</Unit>
        </Value>
        <Hint>{badgePct} % débloqués</Hint>
      </StatCard>

      <StatCard label="Meilleur rang">
        {bestRanked ? (
          <>
            <Value>#{bestRanked.rank}</Value>
            <Hint>{bestRankGame}</Hint>
          </>
        ) : (
          <>
            <p className="mt-2 font-display text-3xl font-black text-white/30">—</p>
            <Hint>Pas encore classé</Hint>
          </>
        )}
      </StatCard>
    </div>
  );
}

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-void-900/60 p-4">
      <p className="truncate text-[11px] font-bold uppercase tracking-wider text-white/45">
        {label}
      </p>
      {children}
    </div>
  );
}

function Value({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 font-display text-3xl font-black text-white">{children}</p>
  );
}

function Unit({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1.5 align-baseline text-base font-bold text-white/45">
      {children}
    </span>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 truncate text-xs text-white/40">{children}</p>;
}
