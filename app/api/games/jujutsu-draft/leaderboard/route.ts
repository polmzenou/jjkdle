import { NextResponse } from "next/server";
import { topDraftEntries } from "@/lib/games/draft/store";

/**
 * GET /api/games/jujutsu-draft/leaderboard?limit=20
 *   → top scores (ennemis vaincus décroissant). Lecture seule ;
 *     l'enregistrement passe par POST .../score (session requise).
 */

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit")) || 20),
  );
  const entries = await topDraftEntries(limit);
  return NextResponse.json({ entries });
}
