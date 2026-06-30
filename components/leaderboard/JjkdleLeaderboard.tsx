import {
  topJjkdleEntries,
  topJjkdleWeeklyEntries,
  type JjkdleLeaderboardEntry,
} from "@/lib/games/jjkdle/leaderboard";
import Link from "next/link";
import type { LeaderboardScope } from "@/lib/leaderboard/store";
import { VipBadge } from "@/components/VipBadge";
import { TitleBadge } from "@/components/TitleBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { ScopeToggle } from "./ScopeToggle";

/** Couleurs des médailles : 1er Or, 2e Argent, 3e Bronze. */
const MEDALS = [
  { color: "#F5C518", ring: "#F5C51855" },
  { color: "#CBD5E1", ring: "#CBD5E155" },
  { color: "#CD7F32", ring: "#CD7F3255" },
] as const;

interface JjkdleLeaderboardProps {
  limit?: number;
  scope?: LeaderboardScope;
}

/**
 * Leaderboard JJKdle. Portée `all-time` = classement DU JOUR (essais croissants,
 * reset quotidien) ; `weekly` = agrégat de la semaine (jours résolus puis total
 * d'essais). Server component : lit la base à la demande.
 */
export async function JjkdleLeaderboard({
  limit = 8,
  scope = "all-time",
}: JjkdleLeaderboardProps) {
  const weekly = scope === "weekly";
  const entries = weekly
    ? await topJjkdleWeeklyEntries(limit)
    : await topJjkdleEntries(limit);

  return (
    <section
      id="leaderboard"
      className="rounded-2xl border border-white/10 bg-void-800/40 p-5 backdrop-blur"
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-amber-200">
          🏆 Leaderboard 🎭 JJKdle
        </h2>
        <span className="text-xs text-white/35">{weekly ? "Semaine" : "Du jour"}</span>
        <span className="h-px flex-1 bg-gradient-to-r from-amber-300/30 to-transparent" />
        <ScopeToggle scope={scope} />
      </div>

      {entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-white/40">
          {weekly
            ? "Personne n'a encore joué cette semaine — lance-toi !"
            : "Personne n'a encore trouvé le perso du jour — sois le premier !"}
        </p>
      ) : (
        <ol className="space-y-2">
          {entries.map((entry, i) => (
            <JjkdleRow key={entry.id} entry={entry} rank={i + 1} weekly={weekly} />
          ))}
        </ol>
      )}
    </section>
  );
}

function JjkdleRow({
  entry,
  rank,
  weekly,
}: {
  entry: JjkdleLeaderboardEntry;
  rank: number;
  weekly: boolean;
}) {
  const medal = MEDALS[rank - 1];
  const isPodium = Boolean(medal);

  return (
    <li
      className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
      style={
        isPodium
          ? {
              borderColor: medal!.ring,
              background: `linear-gradient(90deg, ${medal!.color}1a, transparent 70%)`,
            }
          : { borderColor: "rgba(255,255,255,0.06)" }
      }
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-black"
        style={
          isPodium
            ? {
                color: "#0b0b12",
                background: medal!.color,
                boxShadow: `0 0 14px ${medal!.color}99`,
              }
            : { color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.06)" }
        }
      >
        {rank}
      </span>

      <UserAvatar
        username={entry.pseudo}
        image={entry.avatarImage}
        level={entry.level}
        frameKey={entry.frameKey}
        size={32}
      />

      <p
        className="min-w-0 flex-1 truncate font-semibold"
        style={{ color: isPodium ? medal!.color : "#fff" }}
      >
        <Link
          href={`/u/${encodeURIComponent(entry.pseudo)}`}
          className="underline-offset-2 hover:underline"
        >
          {entry.pseudo}
        </Link>
        {entry.role === "VIP" && <VipBadge className="ml-1.5" />}
        {entry.titleKey && <TitleBadge titleKey={entry.titleKey} className="ml-1.5" />}
      </p>

      <span
        className="shrink-0 font-display text-lg font-bold tabular-nums"
        style={{ color: isPodium ? medal!.color : "#fff" }}
      >
        {weekly ? (
          <>
            {entry.daysSolved}
            <span className="ml-1 text-xs font-normal text-white/35">
              jour{(entry.daysSolved ?? 0) > 1 ? "s" : ""}
            </span>
          </>
        ) : (
          <>
            {entry.attempts}
            <span className="ml-1 text-xs font-normal text-white/35">
              essai{entry.attempts > 1 ? "s" : ""}
            </span>
          </>
        )}
      </span>
    </li>
  );
}
