"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/auth/session";
import { upsertCharacter, deleteCharacter } from "@/lib/admin/roster-store";
import {
  adminUpdateScore,
  adminDeleteScore,
  MAX_SCORE,
  type LeaderboardGame,
} from "@/lib/leaderboard/store";
import type { Character, CharacterTier } from "@/data/roster/characters";
import { CATEGORY_BY_ID, type CategoryId } from "@/data/roster/categories";

export type ActionResult = { ok: boolean; error?: string };

const TIERS: CharacterTier[] = ["4minus", "4", "3", "2", "1", "s"];
const GAMES: LeaderboardGame[] = ["builder", "ranking"];

/** Valide + enregistre (ajout ou édition) un personnage en base. */
export async function saveCharacterAction(
  input: Character,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
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
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  try {
    await deleteCharacter(id);
  } catch (e) {
    return { ok: false, error: `Échec de suppression : ${(e as Error).message}` };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────────────────
// Leaderboard (administration des scores)
// ──────────────────────────────────────────────────────────────────────────

/** Modifie la valeur d'un score (validée selon le maximum du jeu). */
export async function updateScoreAction(
  id: string,
  game: string,
  scoreRaw: number,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  if (!GAMES.includes(game as LeaderboardGame)) {
    return { ok: false, error: "Jeu inconnu." };
  }
  const score = Math.round(Number(scoreRaw));
  const max = MAX_SCORE[game as LeaderboardGame];
  if (!Number.isFinite(score) || score < 0 || score > max) {
    return { ok: false, error: `Score invalide (0 à ${max}).` };
  }
  try {
    await adminUpdateScore(id, score);
  } catch (e) {
    return { ok: false, error: `Échec de modification : ${(e as Error).message}` };
  }
  revalidatePath(`/games/${game}`);
  revalidatePath("/admin");
  return { ok: true };
}

/** Supprime un score du leaderboard. */
export async function deleteScoreAction(
  id: string,
  game: string,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  try {
    await adminDeleteScore(id);
  } catch (e) {
    return { ok: false, error: `Échec de suppression : ${(e as Error).message}` };
  }
  revalidatePath(`/games/${game}`);
  revalidatePath("/admin");
  return { ok: true };
}
