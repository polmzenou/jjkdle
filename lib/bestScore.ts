"use server";

import { cookies } from "next/headers";

/**
 * Persistance du meilleur score via cookie httpOnly (aucun compte requis,
 * aucune écriture filesystem → compatible Vercel).
 *
 * On garde un best score par jeu : la clé de cookie est `bestscore_<gameId>`.
 */

const COOKIE_PREFIX = "bestscore_";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function cookieName(gameId: string): string {
  return `${COOKIE_PREFIX}${gameId}`;
}

/** Lit le meilleur score enregistré pour un jeu (0 si aucun). */
export async function getBestScore(gameId: string): Promise<number> {
  const store = await cookies();
  const raw = store.get(cookieName(gameId))?.value;
  const parsed = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * Enregistre `score` s'il dépasse le best actuel. Renvoie le best score à jour
 * et si un nouveau record a été établi.
 */
export async function saveBestScore(
  gameId: string,
  score: number,
): Promise<{ best: number; isNewRecord: boolean }> {
  const store = await cookies();
  const current = await getBestScore(gameId);

  if (score <= current) {
    return { best: current, isNewRecord: false };
  }

  store.set(cookieName(gameId), String(score), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });

  return { best: score, isNewRecord: true };
}
