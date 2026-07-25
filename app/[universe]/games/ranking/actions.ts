"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getConditions, getCharacterMap } from "@/lib/content/queries";
import { seal, unseal } from "@/lib/games/seal";
import {
  MAX_ATTEMPTS,
  checkPlacement,
  isComplete,
  scoreForAttempt,
} from "@/lib/ranking/ranking";
import { SLOT_COUNT } from "@/data/ranking/conditions";
import { shuffle } from "@/lib/draw/draw";
import { saveScore } from "@/lib/leaderboard/store";
import { saveBestScore } from "@/lib/bestScore";
import { awardExp, refreshLevelAndBadges } from "@/lib/progress/recompute";
import { rankingExp } from "@/lib/progress/exp-rewards";
import type { RankingCardData } from "./types";

/**
 * Server Actions « JJK Pyramid » — logique AUTORITATIVE côté serveur (anti-triche).
 *
 * Le classement correct (`order`) n'est JAMAIS envoyé au client tant que la partie
 * n'est pas résolue, et les cartes envoyées ne portent AUCUNE statistique (sinon
 * un joueur pourrait re-trier par la stat du critère). L'état de partie
 * (condition + n° de tentative) vit dans un cookie SCELLÉ (chiffré + authentifié)
 * → ni lisible ni falsifiable. Le score est calculé ici, jamais fourni par le client.
 */

const COOKIE = "ranking_run";
const SIX_HOURS = 60 * 60 * 6;

interface RankingSession {
  conditionId: string;
  /** Tentative courante (1-based). */
  attempt: number;
}

export type RankingStartResult =
  | {
      ok: true;
      pool: string;
      category: string;
      prompt: string;
      /** Les 8 personnages à classer, dans un ordre MÉLANGÉ (pas le bon classement). */
      cards: RankingCardData[];
    }
  | { ok: false; error: string };

export type RankingCheckResult =
  | { ok: false; error: string; needsRestart?: boolean }
  | { ok: true; status: "playing"; flags: boolean[]; attempt: number }
  | {
      ok: true;
      status: "won";
      flags: boolean[];
      score: number;
      /** Classement correct révélé (rangs 1→8). */
      order: string[];
      bestScore: number;
      isNewRecord: boolean;
      gainedExp: number | null;
      newBadges: string[];
      needsAuth: boolean;
    }
  | { ok: true; status: "lost"; flags: boolean[]; order: string[] };

async function writeSession(session: RankingSession): Promise<void> {
  (await cookies()).set(COOKIE, seal(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SIX_HOURS,
  });
}

function toCard(c: {
  id: string;
  name: string;
  title: string;
  image?: string;
}): RankingCardData {
  return {
    id: c.id,
    name: c.name,
    title: c.title,
    ...(c.image ? { image: c.image } : {}),
  };
}

/**
 * Démarre une partie : le serveur tire une condition au hasard, mémorise
 * `{conditionId, attempt:1}` dans le cookie scellé, et ne renvoie au client que
 * les 8 personnages MÉLANGÉS (visuel seul) + l'intitulé. L'ordre correct reste serveur.
 */
export async function startRankingRun(): Promise<RankingStartResult> {
  const [conditions, characterById] = await Promise.all([
    getConditions(),
    getCharacterMap(),
  ]);
  if (conditions.length === 0) {
    return { ok: false, error: "Aucune condition disponible pour le moment." };
  }

  const condition = conditions[Math.floor(Math.random() * conditions.length)];
  // Mélange l'ordre correct → pool d'affichage ; on ne révèle jamais le rang.
  const shuffledIds = shuffle(condition.order);
  const cards = shuffledIds
    .map((id) => characterById[id])
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map(toCard);

  if (cards.length !== SLOT_COUNT) {
    return { ok: false, error: "Condition invalide (roster incomplet)." };
  }

  await writeSession({ conditionId: condition.id, attempt: 1 });

  return {
    ok: true,
    pool: condition.pool,
    category: condition.category,
    prompt: condition.prompt,
    cards,
  };
}

/**
 * Valide une tentative de classement. Le client envoie les 8 ids placés
 * (`placement[i]` = perso au rang i). Le serveur recharge la condition depuis le
 * cookie, calcule les positions correctes, incrémente la tentative, et — à la
 * victoire — calcule le score, octroie l'XP et enregistre le classement (le tout
 * côté serveur). Renvoie le classement correct UNIQUEMENT en fin de partie.
 */
export async function checkRankingRun(
  placement: unknown,
): Promise<RankingCheckResult> {
  const session = unseal<RankingSession>((await cookies()).get(COOKIE)?.value);
  if (!session || typeof session.conditionId !== "string") {
    return { ok: false, error: "Partie expirée, relance une partie.", needsRestart: true };
  }

  const conditions = await getConditions();
  const condition = conditions.find((c) => c.id === session.conditionId);
  if (!condition) {
    (await cookies()).delete(COOKIE);
    return { ok: false, error: "Partie invalide, relance une partie.", needsRestart: true };
  }

  // Validation stricte du placement : 8 ids, tous distincts, exactement l'ensemble
  // des personnages de la condition (aucune injection possible).
  if (
    !Array.isArray(placement) ||
    placement.length !== SLOT_COUNT ||
    placement.some((id) => typeof id !== "string")
  ) {
    return { ok: false, error: "Placement invalide." };
  }
  const placed = placement as string[];
  const expected = new Set(condition.order);
  if (
    new Set(placed).size !== SLOT_COUNT ||
    placed.some((id) => !expected.has(id))
  ) {
    return { ok: false, error: "Placement invalide." };
  }

  const flags = checkPlacement(placed, condition.order);

  if (isComplete(flags)) {
    const score = scoreForAttempt(session.attempt);
    (await cookies()).delete(COOKIE);

    // Record local (cookie, sans compte requis).
    const { best, isNewRecord } = await saveBestScore("ranking", score);

    const user = await getCurrentUser();
    if (!user) {
      return {
        ok: true,
        status: "won",
        flags,
        score,
        order: condition.order,
        bestScore: best,
        isNewRecord,
        gainedExp: null,
        newBadges: [],
        needsAuth: true,
      };
    }

    // XP + enregistrement au classement (DB) : autoritatif, score serveur.
    const { gained, newBadges: xpBadges } = await awardExp(
      user.id,
      rankingExp(score),
    );
    await saveScore(user.id, "ranking", score);
    const { newBadges: recordBadges } = await refreshLevelAndBadges(user.id);
    revalidatePath("/games/ranking");

    return {
      ok: true,
      status: "won",
      flags,
      score,
      order: condition.order,
      bestScore: best,
      isNewRecord,
      gainedExp: gained,
      newBadges: [...new Set([...xpBadges, ...recordBadges])],
      needsAuth: false,
    };
  }

  // Tentative ratée : passe à la suivante, ou game over si épuisées.
  const nextAttempt = session.attempt + 1;
  if (nextAttempt > MAX_ATTEMPTS) {
    (await cookies()).delete(COOKIE);
    return { ok: true, status: "lost", flags, order: condition.order };
  }

  await writeSession({ conditionId: session.conditionId, attempt: nextAttempt });
  return { ok: true, status: "playing", flags, attempt: nextAttempt };
}
