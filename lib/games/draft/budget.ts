import type { DraftCharacter, DraftCategoryId, DraftPick, DraftSelection } from "./types";
import { personOf } from "./types";
import type { DraftCategory } from "./categories";
import { BUDGET } from "./scoring";
import { DRAFT_ROSTER_BY_ID } from "./roster";

/**
 * Aide au budget du draft (pure, testable). Garantit que le joueur peut
 * toujours compléter ses 8 slots : une carte n'est sélectionnable que si, après
 * l'avoir prise, il reste de quoi remplir les autres catégories vides au coût
 * minimum proposé dans leur ligne (forward-checking).
 *
 * `canSelect` refuse aussi un personnage DÉJÀ pris dans une autre catégorie.
 * Le roster importé propose le même visage sous plusieurs cartes ; le tirage
 * évite de les montrer ensemble, mais quand une catégorie manque de monde il
 * n'a plus le choix. Sans ce garde-fou, le joueur pouvait composer une équipe
 * que `validateSelection` rejette ensuite côté serveur — combat joué, score
 * jamais enregistré.
 */

/** Coût mini proposé dans chaque ligne du tirage. */
export function minCostByCategory(
  draw: DraftPick,
  categories: DraftCategory[],
): Record<DraftCategoryId, number> {
  const out = {} as Record<DraftCategoryId, number>;
  for (const cat of categories) {
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
  categories: DraftCategory[],
  categoryId: DraftCategoryId,
  character: DraftCharacter,
  rosterById: Record<string, DraftCharacter> = DRAFT_ROSTER_BY_ID,
): boolean {
  const mins = minCostByCategory(draw, categories);
  const person = personOf(character);
  let spentOthers = 0;
  let minRemaining = 0;

  for (const cat of categories) {
    if (cat.id === categoryId) continue;
    const pickedId = selection[cat.id];
    if (pickedId) {
      const picked = rosterById[pickedId];
      // Même personne déjà draftée ailleurs : carte verrouillée.
      if (picked && personOf(picked) === person) return false;
      spentOthers += picked?.cost ?? 0;
    } else {
      minRemaining += mins[cat.id];
    }
  }

  return spentOthers + character.cost + minRemaining <= BUDGET;
}
