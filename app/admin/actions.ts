"use server";

import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { getAdminUser } from "@/lib/auth/session";
import { upsertCharacter, deleteCharacter } from "@/lib/admin/roster-store";
import { getUserRole, setUserRole, deleteUser } from "@/lib/admin/users";
import {
  adminUpdateScore,
  adminDeleteScore,
  MAX_SCORE,
  type LeaderboardGame,
} from "@/lib/leaderboard/store";
import {
  upsertDraftCharacter,
  deleteDraftCharacter,
} from "@/lib/admin/draft-store";
import {
  adminUpdateDraftScore,
  adminDeleteDraftScore,
  DRAFT_MAX_KILLS,
} from "@/lib/games/draft/store";
import { DRAFT_CATEGORY_BY_ID } from "@/lib/games/draft/categories";
import type {
  DraftCharacter,
  DraftCategoryId,
  DraftTier,
} from "@/lib/games/draft/types";
import type { Character, CharacterTier } from "@/data/roster/characters";
import { CATEGORY_BY_ID, type CategoryId } from "@/data/roster/categories";

export type ActionResult = { ok: boolean; error?: string };

const TIERS: CharacterTier[] = ["4minus", "4", "3", "2", "1", "s"];
const GAMES: LeaderboardGame[] = ["builder", "ranking"];
const DRAFT_GAME = "jujutsu-draft";
const DRAFT_TIERS: DraftTier[] = ["S", "A", "B", "C"];

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
// Roster "Jujutsu Draft"
// ──────────────────────────────────────────────────────────────────────────

/** Valide + enregistre (ajout ou édition) un personnage du draft. */
export async function saveDraftCharacterAction(
  input: DraftCharacter,
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
  if (!(input.excellenceCategory in DRAFT_CATEGORY_BY_ID)) {
    return { ok: false, error: "Catégorie d'excellence invalide." };
  }
  if (!DRAFT_TIERS.includes(input.tier)) {
    return { ok: false, error: "Tier invalide (S, A, B ou C)." };
  }

  const cost = Math.round(Number(input.cost));
  const statValue = Math.round(Number(input.statValue));
  if (!Number.isFinite(cost) || cost < 0 || cost > 99) {
    return { ok: false, error: "Coût invalide (0 à 99)." };
  }
  if (!Number.isFinite(statValue) || statValue < 0 || statValue > 99) {
    return { ok: false, error: "StatValue invalide (0 à 99)." };
  }

  const image = String(input.image ?? "").trim();

  const char: DraftCharacter = {
    id,
    name,
    excellenceCategory: input.excellenceCategory as DraftCategoryId,
    tier: input.tier,
    cost,
    statValue,
    ...(image ? { image } : {}),
  };

  try {
    await upsertDraftCharacter(char);
  } catch (e) {
    return { ok: false, error: `Échec d'écriture : ${(e as Error).message}` };
  }

  revalidatePath("/games/jujutsu-draft");
  revalidatePath("/admin");
  return { ok: true };
}

/** Supprime un personnage du roster draft. */
export async function deleteDraftCharacterAction(
  id: string,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  try {
    await deleteDraftCharacter(id);
  } catch (e) {
    return { ok: false, error: `Échec de suppression : ${(e as Error).message}` };
  }
  revalidatePath("/games/jujutsu-draft");
  revalidatePath("/admin");
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

  // Draft : table dédiée, métrique = ennemis vaincus (0 à DRAFT_MAX_KILLS).
  if (game === DRAFT_GAME) {
    const kills = Math.round(Number(scoreRaw));
    if (!Number.isFinite(kills) || kills < 0 || kills > DRAFT_MAX_KILLS) {
      return { ok: false, error: `Score invalide (0 à ${DRAFT_MAX_KILLS}).` };
    }
    try {
      await adminUpdateDraftScore(id, kills);
    } catch (e) {
      return { ok: false, error: `Échec de modification : ${(e as Error).message}` };
    }
    revalidatePath("/games/jujutsu-draft");
    revalidatePath("/admin");
    return { ok: true };
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

  if (game === DRAFT_GAME) {
    try {
      await adminDeleteDraftScore(id);
    } catch (e) {
      return { ok: false, error: `Échec de suppression : ${(e as Error).message}` };
    }
    revalidatePath("/games/jujutsu-draft");
    revalidatePath("/admin");
    return { ok: true };
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

// ──────────────────────────────────────────────────────────────────────────
// Utilisateurs (gestion des rôles)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Change le rôle d'un utilisateur.
 * Règle : un administrateur ne peut PAS être rétrogradé (ADMIN → PLAYER refusé),
 * quel que soit l'admin qui le demande. La promotion PLAYER → ADMIN reste permise.
 */
export async function setUserRoleAction(
  userId: string,
  role: Role,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  if (role !== "ADMIN" && role !== "PLAYER") {
    return { ok: false, error: "Rôle invalide." };
  }

  const current = await getUserRole(userId);
  if (!current) {
    return { ok: false, error: "Utilisateur introuvable." };
  }

  // Protection : on ne rétrograde jamais un administrateur.
  if (current === "ADMIN" && role === "PLAYER") {
    return {
      ok: false,
      error: "Les administrateurs ne peuvent pas être rétrogradés.",
    };
  }

  if (current === role) {
    return { ok: true }; // aucun changement
  }

  try {
    await setUserRole(userId, role);
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Supprime un compte joueur. Règle : on ne peut PAS supprimer un administrateur
 * (comme pour la rétrogradation). Cascade DB : sessions + scores.
 */
export async function deleteUserAction(userId: string): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }

  const current = await getUserRole(userId);
  if (!current) {
    return { ok: false, error: "Utilisateur introuvable." };
  }
  if (current === "ADMIN") {
    return {
      ok: false,
      error: "Un administrateur ne peut pas être supprimé.",
    };
  }

  try {
    await deleteUser(userId);
  } catch (e) {
    return { ok: false, error: `Échec de suppression : ${(e as Error).message}` };
  }
  revalidatePath("/admin");
  return { ok: true };
}
