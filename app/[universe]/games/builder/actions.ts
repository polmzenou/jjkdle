"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getCategories, getRoster } from "@/lib/content/queries";
import type { CategoryId } from "@/data/roster/categories";
import type { Character } from "@/data/roster/characters";
import { seal, unseal } from "@/lib/games/seal";
import {
  drawAllOne,
  redrawUnlockedOne,
  type SingleDraw,
} from "@/lib/draw/draw";
import { evaluateBuild, type Selection } from "@/lib/scoring/scoring";
import { getGrade } from "@/lib/scoring/grades";
import { saveBestScore } from "@/lib/bestScore";
import { saveScore, getBestScore } from "@/lib/leaderboard/store";
import { awardExp, refreshLevelAndBadges } from "@/lib/progress/recompute";
import { builderExp } from "@/lib/progress/exp-rewards";

/**
 * Server Actions « Build the Perfect Sorcerer » — AUTORITATIF côté serveur.
 *
 * Anti-triche : c'est le SERVEUR qui tire le personnage de chaque catégorie et
 * qui, à la fin, RECALCULE le score — le client ne peut donc pas soumettre un
 * score arbitraire ni un personnage jamais proposé. L'état de partie (tirage
 * courant + sélection verrouillée) vit dans un cookie SCELLÉ (chiffré +
 * authentifié → ni lisible ni falsifiable).
 */

const COOKIE = "builder_run";
const SIX_HOURS = 60 * 60 * 6;

/** Seuil de note pour le tirage resserré (« curated »), cf. draw.ts. */
const RATING_FLOOR = 90;

interface BuilderSession {
  /** Catégories verrouillées : { [categoryId]: characterId choisi }. */
  selection: Record<string, string>;
  /** Tirage courant proposé : { [categoryId]: characterId | null }. */
  draw: Record<string, string | null>;
  /** Tirage resserré (bascule « curated »). */
  curated: boolean;
}

export type BuilderStep = {
  ok: true;
  /** Tirage courant à afficher : { [categoryId]: characterId | null }. */
  draw: Record<string, string | null>;
  /** Catégories déjà verrouillées. */
  lockedIds: string[];
};

export type BuilderFinish = {
  ok: true;
  finished: true;
  /** Sélection finale verrouillée : { [categoryId]: characterId }. */
  selection: Record<string, string>;
  /** Score AUTORITATIF (recalculé serveur, 0–1000). */
  score: number;
  bestScore: number;
  isNewRecord: boolean;
  gainedExp: number | null;
  newBadges: string[];
  needsAuth: boolean;
};

export type BuilderResult =
  | BuilderStep
  | BuilderFinish
  | { ok: false; error: string; needsRestart?: boolean };

async function writeSession(session: BuilderSession): Promise<void> {
  (await cookies()).set(COOKIE, seal(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SIX_HOURS,
  });
}

/** Convertit un tirage de personnages (SingleDraw) en map d'ids sérialisable. */
function drawToIds(draw: SingleDraw): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const [cat, ch] of Object.entries(draw)) out[cat] = ch?.id ?? null;
  return out;
}

/** Reconstruit un SingleDraw (personnages) depuis une map d'ids + le roster. */
function idsToDraw(
  ids: Record<string, string | null>,
  byId: Map<string, Character>,
): SingleDraw {
  const out = {} as SingleDraw;
  for (const [cat, id] of Object.entries(ids)) {
    out[cat as CategoryId] = id ? byId.get(id) ?? null : null;
  }
  return out;
}

/** Démarre une partie : le serveur tire 1 personnage par catégorie. */
export async function startBuilderRun(): Promise<BuilderStep> {
  const [categories, roster] = await Promise.all([getCategories(), getRoster()]);
  const draw = drawAllOne(categories, roster);
  const drawIds = drawToIds(draw);
  await writeSession({ selection: {}, draw: drawIds, curated: false });
  return { ok: true, draw: drawIds, lockedIds: [] };
}

/**
 * Verrouille la catégorie tapée sur le personnage ACTUELLEMENT tiré (le client
 * ne choisit pas le perso — le serveur impose celui qu'il a proposé). Re-tire les
 * catégories libres ; à la dernière, calcule le score et persiste tout.
 */
