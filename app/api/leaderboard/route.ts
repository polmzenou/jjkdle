import { NextResponse } from "next/server";
import { topEntries, type LeaderboardGame } from "@/lib/leaderboard/store";

/**
 * Endpoint leaderboard (lecture seule).
 *
 * GET /api/leaderboard?game=builder&limit=20
 *   → top scores du jeu demandé (ou des deux jeux si `game` absent).
 *
 * L'enregistrement d'un score se fait via Server Action (submitScoreAction),
 * qui exige une session authentifiée — il n'y a donc pas de POST ici.
 */

export const dynamic = "force-dynamic";

const GAMES: LeaderboardGame[] = ["builder", "ranking"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const gameParam = searchParams.get("game");
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit")) || 20),
  );

  if (gameParam) {
    if (!GAMES.includes(gameParam as LeaderboardGame)) {
      return NextResponse.json({ error: "Jeu inconnu." }, { status: 400 });
    }
    const entries = await topEntries(limit, gameParam as LeaderboardGame);
    return NextResponse.json({ game: gameParam, entries });
  }

  const [builder, ranking] = await Promise.all([
    topEntries(limit, "builder"),
    topEntries(limit, "ranking"),
  ]);
  return NextResponse.json({ builder, ranking });
}
