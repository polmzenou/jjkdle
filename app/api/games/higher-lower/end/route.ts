import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import {
  consumeSession,
  saveHigherLowerScore,
  HL_COOKIE,
} from "@/lib/games/higher-lower/store";
import { xpForScore } from "@/lib/games/higher-lower/types";
import { awardExp, refreshLevelAndBadges } from "@/lib/progress/recompute";

/**
 * POST /api/games/higher-lower/end
 *
 * Termine la partie : lit le score AUTORITAIRE en session (jamais fourni par le
 * client), octroie l'XP (via awardExp → User.totalXp agrégé) et persiste le
 * score + xpEarned. `consumeSession` supprime la session de façon atomique →
 * idempotent : un 2e appel ne trouve plus de session et n'octroie pas d'XP.
 * Invité : pas de persistance (needsAuth).
 */

export const dynamic = "force-dynamic";

export async function POST() {
  const store = await cookies();
  const runId = store.get(HL_COOKIE)?.value;
  store.delete(HL_COOKIE);
  if (!runId) {
    return NextResponse.json({ ok: true, score: 0, xpEarned: 0 });
  }

  const session = await consumeSession(runId);
  if (!session) {
    // Déjà terminée (double appel) → aucune double attribution.
    return NextResponse.json({ ok: true, score: 0, xpEarned: 0 });
  }

  const score = session.score;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: true, score, xpEarned: 0, needsAuth: true });
  }

  const xpEarned = xpForScore(score);
  await awardExp(user.id, xpEarned);
  await saveHigherLowerScore(user.id, score, xpEarned);
  const { newBadges } = await refreshLevelAndBadges(user.id);

  revalidatePath("/games/higher-lower");
  return NextResponse.json({ ok: true, score, xpEarned, newBadges });
}
