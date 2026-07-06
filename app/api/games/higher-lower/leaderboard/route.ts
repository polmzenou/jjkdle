import { NextResponse } from "next/server";
import { topHigherLowerEntries } from "@/lib/games/higher-lower/store";
import { parseScope } from "@/lib/leaderboard/store";

/**
 * GET /api/games/higher-lower/leaderboard?limit=20&scope=all-time
 *   → top scores (meilleur par joueur, score décroissant). Lecture seule.
 */

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit")) || 20),
  );
  const scope = parseScope(searchParams.get("scope"));
  const entries = await topHigherLowerEntries(limit, scope);
  return NextResponse.json({ entries });
}
