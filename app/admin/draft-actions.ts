"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/auth/session";
import { revalidateUniversePath } from "@/lib/universes/current";
import {
  importDraftRoster,
  type DraftImportReport,
} from "@/lib/admin/draft-import";
import {
  upsertDraftBoss,
  deleteDraftBoss,
  moveDraftBoss,
  type DraftBossInput,
} from "@/lib/admin/draft-store";

/**
 * Actions du jeu « Jujutsu Draft » : import automatique du roster et édition
 * des boss.
 *
 * Même découpage que `ranking-actions.ts` : fichier séparé de l'énorme
 * `app/admin/actions.ts` (qui garde l'édition personnage par personnage), et
 * univers résolu par les stores — donc l'univers administré.
 */

export type ActionResult = { ok: boolean; error?: string };

/** Invalide le draft de l'univers modifié, et l'admin. */
async function revalidateDraft(): Promise<void> {
  await revalidateUniversePath("/games/jujutsu-draft");
  revalidatePath("/admin");
}

/**
 * Bouton « Tout importer » : régénère le roster draft depuis les notes du
 * roster builder et pose les boss par défaut de l'univers.
 */
export async function importDraftRosterAction(): Promise<
  ActionResult & { report?: DraftImportReport }
> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  let report: DraftImportReport;
  try {
    report = await importDraftRoster();
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  await revalidateDraft();
  return { ok: true, report };
}

/** Borne des PV : au-delà, aucune équipe légale ne peut vaincre le boss. */
const MAX_THRESHOLD = 999;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Crée ou met à jour un boss de l'univers courant. */
export async function saveDraftBossAction(
  input: DraftBossInput,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }

  const name = String(input.name ?? "").trim();
  if (!name) return { ok: false, error: "Le nom du boss est obligatoire." };

  const slug = slugify(String(input.slug ?? "") || name);
  if (!slug) return { ok: false, error: "Identifiant de boss invalide." };

  const threshold = Number(input.threshold);
  if (!Number.isInteger(threshold) || threshold < 1 || threshold > MAX_THRESHOLD) {
    return { ok: false, error: `PV invalides (1 à ${MAX_THRESHOLD}).` };
  }

  try {
    await upsertDraftBoss({
      ...(input.id ? { id: input.id } : {}),
      slug,
      name,
      threshold,
      characterId: input.characterId || null,
      image: input.image?.trim() || null,
    });
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  await revalidateDraft();
  return { ok: true };
}

/** Supprime un boss. */
export async function deleteDraftBossAction(id: string): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  try {
    await deleteDraftBoss(id);
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  await revalidateDraft();
  return { ok: true };
}

/** Monte ou descend un boss dans l'ordre d'affrontement. */
export async function moveDraftBossAction(
  id: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  try {
    await moveDraftBoss(id, direction);
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  await revalidateDraft();
  return { ok: true };
}