export async function lockBuilderCategory(
  categoryIdRaw: unknown,
): Promise<BuilderResult> {
  const session = unseal<BuilderSession>((await cookies()).get(COOKIE)?.value);
  if (!session || typeof session.draw !== "object") {
    return { ok: false, error: "Partie expirée, relance une partie.", needsRestart: true };
  }

  const categoryId = typeof categoryIdRaw === "string" ? categoryIdRaw : "";
  const [categories, roster] = await Promise.all([getCategories(), getRoster()]);
  const category = categories.find((c) => c.id === categoryId);
  if (!category) return { ok: false, error: "Catégorie inconnue." };
  if (session.selection[categoryId]) {
    return { ok: false, error: "Catégorie déjà verrouillée." };
  }
  const shownId = session.draw[categoryId];
  if (!shownId) return { ok: false, error: "Aucun personnage à verrouiller." };

  const byId = new Map(roster.map((c) => [c.id, c]));
  // Sécurité : le perso verrouillé doit exister ET être éligible à la catégorie.
  const shown = byId.get(shownId);
  if (!shown || shown.ratings[categoryId as CategoryId] === undefined) {
    return { ok: false, error: "Personnage invalide.", needsRestart: true };
  }

  const selection = { ...session.selection, [categoryId]: shownId };
  const lockedIds = Object.keys(selection);

  // Dernière catégorie → fin de partie : calcul autoritatif du score.
  if (lockedIds.length === categories.length) {
    (await cookies()).delete(COOKIE);

    const builtSelection: Selection = {};
    for (const [cat, id] of Object.entries(selection)) {
      builtSelection[cat as CategoryId] = byId.get(id) ?? null;
    }
    const { score, grade } = evaluateBuild(builtSelection, categories);

    // Record local (cookie, sans compte requis).
    const { best, isNewRecord } = await saveBestScore("builder", score);

    const user = await getCurrentUser();
    if (!user) {
      return {
        ok: true,
        finished: true,
        selection,
        score,
        bestScore: best,
        isNewRecord,
        gainedExp: null,
        newBadges: [],
        needsAuth: true,
      };
    }

    // Bonus ×2 si nouveau record en base (comparé AVANT l'enregistrement).
    const dbBest = await getBestScore(user.id, "builder");
    const { gained, newBadges: xpBadges } = await awardExp(
      user.id,
      builderExp(grade.id, score > dbBest),
    );
    await saveScore(user.id, "builder", score);
    const { newBadges: recordBadges } = await refreshLevelAndBadges(user.id);
    revalidatePath("/games/builder");

    return {
      ok: true,
      finished: true,
      selection,
      score,
      bestScore: best,
      isNewRecord,
      gainedExp: gained,
      newBadges: [...new Set([...xpBadges, ...recordBadges])],
      needsAuth: false,
    };
  }

  // Sinon : re-tire les catégories encore libres (en gardant les verrouillées).
  const current = idsToDraw(session.draw, byId);
  current[categoryId as CategoryId] = shown; // fige la case verrouillée
  const lockedSet = new Set(lockedIds as CategoryId[]);
  const nextDraw = redrawUnlockedOne(
    current,
    categories,
    lockedSet,
    roster,
    Math.random,
    session.curated ? RATING_FLOOR : undefined,
  );
  const drawIds = drawToIds(nextDraw);
  await writeSession({ selection, draw: drawIds, curated: session.curated });
  return { ok: true, draw: drawIds, lockedIds };
}

/** Bascule le pool « curated » (note ≥ seuil) et re-tire les cases libres. */
export async function cycleBuilderPool(): Promise<BuilderResult> {
  const session = unseal<BuilderSession>((await cookies()).get(COOKIE)?.value);
  if (!session || typeof session.draw !== "object") {
    return { ok: false, error: "Partie expirée, relance une partie.", needsRestart: true };
  }

  const [categories, roster] = await Promise.all([getCategories(), getRoster()]);
  const byId = new Map(roster.map((c) => [c.id, c]));
  const curated = !session.curated;
  const lockedIds = Object.keys(session.selection);
  const lockedSet = new Set(lockedIds as CategoryId[]);
  const current = idsToDraw(session.draw, byId);
  const nextDraw = redrawUnlockedOne(
    current,
    categories,
    lockedSet,
    roster,
    Math.random,
    curated ? RATING_FLOOR : undefined,
  );
  const drawIds = drawToIds(nextDraw);
  await writeSession({ selection: session.selection, draw: drawIds, curated });
  return { ok: true, draw: drawIds, lockedIds };
}
