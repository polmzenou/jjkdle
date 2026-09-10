"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { evaluateDraft, validateSelection } from "@/lib/games/draft/scoring";
import {
  getDraftBosses,
  getDraftCategories,
  getDraftRosterMap,
} from "@/lib/games/draft/queries";
import { awardExp } from "@/lib/progress/recompute";
import { draftExp } from "@/lib/progress/exp-rewards";
import type { ExpResult } from "@/lib/leaderboard/types";

/**
 * Octroi AUTOMATIQUE de l'XP du Jujutsu Draft en fin de partie, SANS
 * enregistrement au classement. Appelé à l'ouverture du modal de résultat pour
 * un utilisateur connecté.
 *
 * Anti-triche : comme la route de score, le serveur revalide la sélection et
 * RECALCULE le nombre de boss vaincus — le client ne fournit jamais l'XP.
 */
export async function awardDraftExpAction(draft: unknown): Promise<ExpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const [rosterById, bosses, categories] = await Promise.all([
    getDraftRosterMap(),
    getDraftBosses(),
    getDraftCategories(),
  ]);
  const validation = validateSelection(draft, categories, rosterById);
  if (!validation.ok) return { ok: false };

  const result = evaluateDraft(validation.selection, categories, rosterById, bosses);
  const { gained, gainedCoins, newBadges, droppedBooster } = await awardExp(
    user.id,
    draftExp(result.enemiesKilled),
    "jujutsu-draft",
  );
  return { ok: true, gainedExp: gained, gainedCoins, newBadges, droppedBooster };
}
