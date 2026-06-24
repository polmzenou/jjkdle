"use server";

import { revalidatePath } from "next/cache";
import {
  checkPassword,
  isAdminAuthed,
  setAdminCookie,
  clearAdminCookie,
} from "@/lib/admin/auth";
import {
  upsertCharacter,
  deleteCharacter,
  writesAllowed,
} from "@/lib/admin/roster-store";
import type { Character, CharacterTier } from "@/data/roster/characters";
import { CATEGORY_BY_ID, type CategoryId } from "@/data/roster/categories";

export type ActionResult = { ok: boolean; error?: string };

const TIERS: CharacterTier[] = ["4minus", "4", "3", "2", "1", "s"];

export async function loginAction(password: string): Promise<ActionResult> {
  if (!checkPassword(password)) {
    return { ok: false, error: "Mot de passe incorrect." };
  }
  await setAdminCookie();
  return { ok: true };
}

export async function logoutAction(): Promise<void> {
  await clearAdminCookie();
}

/** Valide + enregistre (ajout ou édition) un personnage dans le JSON. */
export async function saveCharacterAction(
  input: Character,
): Promise<ActionResult> {
  if (!(await isAdminAuthed())) return { ok: false, error: "Non authentifié." };
  if (!writesAllowed()) {
    return {
      ok: false,
      error:
        "Écriture impossible sur Vercel (filesystem en lecture seule). Édite en local puis commit/redeploy.",
    };
  }

  const id = String(input.id ?? "").trim();
  const name = String(input.name ?? "").trim();

  if (!/^[a-z0-9-]+$/.test(id)) {
    return {
      ok: false,
      error: "L'identifiant doit être en minuscules (lettres, chiffres, tirets).",
    };
  }
  if (!name) return { ok: false, error: "Le nom est obligatoire." };
  if (!TIERS.includes(input.tier)) {
    return { ok: false, error: "Tier invalide." };
  }

  // Nettoyage des ratings : uniquement des catégories connues, valeurs 0–100.
  const ratings: Partial<Record<CategoryId, number>> = {};
  for (const [key, raw] of Object.entries(input.ratings ?? {})) {
    if (!(key in CATEGORY_BY_ID)) continue;
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    ratings[key as CategoryId] = Math.max(0, Math.min(100, Math.round(n)));
  }

  const image = String(input.image ?? "").trim();

  const char: Character = {
    id,
    name,
    title: String(input.title ?? "").trim(),
    tier: input.tier,
    ...(image ? { image } : {}),
    ratings,
  };

  try {
    await upsertCharacter(char);
  } catch (e) {
    return { ok: false, error: `Échec d'écriture : ${(e as Error).message}` };
  }

  revalidatePath("/", "layout"); // hub + jeux + admin relisent le roster
  return { ok: true };
}

export async function deleteCharacterAction(id: string): Promise<ActionResult> {
  if (!(await isAdminAuthed())) return { ok: false, error: "Non authentifié." };
  if (!writesAllowed()) {
    return { ok: false, error: "Suppression impossible sur Vercel (lecture seule)." };
  }
  try {
    await deleteCharacter(id);
  } catch (e) {
    return { ok: false, error: `Échec de suppression : ${(e as Error).message}` };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
