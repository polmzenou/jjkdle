"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { awardExp, refreshLevelAndBadges } from "@/lib/progress/recompute";
import { builderExp, rankingExp } from "@/lib/progress/exp-rewards";
import { getGrade } from "@/lib/scoring/grades";
import { saveScore, getBestScore, MAX_SCORE, type LeaderboardGame } from "./store";

export type SubmitResult = {
  ok: boolean;
  error?: string;
  /** true si l'erreur vient d'une absence de connexion (UI propose /login). */
  needsAuth?: boolean;
  /** Badges nouvellement débloqués par cette soumission (toast). */
  newBadges?: string[];
};

export type ExpResult = {
  ok: boolean;
  needsAuth?: boolean;
  /** XP gagnée par cette partie (0 possible). */
  gainedExp?: number;
  /** Badges nouvellement débloqués par l'octroi (toast). */
  newBadges?: string[];
};

const GAMES: LeaderboardGame[] = ["builder", "ranking"];

/**
 * Octroi AUTOMATIQUE de l'XP en fin de partie (Builder / Pyramid), SANS
 * enregistrement au classement. Appelé à l'ouverture du modal de fin pour un
 * utilisateur connecté. Le « nouveau record » (×2 Builder) est déterminé côté
 * serveur en comparant au meilleur score persisté (lecture seule, aucune
 * écriture au classement). Modèle accumulatif : l'XP s'ajoute au total.
 */
export async function awardGameExpAction(
  scoreRaw: number,
  game: LeaderboardGame,
): Promise<ExpResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };
  if (!GAMES.includes(game)) return { ok: false };

  const score = Math.round(Number(scoreRaw));
  if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE[game]) {
    return { ok: false };
  }

  let exp: number;
  if (game === "builder") {
    const best = await getBestScore(user.id, "builder");
    exp = builderExp(getGrade(score).id, score > best);
  } else {
    exp = rankingExp(score);
  }

  const { gained, newBadges } = await awardExp(user.id, exp);
  return { ok: true, gainedExp: gained, newBadges };
}

/**
 * Enregistre le score de l'utilisateur connecté au leaderboard (classement
 * uniquement — l'XP est octroyée séparément en fin de partie).
 * Refuse si l'utilisateur n'est pas connecté (jouer reste possible sans compte,
 * mais l'enregistrement des scores nécessite un compte).
 */
export async function submitScoreAction(
  scoreRaw: number,
  game: LeaderboardGame,
): Promise<SubmitResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      needsAuth: true,
      error: "Connecte-toi pour enregistrer ton score.",
    };
  }

  if (!GAMES.includes(game)) {
    return { ok: false, error: "Jeu inconnu." };
  }

  const score = Math.round(Number(scoreRaw));
  if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE[game]) {
    return { ok: false, error: "Score invalide." };
  }

  try {
    await saveScore(user.id, game, score);
    // Le nouveau best peut débloquer un badge ; le niveau reste inchangé (XP à part).
    const { newBadges } = await refreshLevelAndBadges(user.id);
    revalidatePath(`/games/${game}`);
    return { ok: true, newBadges };
  } catch (e) {
    return { ok: false, error: `Échec d'enregistrement : ${(e as Error).message}` };
  }
}
