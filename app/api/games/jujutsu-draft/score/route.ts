import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { evaluateDraft, validateSelection } from "@/lib/games/draft/scoring";
import {
  getDraftBosses,
  getDraftCategories,
  getDraftRosterMap,
} from "@/lib/games/draft/queries";
import { saveDraftScore } from "@/lib/games/draft/store";
import { refreshLevelAndBadges } from "@/lib/progress/recompute";

/**
 * POST /api/games/jujutsu-draft/score
 *
 * Body : { draft: { [categoryId]: characterId } }.
 *
 * Anti-triche : le score n'est jamais fourni par le client. Le serveur valide
 * la sélection (8 catégories, persos connus, personnes distinctes, budget ≤
 * BUDGET) puis RECALCULE `globalScore` + `enemiesKilled` contre les boss de
 * l'univers, et n'enregistre que si c'est un nouveau record perso. Exige une
 * session authentifiée.
 */

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, needsAuth: true, error: "Connecte-toi pour enregistrer ton score." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }

  // Roster et boss autoritatifs (base) : on recalcule tout avec les valeurs
  // actuelles, pas celles que le client croyait avoir.
  const [rosterById, bosses, categories] = await Promise.all([
    getDraftRosterMap(),
    getDraftBosses(),
    getDraftCategories(),
  ]);

  const draft = (body as { draft?: unknown } | null)?.draft;
  const validation = validateSelection(draft, categories, rosterById);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const result = evaluateDraft(validation.selection, categories, rosterById, bosses);
  const { best, isNewRecord } = await saveDraftScore(user.id, {
    enemiesKilled: result.enemiesKilled,
    globalScore: result.globalScore,
    outcome: result.outcome,
    draft: validation.selection,
  });

  // Classement uniquement : le nouveau best peut débloquer un badge (l'XP est
  // octroyée séparément à l'ouverture du modal de fin, hors enregistrement).
  const { newBadges } = await refreshLevelAndBadges(user.id);

  return NextResponse.json({
    ok: true,
    enemiesKilled: result.enemiesKilled,
    outcome: result.outcome,
    isNewRecord,
    best,
    newBadges,
  });
}
