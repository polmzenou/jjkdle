import {
  topDraftEntries,
  type DraftLeaderboardEntry,
} from "@/lib/games/draft/store";
import type { LeaderboardScope } from "@/lib/leaderboard/store";
import { VipBadge } from "@/components/VipBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { ScopeToggle } from "./ScopeToggle";

/** Couleurs des médailles : 1er Or, 2e Argent, 3e Bronze. */
const MEDALS = [
  { color: "#F5C518", ring: "#F5C51855" },
  { color: "#CBD5E1", ring: "#CBD5E155" },
  { color: "#CD7F32", ring: "#CD7F3255" },
] as const;

interface DraftLeaderboardProps {
  limit?: number;
  scope?: LeaderboardScope;
}

/**
 * Leaderboard de Jujutsu Draft (top N par ennemis vaincus). Server component :
 * lit la base à la demande. Même DA que le leaderboard des autres jeux.
 */
export async function DraftLeaderboard({
  limit = 8,
  scope = "all-time",
}: DraftLeaderboardProps) {
  const entries = await topDraftEntries(limit, scope);

  return (
    <section
      id="leaderboard"
      className="rounded-2xl border border-white/10 bg-void-800/40 p-5 backdrop-blur"
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-amber-200">
          🏆 Leaderboard ⚔️ Jujutsu Draft
        </h2>
        <span className="h-px flex-1 bg-gradient-to-r from-amber-300/30 to-transparent" />
        <ScopeToggle scope={scope} />
      </div>

      {entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-white/40">
          {scope === "weekly"
            ? "Aucun record battu cette semaine — relance la machine !"
            : "Aucun score pour l'instant — gagne une partie et sois le premier !"}
        </p>
      ) : (
        <ol className="space-y-2">
          {entries.map((entry, i) => (
            <DraftRow key={entry.id} entry={entry} rank={i + 1} />
          ))}
        </ol>
      )}
    </section>
  );
}

function DraftRow({
  entry,
  rank,
}: {
  entry: DraftLeaderboardEntry;
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
        size={32}
      />

      <p
        className="min-w-0 flex-1 truncate font-semibold"
        style={{ color: isPodium ? medal!.color : "#fff" }}
      >
        {entry.pseudo}
        {entry.role === "VIP" && <VipBadge className="ml-1.5" />}
        {entry.outcome === "VICTORY" && (
          <span className="ml-2 align-middle text-xs text-emerald-300">★ clear</span>
        )}
      </p>

      <span
        className="shrink-0 font-display text-lg font-bold tabular-nums"
        style={{ color: isPodium ? medal!.color : "#fff" }}
      >
        {entry.enemiesKilled}
        <span className="ml-1 text-xs font-normal text-white/35">vaincus</span>
      </span>
    </li>
  );
}
