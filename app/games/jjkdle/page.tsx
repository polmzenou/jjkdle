import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isGameEnabled } from "@/lib/config/app-config";
import { getRoster } from "@/lib/content/queries";
import { eligibleRoster, msUntilMidnight } from "@/lib/games/jjkdle/daily";
import { resolveDailyTarget } from "@/lib/games/jjkdle/daily-server";
import { buildRows, isStateFresh } from "@/lib/games/jjkdle/game";
import { readState } from "@/lib/games/jjkdle/state";
import type { GameMode, GameStatus, GuessRow } from "@/lib/games/jjkdle/types";
import { JjkdleLeaderboard } from "@/components/leaderboard/JjkdleLeaderboard";
import { parseScope } from "@/lib/leaderboard/store";
import { prisma } from "@/lib/prisma";
import { JJKdleGame, type PublicCharacter } from "./JJKdleGame";

export const metadata = {
  title: "JJKdle — JJK Arcade",
};

// État quotidien lu à chaque requête (cookie httpOnly) → toujours à jour.
export const dynamic = "force-dynamic";

/**
 * Page serveur : recalcule la partie du jour (lecture seule), réhydrate la grille
 * d'indices depuis le cookie, et passe au client UNIQUEMENT des données publiques.
 * La cible (`targetId`) n'est jamais transmise tant que la partie n'est pas gagnée.
 */
export default async function JjkdlePage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  if (!(await isGameEnabled("jjkdle"))) redirect("/games");
  const [{ scope }, roster, user] = await Promise.all([
    searchParams,
    getRoster(),
    getCurrentUser(),
  ]);

  const eligibleCount = eligibleRoster(roster).length;
  const isAdmin = user?.role === "ADMIN";
  const isVip = user?.role === "VIP";
  // Streak courant pour l'en-tête (affiché si > 0).
  const streak = user
    ? (
        await prisma.user.findUnique({
          where: { id: user.id },
          select: { jjkdleStreak: true },
        })
      )?.jjkdleStreak ?? 0
    : 0;

  // Réhydratation de l'état (si toujours valide).
  const map = Object.fromEntries(roster.map((c) => [c.id, c]));
  let rows: GuessRow[] = [];
  let status: GameStatus = "playing";
  let mode: GameMode = "daily";
  let revealed: JJKdleRevealed = null;
  let vipReplaysUsed = 0;

  const dailyTarget = await resolveDailyTarget(roster);
  const state = await readState();
  if (state && isStateFresh(state, roster, dailyTarget?.id)) {
    mode = state.mode;
    status = state.status;
    rows = buildRows(state, map);
    if (state.mode === "vip") vipReplaysUsed = state.replays ?? 0;
    if (status === "won") {
      const t = map[state.targetId];
      if (t) {
        revealed = {
          id: t.id,
          name: t.name,
          title: t.title,
          ...(t.image ? { image: t.image } : {}),
        };
      }
    }
  }

  // Roster public pour l'autocomplétion (les indices/valeurs sont calculés et
  // renvoyés ligne par ligne par le serveur, donc rien d'autre à transmettre).
  const publicRoster: PublicCharacter[] = roster.map((c) => ({
    id: c.id,
    name: c.name,
    ...(c.image ? { image: c.image } : {}),
  }));

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
      {streak > 0 && (
        <p className="mb-3 text-center text-sm font-bold text-amber-300">
          🔥 {streak} jour{streak > 1 ? "s" : ""} d&apos;affilée
        </p>
      )}
      <JJKdleGame
        roster={publicRoster}
        eligibleCount={eligibleCount}
        initialRows={rows}
        initialStatus={status}
        mode={mode}
        isAdmin={isAdmin}
        isVip={isVip}
        isAuthed={Boolean(user)}
        vipReplaysUsed={vipReplaysUsed}
        msUntilMidnight={msUntilMidnight()}
        initialRevealed={revealed}
      />

      <div className="mt-10">
        <JjkdleLeaderboard limit={8} scope={parseScope(scope)} />
      </div>
    </main>
  );
}

type JJKdleRevealed = {
  id: string;
  name: string;
  title: string;
  image?: string;
} | null;
