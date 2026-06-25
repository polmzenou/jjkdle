"use server";

import { revalidatePath } from "next/cache";
import {
  addEntry,
  writesAllowed,
  MAX_SCORE,
  type LeaderboardGame,
} from "./store";

export type SubmitResult = { ok: boolean; error?: string };

const GAMES: LeaderboardGame[] = ["builder", "ranking"];

/** Nettoie un pseudo : retire les chevrons, compresse les espaces, limite à 24. */
function cleanPseudo(raw: unknown): string {
  return String(raw ?? "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);
}

/** Ajoute un score au leaderboard global après validation. */
export async function submitScoreAction(
  pseudoRaw: string,
  scoreRaw: number,
  game: LeaderboardGame,
): Promise<SubmitResult> {
  if (!writesAllowed()) {
    return {
      ok: false,
      error:
        "Leaderboard en lecture seule sur Vercel (filesystem). À utiliser en local.",
    };
  }
  if (!GAMES.includes(game)) {
    return { ok: false, error: "Jeu inconnu." };
  }

  const pseudo = cleanPseudo(pseudoRaw);
  if (pseudo.length < 2) {
    return { ok: false, error: "Pseudo trop court (2 caractères minimum)." };
  }

  const score = Math.round(Number(scoreRaw));
  if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE[game]) {
    return { ok: false, error: "Score invalide." };
  }

  try {
    await addEntry({ pseudo, score, game });
  } catch (e) {
    return { ok: false, error: `Échec d'écriture : ${(e as Error).message}` };
  }

  revalidatePath(`/games/${game}`);
  return { ok: true };
}
