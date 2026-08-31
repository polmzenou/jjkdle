import {
  topTowerEntries,
  type TowerLeaderboardEntry,
} from "@/lib/games/tower/store";
import type { LeaderboardScope } from "@/lib/leaderboard/store";
import { VipBadge } from "@/components/VipBadge";
import { TitleBadge } from "@/components/TitleBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { ScopeToggle } from "./ScopeToggle";
import { UniverseLink } from "@/components/universe/UniverseLink";

/** Couleurs des médailles : 1er Or, 2e Argent, 3e Bronze. */
const MEDALS = [
  { color: "#F5C518", ring: "#F5C51855" },
  { color: "#CBD5E1", ring: "#CBD5E155" },
  { color: "#CD7F32", ring: "#CD7F3255" },
] as const;

/**
 * Classement de « The Culling Tower ».
 *
 * Il affiche le NOMBRE D'ESSAIS en gros, et l'étage en second : c'est la
 * conséquence directe des essais illimités, où tout le monde finit par boucler
 * la tour. Ce qui distingue les joueurs, c'est en combien de tentatives — le
 * score ne sert plus qu'à départager.
 */
export async function TowerLeaderboard({
  limit = 20,
  scope = "all-time",
}: {
  limit?: number;
  scope?: LeaderboardScope;
}) {
  const entries = await topTowerEntries(limit, scope);

  return (
    <section
      id="leaderboard"
      className="rounded-2xl border border-white/10 bg-void-800/40 p-5 backdrop-blur"
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-domain-light">
          🏆 Leaderboard 🗼 The Culling Tower
        </h2>
        <span className="h-px flex-1 bg-gradient-to-r from-domain/40 to-transparent" />
        <ScopeToggle scope={scope} />
      </div>

      <p className="mb-3 text-xs text-white/40">
        Classé sur le nombre d&apos;essais qu&apos;il a fallu pour franchir la
        tour — puis sur l&apos;étage atteint et le score.
      </p>

      {entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-white/40">
          {scope === "weekly"
            ? "Personne n'a encore tenté l'ascension cette semaine."
            : "Personne n'a encore tenté l'ascension — sois le premier."}
        </p>
      ) : (
        <ol className="space-y-2">
          {entries.map((entry, i) => (
            <TowerRow key={entry.id} entry={entry} rank={i + 1} />
          ))}
        </ol>
      )}
    </section>
  );
}

function TowerRow({
  entry,
  rank,
}: {
  entry: TowerLeaderboardEntry;
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
            : {
                color: "rgba(255,255,255,0.55)",
                background: "rgba(255,255,255,0.06)",
              }
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
        <UniverseLink
          href={`/u/${encodeURIComponent(entry.pseudo)}`}
          className="underline-offset-2 hover:underline"
        >
          {entry.pseudo}
        </UniverseLink>
        {entry.role === "VIP" && <VipBadge className="ml-1.5" />}
        {entry.titleKey && (
          <TitleBadge titleKey={entry.titleKey} className="ml-1.5" />
        )}
      </p>

      {/*
        Bouclée : le nombre d'essais, c'est le classement. Inachevée : l'étage
        atteint — libellé « étage N » et non « N / 20 », qui se lisait comme un
        sans-faute quand on mourait justement sur le boss du 20e.
      */}
      <span className="shrink-0 text-right">
        {entry.cleared ? (
          <>
            <span
              className="font-display text-lg font-bold tabular-nums"
              style={{ color: isPodium ? medal!.color : "#fff" }}
            >
              {entry.attempt}
            </span>
            <span className="ml-1 text-xs font-normal text-white/35">
              essai{entry.attempt > 1 ? "s" : ""}
            </span>
          </>
        ) : (
          <>
            <span className="mr-1 text-xs font-normal text-white/35">étage</span>
            <span className="font-display text-lg font-bold tabular-nums text-white/70">
              {entry.floor}
            </span>
          </>
        )}
      </span>
    </li>
  );
}
