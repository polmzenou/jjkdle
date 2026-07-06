"use server";

import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { getAdminUser, getAdminOrVipUser } from "@/lib/auth/session";
import { upsertCharacter, deleteCharacter, readRoster } from "@/lib/admin/roster-store";
import {
  refreshAllRosterImages,
  type ImageRefreshResult,
} from "@/lib/admin/booru";
import { clearImageCache } from "@/lib/admin/image-cache";
import {
  getUserRole,
  setUserRole,
  deleteUser,
  applyUserXpBonus,
  setUserTotalXp,
  grantBadge,
  revokeBadge,
} from "@/lib/admin/users";
import { levelToMinXp } from "@/lib/progress/xp";
import { refreshLevelAndBadges } from "@/lib/progress/recompute";
import { isBadgeKey } from "@/lib/badges/definitions";
import { isTitleKey } from "@/lib/titles/definitions";
import { isFrameKey } from "@/lib/frames/definitions";
import {
  grantTitle,
  revokeTitle,
  grantFrame,
  revokeFrame,
} from "@/lib/cosmetics/grants";
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
import {
  adminUpdateJjkdleScore,
  adminDeleteJjkdleScore,
} from "@/lib/games/jjkdle/leaderboard";
import {
  adminUpdateHigherLowerScore,
  adminDeleteHigherLowerScore,
} from "@/lib/games/higher-lower/store";
import { DRAFT_CATEGORY_BY_ID } from "@/lib/games/draft/categories";
import type {
  DraftCharacter,
  DraftCategoryId,
  DraftTier,
} from "@/lib/games/draft/types";
import type { Character, CharacterTier } from "@/data/roster/characters";
import { CATEGORY_BY_ID, type CategoryId } from "@/data/roster/categories";
import {
  RACES,
  GENDERS,
  GRADES_ORDER,
  AFFILIATIONS,
  CLANS,
  ARCS_ORDER,
} from "@/lib/games/jjkdle/attributes";

export type ActionResult = { ok: boolean; error?: string };

