"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { awardExp } from "@/lib/progress/recompute";
import { builderExp, rankingExp } from "@/lib/progress/exp-rewards";
import { getGrade } from "@/lib/scoring/grades";
import { saveScore, MAX_SCORE, type LeaderboardGame } from "./store";

export type SubmitResult = {
  ok: boolean;
  error?: string;
  /** true si l'erreur vient d'une absence de connexion (UI propose /login). */
  needsAuth?: boolean;
  /** Badges nouvellement débloqués par cette soumission (toast). */
  newBadges?: string[];
  /** XP gagnée par cette partie (affichée à l'écran de fin). */
  gainedExp?: number;
};

const GAMES: LeaderboardGame[] = ["builder", "ranking"];

/**
 * Enregistre le score de l'utilisateur connecté au leaderboard.
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
    const { isNewRecord } = await saveScore(user.id, game, score);
    // Builder : EXP du grade (×2 si nouveau record). Pyramid : EXP par paliers de points.
    const gainedExp =
      game === "builder"
        ? builderExp(getGrade(score).id, isNewRecord)
        : rankingExp(score);
    const { newBadges, gained } = await awardExp(user.id, gainedExp);
    revalidatePath(`/games/${game}`);
    return { ok: true, newBadges, gainedExp: gained };
  } catch (e) {
    return { ok: false, error: `Échec d'enregistrement : ${(e as Error).message}` };
  }
}
