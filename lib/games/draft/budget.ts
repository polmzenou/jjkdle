import type { DraftCharacter, DraftCategoryId, DraftPick, DraftSelection } from "./types";
import { DRAFT_CATEGORIES } from "./categories";
import { BUDGET } from "./scoring";
import { DRAFT_ROSTER_BY_ID } from "./roster";

/**
 * Aide au budget du draft (pure, testable). Garantit que le joueur peut
 * toujours compléter ses 8 slots : une carte n'est sélectionnable que si, après
 * l'avoir prise, il reste de quoi remplir les autres catégories vides au coût
 * minimum proposé dans leur ligne (forward-checking).
 */

/** Coût mini proposé dans chaque ligne du tirage. */
export function minCostByCategory(
  draw: DraftPick,
): Record<DraftCategoryId, number> {
  const out = {} as Record<DraftCategoryId, number>;
  for (const cat of DRAFT_CATEGORIES) {
    out[cat.id] = Math.min(...draw[cat.id].map((c) => c.cost));
  }
  return out;
}

/**
 * Une carte `character` est-elle sélectionnable dans `categoryId`, compte tenu
 * de la sélection courante et du tirage ? (le pick éventuel déjà présent dans
 * cette catégorie est remplacé).
 */
export function canSelect(
  selection: DraftSelection,
  draw: DraftPick,
  categoryId: DraftCategoryId,
  character: DraftCharacter,
  rosterById: Record<string, DraftCharacter> = DRAFT_ROSTER_BY_ID,
): boolean {
  const mins = minCostByCategory(draw);
  let spentOthers = 0;
  let minRemaining = 0;

  for (const cat of DRAFT_CATEGORIES) {
    if (cat.id === categoryId) continue;
    const pickedId = selection[cat.id];
    if (pickedId) {
      spentOthers += rosterById[pickedId]?.cost ?? 0;
    } else {
      minRemaining += mins[cat.id];
    }
  }

  return spentOthers + character.cost + minRemaining <= BUDGET;
}