const TIERS: CharacterTier[] = ["4minus", "4", "3", "2", "1", "s"];
const GAMES: LeaderboardGame[] = ["builder", "ranking"];
const DRAFT_GAME = "jujutsu-draft";
const JJKDLE_GAME = "jjkdle";
const HIGHER_LOWER_GAME = "higher-lower";
const JJKDLE_MAX_ATTEMPTS = 999; // garde-fou : nombre d'essais réaliste
const HIGHER_LOWER_MAX_SCORE = 100000; // garde-fou : score réaliste (bonnes réponses)
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

  // battleValue : optionnel, entier borné 0–100 (cohérent avec le barème fourni).
  let battleValue: number | undefined;
  if (input.battleValue != null && `${input.battleValue}` !== "") {
    const n = Number(input.battleValue);
    if (Number.isFinite(n)) {
      battleValue = Math.max(0, Math.min(100, Math.round(n)));
    }
  }

  // ── Attributs JJKdle : chaque enum validé contre ses valeurs ; omis si vide.
  const jjkdle: Partial<
    Pick<
      Character,
      | "race"
      | "gender"
      | "grade"
      | "affiliation"
      | "clan"
      | "appearanceArc"
      | "hasDomain"
      | "cursedEnergy"
    >
  > = {};
  if (input.race && RACES.includes(input.race)) jjkdle.race = input.race;
  if (input.gender && GENDERS.includes(input.gender)) jjkdle.gender = input.gender;
  if (input.grade && GRADES_ORDER.includes(input.grade)) jjkdle.grade = input.grade;
  if (input.affiliation && AFFILIATIONS.includes(input.affiliation))
    jjkdle.affiliation = input.affiliation;
  if (input.clan && CLANS.includes(input.clan)) jjkdle.clan = input.clan;
  if (input.appearanceArc && ARCS_ORDER.includes(input.appearanceArc))
    jjkdle.appearanceArc = input.appearanceArc;
  if (typeof input.hasDomain === "boolean") jjkdle.hasDomain = input.hasDomain;
  if (input.cursedEnergy != null && `${input.cursedEnergy}` !== "") {
    const ce = Number(input.cursedEnergy);
    if (Number.isFinite(ce) && ce >= 0) jjkdle.cursedEnergy = Math.round(ce);
  }

  const char: Character = {
    id,
    name,
    title: String(input.title ?? "").trim(),
    tier: input.tier,
    ...(image ? { image } : {}),
    ratings,
    ...(battleValue != null ? { battleValue } : {}),
    ...jjkdle,
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

/**
 * Bouton « OUAIS » : récupère automatiquement une image depuis l'API booru pour
 * les personnages FÉMININS du roster (gender === FEMALE en base) et met leur URL
 * d'image en cache. Le roster Jujutsu Draft n'a pas d'attribut de genre : il est
 * donc exclu. Réservé ADMIN et VIP.
 */
export async function refreshRosterImagesFromApiAction(): Promise<ImageRefreshResult> {
  const fail = (error: string): ImageRefreshResult => ({
    ok: false,
    error,
    builderUpdated: 0,
    draftUpdated: 0,
    notFound: 0,
    failed: 0,
    total: 0,
  });

  if (!(await getAdminOrVipUser())) {
    return fail("Accès réservé aux administrateurs et VIP.");
  }

  let roster: Character[];
  try {
    roster = await readRoster();
  } catch (e) {
    return fail(`Lecture du roster impossible : ${(e as Error).message}`);
  }

  // Filtre demandé : uniquement les persos marqués FEMALE en base.
  const females = roster.filter((c) => c.gender === "FEMALE");

  let summary: Omit<ImageRefreshResult, "ok" | "error">;
  try {
    summary = await refreshAllRosterImages(females, []);
  } catch (e) {
    return fail((e as Error).message);
  }

  revalidatePath("/", "layout"); // hub + jeux + admin relisent le roster
  return { ok: true, ...summary };
}

/** Vide le cache d'images « OUAIS » : les persos retombent sur l'image en base. */
export async function clearImageCacheAction(): Promise<ActionResult> {
  if (!(await getAdminOrVipUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs et VIP." };
  }
  clearImageCache();
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

  // JJKdle : table dédiée, métrique = nombre d'essais (≥ 1, moins = mieux).
  if (game === JJKDLE_GAME) {
    const attempts = Math.round(Number(scoreRaw));
    if (!Number.isFinite(attempts) || attempts < 1 || attempts > JJKDLE_MAX_ATTEMPTS) {
      return { ok: false, error: `Nombre d'essais invalide (1 à ${JJKDLE_MAX_ATTEMPTS}).` };
    }
    try {
      await adminUpdateJjkdleScore(id, attempts);
    } catch (e) {
      return { ok: false, error: `Échec de modification : ${(e as Error).message}` };
    }
    revalidatePath("/games/jjkdle");
    revalidatePath("/admin");
    return { ok: true };
  }

  // Higher/Lower : table dédiée, métrique = nombre de bonnes réponses (≥ 0).
  if (game === HIGHER_LOWER_GAME) {
    const s = Math.round(Number(scoreRaw));
    if (!Number.isFinite(s) || s < 0 || s > HIGHER_LOWER_MAX_SCORE) {
      return { ok: false, error: `Score invalide (0 à ${HIGHER_LOWER_MAX_SCORE}).` };
    }
    try {
      await adminUpdateHigherLowerScore(id, s);
    } catch (e) {
      return { ok: false, error: `Échec de modification : ${(e as Error).message}` };
    }
    revalidatePath("/games/higher-lower");
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

  if (game === JJKDLE_GAME) {
    try {
      await adminDeleteJjkdleScore(id);
    } catch (e) {
      return { ok: false, error: `Échec de suppression : ${(e as Error).message}` };
    }
    revalidatePath("/games/jjkdle");
    revalidatePath("/admin");
    return { ok: true };
  }

  if (game === HIGHER_LOWER_GAME) {
    try {
      await adminDeleteHigherLowerScore(id);
    } catch (e) {
      return { ok: false, error: `Échec de suppression : ${(e as Error).message}` };
    }
    revalidatePath("/games/higher-lower");
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
  if (role !== "ADMIN" && role !== "PLAYER" && role !== "VIP") {
    return { ok: false, error: "Rôle invalide." };
  }

  const current = await getUserRole(userId);
  if (!current) {
    return { ok: false, error: "Utilisateur introuvable." };
  }

  // Protection : on ne rétrograde/modifie jamais un administrateur.
  if (current === "ADMIN" && role !== "ADMIN") {
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

// ──────────────────────────────────────────────────────────────────────────
// Progression (administration : XP, niveau, badges de n'importe quel joueur)
// ──────────────────────────────────────────────────────────────────────────

const XP_BONUS_LIMIT = 1_000_000;

/** Fixe le bonus d'XP manuel (additif, persistant) puis recalcule niveau/badges. */
export async function adminSetXpBonusAction(
  userId: string,
  xpBonusRaw: number,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  const xpBonus = Math.round(Number(xpBonusRaw));
  if (!Number.isFinite(xpBonus) || Math.abs(xpBonus) > XP_BONUS_LIMIT) {
    return { ok: false, error: `Bonus invalide (−${XP_BONUS_LIMIT} à ${XP_BONUS_LIMIT}).` };
  }
  try {
    // Applique le delta de bonus sur l'accumulateur `totalXp`, puis recalcule.
    await applyUserXpBonus(userId, xpBonus);
    await refreshLevelAndBadges(userId);
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Fixe le NIVEAU cible d'un joueur : place directement l'XP totale au seuil
 * d'entrée du niveau visé (`levelToMinXp`), puis recalcule niveau + badges. Les
 * parties futures ajoutent leur EXP par-dessus (modèle accumulatif).
 */
export async function adminSetLevelAction(
  userId: string,
  levelRaw: number,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  const level = Math.round(Number(levelRaw));
  if (!Number.isFinite(level) || level < 1 || level > 999) {
    return { ok: false, error: "Niveau invalide (1 à 999)." };
  }
  try {
    await setUserTotalXp(userId, levelToMinXp(level));
    await refreshLevelAndBadges(userId);
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  revalidatePath("/admin");
  return { ok: true };
}

/** Accorde un badge à un joueur (idempotent). `targetUserId` peut être l'admin. */
export async function adminGrantBadgeAction(
  userId: string,
  badgeKey: string,
): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  if (!isBadgeKey(badgeKey)) {
    return { ok: false, error: "Badge inconnu." };
  }
  try {
    await grantBadge(userId, badgeKey, admin.id);
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Retire un badge à un joueur. Note : un badge DÉRIVÉ encore mérité se
 * redébloquera à la prochaine partie ; le retrait n'est définitif que pour les
 * badges manuels.
 */
export async function adminRevokeBadgeAction(
  userId: string,
  badgeKey: string,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  try {
    await revokeBadge(userId, badgeKey);
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  revalidatePath("/admin");
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────────────────
// Titres & cadres (octroi/retrait MANUEL admin — couche « grant », cf. §5).
//
// Le retrait d'un grant n'enlève PAS un déblocage dérivé : si le joueur remplit
// toujours la condition naturelle (ou est admin), l'item reste débloqué. Ces
// actions n'agissent que sur la table de grant.
// ──────────────────────────────────────────────────────────────────────────

/** Octroie un titre à un joueur (idempotent). `userId` peut être l'admin lui-même. */
export async function adminGrantTitleAction(
  userId: string,
  titleKey: string,
): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  if (!isTitleKey(titleKey)) {
    return { ok: false, error: "Titre inconnu." };
  }
  try {
    await grantTitle(userId, titleKey, admin.id);
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  revalidatePath("/admin");
  return { ok: true };
}

/** Retire l'octroi manuel d'un titre (no-op s'il n'existe pas). */
export async function adminRevokeTitleAction(
  userId: string,
  titleKey: string,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  try {
    await revokeTitle(userId, titleKey);
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  revalidatePath("/admin");
  return { ok: true };
}

/** Octroie un cadre à un joueur (idempotent). */
export async function adminGrantFrameAction(
  userId: string,
  frameKey: string,
): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  if (!isFrameKey(frameKey)) {
    return { ok: false, error: "Cadre inconnu." };
  }
  try {
    await grantFrame(userId, frameKey, admin.id);
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  revalidatePath("/admin");
  return { ok: true };
}

/** Retire l'octroi manuel d'un cadre (no-op s'il n'existe pas). */
export async function adminRevokeFrameAction(
  userId: string,
  frameKey: string,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  try {
    await revokeFrame(userId, frameKey);
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  revalidatePath("/admin");
  return { ok: true };
}
