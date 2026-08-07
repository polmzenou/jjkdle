"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { Prisma, type AttributeKind, type Role } from "@prisma/client";
import {
  upsertAttribute,
  deleteAttribute,
  upsertAttributeOption,
  deleteAttributeOption,
  validateAttributeKey,
  type AttributeInput,
  type AttributeOptionInput,
} from "@/lib/admin/attribute-store";
import {
  getAdminUser,
  getAdminOrVipUser,
  getSuperAdminUser,
} from "@/lib/auth/session";
import {
  MIN_BET_CEIL,
  MIN_BET_FLOOR,
  setCasinoCardBack,
  setCasinoEnabled,
  setCasinoMinBet,
} from "@/lib/casino/config";
import { closeTable } from "@/lib/casino/store";
import { resetCasinoStats } from "@/lib/admin/casino";
import { upsertCharacter, deleteCharacter, readRoster } from "@/lib/admin/roster-store";
import {
  refreshAllRosterImages,
  type ImageRefreshResult,
} from "@/lib/admin/booru";
import { clearImageCache } from "@/lib/admin/image-cache";
import {
  getUserRole,
  setUserRole,
  setUsername,
  deleteUser,
  applyUserXpBonus,
  setUserTotalXp,
  setUserCoins,
  grantBadge,
  revokeBadge,
} from "@/lib/admin/users";
import { levelToMinXp } from "@/lib/progress/xp";
import { refreshLevelAndBadges } from "@/lib/progress/recompute";
import { isBadgeKey } from "@/lib/badges/definitions";
import { isTitleKey } from "@/lib/titles/definitions";
import { isFrameKey } from "@/lib/frames/definitions";
import { isBoosterKind, type BoosterKind } from "@/lib/cards/boosters";
import {
  createBooster,
  grantCard,
  openBooster,
  resolveCard,
  revokeCard,
} from "@/lib/cards/store";
import type { CardView, OpenedBooster } from "@/lib/cards/types";
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
import { normalizeTier, type Character } from "@/data/roster/characters";
import type { CategoryId } from "@/data/roster/categories";
import { getCategories } from "@/lib/content/queries";
import { eligibleRoster } from "@/lib/games/jjkdle/daily";
import { loadAttributeSchema } from "@/lib/games/jjkdle/attributes-db";
import {
  getCurrentUniverse,
  getCurrentUniverseSlug,
  listAvailableUniverses,
  revalidateUniversePath,
} from "@/lib/universes/current";
import {
  ADMIN_UNIVERSE_COOKIE,
  adminUniverseCookieOptions,
} from "@/lib/universes/admin-scope";
import { getGame } from "@/lib/games/registry";
import {
  setConfig,
  gameEnabledKey,
  maintenanceKey,
  forcedTargetKey,
  type MaintenanceConfig,
} from "@/lib/config/app-config";

export type ActionResult = { ok: boolean; error?: string };

/** Résultat d'un enregistrement de personnage : nomme l'univers écrit. */
export type SaveCharacterResult = ActionResult & { universe?: string };

const GAMES: LeaderboardGame[] = ["builder", "ranking"];
const DRAFT_GAME = "jujutsu-draft";
const JJKDLE_GAME = "jjkdle";
const HIGHER_LOWER_GAME = "higher-lower";
const JJKDLE_MAX_ATTEMPTS = 999; // garde-fou : nombre d'essais réaliste
const HIGHER_LOWER_MAX_SCORE = 100000; // garde-fou : score réaliste (bonnes réponses)
const DRAFT_TIERS: DraftTier[] = ["S", "A", "B", "C"];

/**
 * Valide + enregistre (ajout ou édition) un personnage en base.
 *
 * `expectedUniverse` est le slug que le CLIENT croit administrer. On le compare à
 * l'univers réellement résolu côté serveur et on refuse en cas d'écart : un
 * cookie d'admin désynchronisé (autre onglet, session reprise) faisait sinon
 * atterrir en silence un personnage dans le roster du mauvais anime.
 */
