import { JJK_DRAFT_CONFIG } from "./config";
import type { DraftCategory } from "./categories";

/**
 * Catégories de test = celles de JJK, seul univers dont le roster de repli
 * (`DRAFT_ROSTER`) vit dans le code. Les libellés viennent normalement de la
 * base ; ici seul l'`id` compte.
 */
export const JJK_CATEGORIES: DraftCategory[] = JJK_DRAFT_CONFIG.categories.map(
  (id) => ({ id, label: id, description: "" }),
);
