"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/auth/session";
import {
  upsertRankingCondition,
  deleteRankingCondition,
  moveRankingCondition,
  setRankingTiebreak,
  importCategoryConditions,
  type ImportReport,
  type RankingConditionInput,
} from "@/lib/admin/ranking-store";
import { revalidateUniversePath } from "@/lib/universes/current";
import { SLOT_COUNT } from "@/data/ranking/conditions";

/**
 * Actions d'édition des CONSIGNES du Pyramid.
 *
 * Même découpage que `category-actions.ts` : fichier séparé de l'énorme
 * `app/admin/actions.ts`, et univers résolu par le store (donc l'univers
 * administré ici, et celui de l'URL si un jour un panneau in-game les appelle).
 */

export type ActionResult = { ok: boolean; error?: string };

/** Invalide le Pyramid de l'univers modifié, et l'admin. */
async function revalidateConditions(): Promise<void> {
  await revalidateUniversePath("/games/ranking");
  revalidatePath("/admin");
}

/** Crée ou met à jour une consigne de l'univers courant. */
export async function saveRankingConditionAction(
  input: RankingConditionInput,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }

  const category = String(input.category ?? "").trim();
  const prompt = String(input.prompt ?? "").trim();
  if (!category) {
    return { ok: false, error: "Le critère (titre) est obligatoire." };
  }
  if (!prompt) return { ok: false, error: "La consigne est obligatoire." };

  const order = Array.isArray(input.order) ? input.order : [];
  const filled = order.filter((id) => String(id ?? "").trim() !== "");
  if (filled.length !== SLOT_COUNT) {
    return {
      ok: false,
      error: `Classement incomplet : ${filled.length}/${SLOT_COUNT} rangs renseignés.`,
    };
  }

  try {
    // Le store revalide l'unicité et l'appartenance des 8 personnages à
    // l'univers : c'est lui qui a le dernier mot, pas ce pré-contrôle.
    await upsertRankingCondition({
      ...(input.id ? { id: input.id } : {}),
      pool: String(input.pool ?? ""),
      category,
      prompt,
      order: filled,
    });
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  await revalidateConditions();
  return { ok: true };
}

/** Supprime une consigne. */
export async function deleteRankingConditionAction(
  id: string,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  try {
    await deleteRankingCondition(id);
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  await revalidateConditions();
  return { ok: true };
}

/**
 * Bouton « Importer les catégories » : une consigne par catégorie du builder,
 * classement dérivé des notes du roster puis maintenu automatiquement.
 */
export async function importCategoryConditionsAction(): Promise<
  ActionResult & { report?: ImportReport }
> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  let report: ImportReport;
  try {
    report = await importCategoryConditions();
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  await revalidateConditions();
  return { ok: true, report };
}

/** Enregistre l'arbitrage d'égalités d'une consigne dérivée (ordre rang 1→8). */
export async function saveRankingTiebreakAction(
  id: string,
  order: string[],
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  if (!Array.isArray(order) || order.some((v) => typeof v !== "string")) {
    return { ok: false, error: "Arbitrage invalide." };
  }
  if (new Set(order).size !== order.length) {
    return { ok: false, error: "Un personnage apparaît deux fois." };
  }
  try {
    await setRankingTiebreak(id, order);
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  await revalidateConditions();
  return { ok: true };
}

/** Monte ou descend une consigne dans la liste d'administration. */
export async function moveRankingConditionAction(
  id: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  try {
    await moveRankingCondition(id, direction);
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  await revalidateConditions();
  return { ok: true };
}
