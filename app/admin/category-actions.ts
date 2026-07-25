"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/auth/session";
import {
  upsertCategory,
  deleteCategory,
  moveCategory,
  type CategoryInput,
} from "@/lib/admin/category-store";
import { revalidateUniversePath } from "@/lib/universes/current";

/**
 * Actions d'édition des CATÉGORIES du builder.
 *
 * Volontairement dans un fichier SÉPARÉ de `app/admin/actions.ts` : ces actions
 * sont aussi appelées depuis le panneau admin de la vue builder — une page
 * publique, qui ne doit pas embarquer tout le module d'admin (utilisateurs,
 * classements, synchro d'images…).
 *
 * Elles n'ont pas de paramètre d'univers : le store cible l'univers COURANT, qui
 * vaut l'univers administré sur /admin (cookie) et celui de l'URL sur
 * /csm/games/builder. Le même appel écrit donc au bon endroit dans les deux cas.
 */

export type ActionResult = { ok: boolean; error?: string };

const MAX_LABEL = 40;
const MAX_DESCRIPTION = 160;

/** Invalide le builder (jeu + multi) et l'admin de l'univers modifié. */
async function revalidateCategories(): Promise<void> {
  await revalidateUniversePath("/games/builder");
  await revalidateUniversePath("/games/multiplayer");
  revalidatePath("/admin");
}

/** Crée ou met à jour une catégorie de l'univers courant. */
export async function saveCategoryAction(
  input: CategoryInput,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }

  const label = String(input.label ?? "").trim();
  const description = String(input.description ?? "").trim();
  if (!label) return { ok: false, error: "Le libellé est obligatoire." };
  if (label.length > MAX_LABEL) {
    return { ok: false, error: `Libellé trop long (max ${MAX_LABEL} caractères).` };
  }
  if (description.length > MAX_DESCRIPTION) {
    return {
      ok: false,
      error: `Description trop longue (max ${MAX_DESCRIPTION} caractères).`,
    };
  }

  const weight = Number(input.weight);
  const drawCount = Number(input.drawCount);
  if (!Number.isFinite(weight) || weight <= 0) {
    return { ok: false, error: "Le poids doit être un nombre supérieur à 0." };
  }
  if (!Number.isFinite(drawCount) || drawCount < 1) {
    return { ok: false, error: "Le nombre de tirages doit valoir au moins 1." };
  }

  try {
    await upsertCategory({
      ...(input.id ? { id: input.id } : {}),
      label,
      description,
      weight,
      drawCount,
      ...(input.position != null ? { position: Number(input.position) } : {}),
    });
  } catch (e) {
    // Collision de slug (@@unique([universeId, slug])) ou écriture refusée.
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  await revalidateCategories();
  return { ok: true };
}

/** Supprime une catégorie (et les notes des personnages sur celle-ci). */
export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  try {
    await deleteCategory(id);
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  await revalidateCategories();
  return { ok: true };
}

/** Monte ou descend une catégorie dans l'ordre d'affichage du builder. */
export async function moveCategoryAction(
  id: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  try {
    await moveCategory(id, direction);
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  await revalidateCategories();
  return { ok: true };
}