export async function saveCharacterAction(
  input: Character,
  expectedUniverse?: string,
): Promise<SaveCharacterResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }

  const universe = await getCurrentUniverse();
  if (expectedUniverse && expectedUniverse !== universe.slug) {
    return {
      ok: false,
      error: `Univers désynchronisé : le serveur cible « ${universe.slug} », pas « ${expectedUniverse} ». Recharge la page.`,
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
  // Tier normalisé (casse/espaces) : une ligne importée en « S » majuscule ne
  // correspondait à aucune option du <select>, qui affichait « s » tout en
  // renvoyant « S » — d'où un « Tier invalide » sur une fiche d'apparence saine.
  const tier = normalizeTier(input.tier);
  if (!tier) {
    return { ok: false, error: `Tier invalide : « ${String(input.tier)} ».` };
  }

  // Nettoyage des ratings contre les catégories de l'univers, lues EN BASE.
  // (Anciennement validées contre la liste JJK codée en dur : toute note d'un
  // autre anime était jetée en silence, et son builder tirait dans le vide.)
  const known = new Set((await getCategories(universe.id)).map((c) => c.id));
  const ratings: Partial<Record<CategoryId, number>> = {};
  for (const [key, raw] of Object.entries(input.ratings ?? {})) {
    if (!known.has(key)) continue;
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    ratings[key] = Math.max(0, Math.min(100, Math.round(n)));
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

  // ── Attributs DATA-DRIVEN : validés contre le SCHÉMA de l'univers courant
  // (valeur ∈ options de l'attribut, ou entier ≥ 0 pour un NUMERIC). Une clé
  // inconnue de l'univers ou une valeur invalide est ignorée — anti-tamper : on
  // ne fait jamais confiance au client, exactement comme l'ancienne validation
  // contre les enums.
  const schema = await loadAttributeSchema(universe.id);
  const attributes: Record<string, string | number> = {};
  for (const col of schema.columns) {
    const raw = input.attributes?.[col.key];
    if (raw == null || raw === "") continue;
    if (col.kind === "NUMERIC") {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0) attributes[col.key] = Math.round(n);
      continue;
    }
    const value = String(raw);
    if (col.options.some((o) => o.value === value)) attributes[col.key] = value;
  }

  const char: Character = {
    id,
    name,
    title: String(input.title ?? "").trim(),
    tier,
    ...(image ? { image } : {}),
    ratings,
    ...(battleValue != null ? { battleValue } : {}),
    attributes,
  };

  try {
    await upsertCharacter(char, universe.id);
  } catch (e) {
    return { ok: false, error: `Échec d'écriture : ${(e as Error).message}` };
  }

  revalidatePath("/", "layout"); // hub + jeux + admin relisent le roster
  return { ok: true, universe: universe.slug };
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

/** Supprime plusieurs personnages en une fois (multi-sélection admin). */
export async function deleteCharactersAction(
  ids: string[],
): Promise<ActionResult & { deleted: number }> {
  if (!(await getAdminUser())) {
    return { ok: false, deleted: 0, error: "Accès réservé aux administrateurs." };
  }
  let deleted = 0;
  const errors: string[] = [];
  for (const id of ids) {
    try {
      await deleteCharacter(id);
      deleted += 1;
    } catch (e) {
      errors.push(`${id} : ${(e as Error).message}`);
    }
  }
  revalidatePath("/", "layout");
  return {
    ok: errors.length === 0,
    deleted,
    ...(errors.length > 0 ? { error: errors.join(" · ") } : {}),
  };
}

/**
 * Bouton « OUAIS » : récupère automatiquement une image depuis l'API booru pour
 * les personnages du roster et met leur URL d'image en cache. Réservé ADMIN et VIP.
 *
 * Tout ce qui dépend de l'anime — tag de série, et attribut servant de filtre —
 * vient de `UniverseConfig.booru`. Les deux étaient codés en dur sur JJK
 * (`jujutsu_kaisen` via `.env`, et la clé d'attribut `gender`), si bien que sur un
 * autre univers le bouton ramenait les images du mauvais anime… ou ne trouvait
 * personne, la clé de l'attribut de sexe étant elle aussi propre à chaque univers.
 *
 * Le roster Jujutsu Draft reste exclu : il n'a pas d'attributs, donc aucun filtre
 * applicable.
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

  const universe = await getCurrentUniverse();
  const booru = universe.config.booru;
  if (!booru) {
    return fail(
      `Aucune synchro d'images configurée pour ${universe.config.name} (UniverseConfig.booru).`,
    );
  }

  let roster: Character[];
  try {
    roster = await readRoster();
  } catch (e) {
    return fail(`Lecture du roster impossible : ${(e as Error).message}`);
  }

  // Filtre optionnel sur un attribut data-driven (JJK : gender = FEMALE).
  const { filter } = booru;
  const targets = filter
    ? roster.filter((c) => c.attributes?.[filter.attributeKey] === filter.value)
    : roster;
  if (targets.length === 0) {
    return fail(
      filter
        ? `Aucun personnage avec ${filter.attributeKey} = ${filter.value} dans ${universe.config.name}.`
        : `Roster vide pour ${universe.config.name}.`,
    );
  }

  let summary: Omit<ImageRefreshResult, "ok" | "error">;
  try {
    summary = await refreshAllRosterImages(targets, [], booru.seriesTag);
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

  await revalidateUniversePath("/games/jujutsu-draft");
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
  await revalidateUniversePath("/games/jujutsu-draft");
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
    await revalidateUniversePath("/games/jujutsu-draft");
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
    await revalidateUniversePath("/games/jjkdle");
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
    await revalidateUniversePath("/games/higher-lower");
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
  await revalidateUniversePath(`/games/${game}`);
  revalidatePath("/admin");
  return { ok: true };
}

/** Supprime un score dans la bonne table selon le jeu (sans revalidation). */
async function deleteScoreForGame(id: string, game: string): Promise<void> {
  if (game === DRAFT_GAME) return adminDeleteDraftScore(id);
  if (game === JJKDLE_GAME) return adminDeleteJjkdleScore(id);
  if (game === HIGHER_LOWER_GAME) return adminDeleteHigherLowerScore(id);
  return adminDeleteScore(id);
}

/** Chemin de la page publique du jeu à revalider après une modification. */
function gamePath(game: string): string {
  if (game === DRAFT_GAME) return "/games/jujutsu-draft";
  if (game === JJKDLE_GAME) return "/games/jjkdle";
  if (game === HIGHER_LOWER_GAME) return "/games/higher-lower";
  return `/games/${game}`;
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
    await deleteScoreForGame(id, game);
  } catch (e) {
    return { ok: false, error: `Échec de suppression : ${(e as Error).message}` };
  }
  await revalidateUniversePath(gamePath(game));
  revalidatePath("/admin");
  return { ok: true };
}

/** Supprime plusieurs scores en une fois (multi-sélection admin, jeux mêlés). */
export async function deleteScoresAction(
  items: { id: string; game: string }[],
): Promise<ActionResult & { deleted: number }> {
  if (!(await getAdminUser())) {
    return { ok: false, deleted: 0, error: "Accès réservé aux administrateurs." };
  }
  let deleted = 0;
  const errors: string[] = [];
  const games = new Set<string>();
  for (const { id, game } of items) {
    try {
      await deleteScoreForGame(id, game);
      games.add(game);
      deleted += 1;
    } catch (e) {
      errors.push(`${id} : ${(e as Error).message}`);
    }
  }
  for (const game of games) await revalidateUniversePath(gamePath(game));
  revalidatePath("/admin");
  return {
    ok: errors.length === 0,
    deleted,
    ...(errors.length > 0 ? { error: errors.join(" · ") } : {}),
  };
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
  const superAdmin = await getSuperAdminUser();
  if (!(await getAdminUser()) && !superAdmin) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  if (role !== "ADMIN" && role !== "PLAYER" && role !== "VIP") {
    return { ok: false, error: "Rôle invalide." };
  }

  if (superAdmin && superAdmin.id === userId && role !== "ADMIN") {
    return { ok: false, error: "Tu ne peux pas te rétrograder toi-même." };
  }

  const current = await getUserRole(userId);
  if (!current) {
    return { ok: false, error: "Utilisateur introuvable." };
  }

  // Protection : on ne rétrograde/modifie jamais un administrateur.
  if (!superAdmin && current === "ADMIN" && role !== "ADMIN") {
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

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,24}$/;

/**
 * Renomme n'importe quel joueur. Réservé au super-admin. Mêmes règles de pseudo
 * que l'inscription ; l'unicité est garantie par la contrainte DB (P2002).
 */
export async function setUsernameAction(
  userId: string,
  newUsername: string,
): Promise<ActionResult> {
  if (!(await getSuperAdminUser())) {
    return { ok: false, error: "Réservé au super-admin." };
  }

  const username = String(newUsername ?? "").trim();
  if (!USERNAME_RE.test(username)) {
    return {
      ok: false,
      error:
        "Pseudo invalide (3 à 24 caractères : lettres, chiffres, tirets, underscores).",
    };
  }

  let previous: string | null;
  try {
    previous = await setUsername(userId, username);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        return { ok: false, error: "Ce pseudo est déjà pris." };
      }
      if (e.code === "P2025") {
        return { ok: false, error: "Utilisateur introuvable." };
      }
    }
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }

  revalidatePath("/admin");
  if (previous) await revalidateUniversePath(`/u/${previous}`);
  await revalidateUniversePath(`/u/${username}`);
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

const COINS_LIMIT = 1_000_000;

/**
 * Fixe le solde de coins d'un joueur (valeur ABSOLUE). Aucun recalcul derrière :
 * les coins ne dérivent de rien une fois crédités (cf. `setUserCoins`).
 */
export async function adminSetCoinsAction(
  userId: string,
  coinsRaw: number,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  const coins = Math.round(Number(coinsRaw));
  if (!Number.isFinite(coins) || coins < 0 || coins > COINS_LIMIT) {
    return { ok: false, error: `Coins invalides (0 à ${COINS_LIMIT}).` };
  }
  try {
    await setUserCoins(userId, coins);
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

// ──────────────────────────────────────────────────────────────────────────
// Configuration globale (feature flags, maintenance, override du mot du jour).
//
// Ces flags affectent TOUT le site (gating des jeux, page maintenance, mot du
// jour JJKdle) → on invalide le cache de layout racine en plus de /admin.
// ──────────────────────────────────────────────────────────────────────────

/** Invalide les caches affectés par un changement de config globale. */
function revalidateGlobalConfig(): void {
  revalidatePath("/", "layout");
  revalidatePath("/admin");
}

// ── Attributs de l'univers (étape 5) ──────────────────────────────────────
// C'est cette section qui permet d'ajouter un anime SANS CODE : on définit ses
// attributs de personnage et leurs valeurs possibles, et JJKdle en découle.

const ATTRIBUTE_KINDS: AttributeKind[] = [
  "CATEGORICAL",
  "ORDINAL",
  "BOOLEAN",
  "NUMERIC",
];

/** Entier ≥ 0 lu depuis un champ de formulaire, ou null si vide/invalide. */
function optionalInt(raw: unknown): number | null {
  if (raw == null || `${raw}`.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

/** Crée ou met à jour un attribut de l'univers administré. */
export async function saveAttributeAction(
  input: AttributeInput,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }

  const key = String(input.key ?? "").trim();
  const label = String(input.label ?? "").trim();
  if (!label) return { ok: false, error: "Le libellé est obligatoire." };
  if (!ATTRIBUTE_KINDS.includes(input.kind)) {
    return { ok: false, error: "Type d'attribut invalide." };
  }
  // La clé n'est validée qu'à la CRÉATION : elle est immuable ensuite.
  if (!input.id) {
    const keyError = validateAttributeKey(key);
    if (keyError) return { ok: false, error: keyError };
  }

  try {
    await upsertAttribute({
      ...(input.id ? { id: input.id } : {}),
      key,
      label,
      kind: input.kind,
      position: optionalInt(input.position) ?? 0,
      comparable: Boolean(input.comparable),
      tolerance: optionalInt(input.tolerance),
    });
  } catch (e) {
    // Collision de clé (@@unique([universeId, key])) ou écriture refusée.
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  revalidateGlobalConfig();
  return { ok: true };
}

/** Supprime un attribut (et, en cascade, ses valeurs saisies). */
export async function deleteAttributeAction(
  id: string,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  try {
    await deleteAttribute(id);
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  revalidateGlobalConfig();
  return { ok: true };
}

/** Crée ou met à jour une valeur possible d'un attribut. */
export async function saveAttributeOptionAction(
  input: AttributeOptionInput,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  const value = String(input.value ?? "").trim();
  const label = String(input.label ?? "").trim();
  if (!value) return { ok: false, error: "La valeur est obligatoire." };
  if (!label) return { ok: false, error: "Le libellé est obligatoire." };

  try {
    await upsertAttributeOption({
      ...(input.id ? { id: input.id } : {}),
      attributeId: input.attributeId,
      value,
      label,
      // `null` = valeur non ordonnée : aucune flèche ↑/↓ ne sera affichée.
      order: optionalInt(input.order),
    });
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  revalidateGlobalConfig();
  return { ok: true };
}

/** Supprime une valeur possible (et, en cascade, les valeurs des persos). */
export async function deleteAttributeOptionAction(
  id: string,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  try {
    await deleteAttributeOption(id);
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  revalidateGlobalConfig();
  return { ok: true };
}

/**
 * Change l'UNIVERS CIBLÉ par la session d'administration (étape 5).
 *
 * Le slug est posé dans un cookie que le middleware applique aux chemins
 * `/admin` uniquement : toutes les vues et actions de l'admin (roster, draft,
 * catégories, classements, attributs, config) basculent d'un coup sur cet
 * univers, sans changer ce que voient les joueurs sur le site public.
 */
export async function setAdminUniverseAction(
  slug: string,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  // L'univers doit être utilisable : ligne en base ET config en code.
  const available = await listAvailableUniverses();
  if (!available.some((u) => u.slug === slug)) {
    return { ok: false, error: "Univers inconnu ou non configuré." };
  }

  (await cookies()).set(
    ADMIN_UNIVERSE_COOKIE,
    slug,
    adminUniverseCookieOptions(),
  );
  revalidatePath("/admin");
  return { ok: true };
}

/** Active ou désactive un jeu du catalogue. */
export async function setGameEnabledAction(
  gameId: string,
  enabled: boolean,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  if (!getGame(gameId)) {
    return { ok: false, error: "Jeu inconnu." };
  }
  try {
    const slug = await getCurrentUniverseSlug();
    await setConfig(gameEnabledKey(slug, gameId), Boolean(enabled));
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  revalidateGlobalConfig();
  return { ok: true };
}

/** Active/désactive le mode maintenance (message optionnel affiché aux joueurs). */
export async function setMaintenanceAction(
  enabled: boolean,
  message?: string,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  const trimmed = (message ?? "").trim();
  if (trimmed.length > 500) {
    return { ok: false, error: "Message trop long (500 caractères max)." };
  }
  const value: MaintenanceConfig = {
    enabled: Boolean(enabled),
    ...(trimmed ? { message: trimmed } : {}),
  };
  try {
    const slug = await getCurrentUniverseSlug();
    await setConfig(maintenanceKey(slug), value);
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  revalidateGlobalConfig();
  return { ok: true };
}

/**
 * Force (ou réinitialise) le mot du jour JJKdle. `characterId` doit être un perso
 * ÉLIGIBLE (complet) ; `null` rétablit le tirage déterministe. Pour tests uniquement.
 */
export async function setForcedTargetAction(
  characterId: string | null,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  if (characterId !== null) {
    const [roster, schema] = await Promise.all([
      readRoster(),
      loadAttributeSchema(),
    ]);
    const eligible = eligibleRoster(roster, schema);
    if (!eligible.some((c) => c.id === characterId)) {
      return {
        ok: false,
        error: "Personnage introuvable ou incomplet (non éligible au pool).",
      };
    }
  }
  try {
    const slug = await getCurrentUniverseSlug();
    await setConfig(forcedTargetKey(slug), characterId);
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  revalidateGlobalConfig();
  // Le mot du jour change → invalider aussi la page du jeu.
  await revalidateUniversePath("/games/jjkdle");
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────────────────
// Cartes & boosters (onglet « Booster Pack », et decks des joueurs).
//
// L'univers ciblé est celui de la session admin : sur /admin, le middleware
// écrase `x-universe` depuis le cookie `admin_universe`, donc
// `getCurrentUniverse()` suit automatiquement le sélecteur (cf.
// lib/universes/admin-scope.ts). Aucune action n'a à recevoir de slug.
//
// Un octroi admin est un DON, pas un tirage : il ne crédite jamais de coins,
// même si le joueur possédait déjà la carte.
// ──────────────────────────────────────────────────────────────────────────

/**
 * Se donne (ou donne à un joueur) un booster, puis l'ouvre immédiatement.
 *
 * Sert à tester l'animation autant qu'à dépanner : le booster passe par la même
 * table et le même `openBooster` que ceux des joueurs, donc ce qui est vérifié
 * ici est exactement ce qu'ils verront.
 */
export async function adminGiveBoosterAction(
  kind: string,
  userId?: string,
): Promise<ActionResult & { result?: OpenedBooster }> {
  const admin = await getAdminUser();
  if (!admin) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  if (!isBoosterKind(kind)) {
    return { ok: false, error: "Booster inconnu." };
  }

  const universe = await getCurrentUniverse();
  const target = userId ?? admin.id;

  try {
    const booster = await createBooster(
      target,
      universe.id,
      kind as BoosterKind,
      "admin",
    );
    const result = await openBooster(target, booster.id);
    if (!result) return { ok: false, error: "Échec de l'ouverture du booster." };
    revalidatePath("/admin");
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
}

/**
 * Octroie une carte précise (idempotent). Renvoie la carte pour que l'admin
 * voie la même animation de révélation qu'à l'ouverture d'un booster.
 */
export async function adminGrantCardAction(
  characterId: string,
  userId?: string,
): Promise<ActionResult & { card?: CardView; alreadyOwned?: boolean }> {
  const admin = await getAdminUser();
  if (!admin) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }

  const universe = await getCurrentUniverse();
  const card = await resolveCard(characterId, universe.id);
  if (!card) {
    return { ok: false, error: "Ce personnage n'existe pas dans cet univers." };
  }

  try {
    const { created } = await grantCard(userId || admin.id, characterId);
    revalidatePath("/admin");
    return { ok: true, card, alreadyOwned: !created };
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
}

/** Retire une carte d'une collection (et du deck où elle était équipée). */
export async function adminRevokeCardAction(
  characterId: string,
  userId?: string,
): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  try {
    await revokeCard(userId || admin.id, characterId);
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  revalidatePath("/admin");
  return { ok: true };
}

// ── Casino (hors univers) ─────────────────────────────────────────────────
// ⚠️ Ces réglages ne sont PAS scopés à un univers, contrairement à tous ceux
// au-dessus : il n'y a qu'un casino sur la plateforme, puisqu'il mise des coins
// globaux. Couper le casino le coupe partout — c'est voulu.

/** Ouvre ou ferme le casino (les ADMIN continuent d'y accéder). */
export async function setCasinoEnabledAction(
  enabled: boolean,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  try {
    await setCasinoEnabled(Boolean(enabled));
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  revalidateGlobalConfig();
  return { ok: true };
}

/** Règle la mise minimale des tables. Il n'y a volontairement pas de maximum. */
export async function setCasinoMinBetAction(
  value: number,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  const amount = Math.round(Number(value));
  if (!Number.isFinite(amount) || amount < MIN_BET_FLOOR || amount > MIN_BET_CEIL) {
    return {
      ok: false,
      error: `Mise minimale entre ${MIN_BET_FLOOR} et ${MIN_BET_CEIL} coins.`,
    };
  }
  try {
    await setCasinoMinBet(amount);
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  revalidateGlobalConfig();
  return { ok: true };
}

/**
 * Choisit le dos de carte servi à toutes les tables.
 *
 * Les tables DÉJÀ ouvertes le prennent aussi : le dos est résolu à la
 * sérialisation (cf. lib/casino/engine.ts `viewFor`), pas figé à la création.
 */
export async function setCasinoCardBackAction(
  id: string,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  try {
    await setCasinoCardBack(String(id));
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  revalidateGlobalConfig();
  return { ok: true };
}

/**
 * Ferme une table de force.
 *
 * ⚠️ Destructif : les mises engagées sur la manche en cours sont perdues, sans
 * remboursement (il n'y a pas de registre pour les retrouver). À réserver aux
 * tables réellement bloquées.
 */
export async function closeCasinoTableAction(
  code: string,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  try {
    await closeTable(String(code));
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  revalidatePath("/admin");
  return { ok: true };
}

/** Remet les compteurs de la maison à zéro (nouveau cycle de mesure). */
export async function resetCasinoStatsAction(): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  try {
    await resetCasinoStats();
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  revalidatePath("/admin");
  return { ok: true };
}
