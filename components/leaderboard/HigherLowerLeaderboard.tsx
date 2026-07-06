import Link from "next/link";
import {
  topHigherLowerEntries,
  type HigherLowerLeaderboardEntry,
} from "@/lib/games/higher-lower/store";
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

interface HigherLowerLeaderboardProps {
  limit?: number;
  scope?: LeaderboardScope;
}

/**
 * Leaderboard de « JJK Higher/Lower » (top N par meilleur score de chaque
 * joueur). Server component : lit la base à la demande. Même DA que les autres
 * leaderboards du projet.
 */
export async function HigherLowerLeaderboard({
  limit = 20,
  scope = "all-time",
}: HigherLowerLeaderboardProps) {
  const entries = await topHigherLowerEntries(limit, scope);

  return (
    <section
      id="leaderboard"
      className="rounded-2xl border border-white/10 bg-void-800/40 p-5 backdrop-blur"
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-domain-light">
          🏆 Leaderboard 📊 Higher/Lower
        </h2>
        <span className="h-px flex-1 bg-gradient-to-r from-domain/40 to-transparent" />
        <ScopeToggle scope={scope} />
      </div>

      {entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-white/40">
          {scope === "weekly"
            ? "Aucun score cette semaine — lance une partie !"
            : "Aucun score pour l'instant — sois le premier à grimper !"}
        </p>
      ) : (
        <ol className="space-y-2">
          {entries.map((entry, i) => (
            <HigherLowerRow key={entry.id} entry={entry} rank={i + 1} />
          ))}
        </ol>
      )}
    </section>
  );
}

function HigherLowerRow({
  entry,
  rank,
}: {
  entry: HigherLowerLeaderboardEntry;
  rank: number;
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
        {entry.score}
        <span className="ml-1 text-xs font-normal text-white/35">pts</span>
      </span>
    </li>
  );
}
