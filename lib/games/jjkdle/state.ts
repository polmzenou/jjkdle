import { cookies } from "next/headers";
import type { GameMode, GameStatus } from "./types";

/**
 * État de la partie JJKdle persisté dans un cookie httpOnly (aucun compte requis,
 * aucune écriture filesystem → compatible Vercel ; calqué sur lib/bestScore.ts).
 *
 * SÉCURITÉ : le cookie est httpOnly → le JS client ne peut PAS lire `targetId`.
 * La réponse (perso mystère) n'est donc jamais exposée au client avant résolution.
 *
 * Lecture/écriture brutes uniquement ici ; la validation « est-ce toujours le bon
 * jour ? » se fait côté action/page (qui dispose du roster pour recalculer la cible).
 */

const COOKIE = "jjkdle_state";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export interface JjkdleState {
  mode: GameMode;
  /** Clé "YYYY-MM-DD" de la partie (mode daily) ; "" en mode admin. */
  date: string;
  /** Id du perso mystère (SECRET — jamais renvoyé au client tant que non gagné). */
  targetId: string;
  /** Ids des persos déjà proposés, dans l'ordre. */
  guesses: string[];
  status: GameStatus;
}

/** Lit l'état brut depuis le cookie (null si absent/illisible). */
export async function readState(): Promise<JjkdleState | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as JjkdleState;
    if (
      parsed &&
      typeof parsed.targetId === "string" &&
      Array.isArray(parsed.guesses)
    ) {
      return parsed;
    }
  } catch {
    // cookie corrompu → on repart de zéro
  }
  return null;
}

/** Écrit l'état (à appeler depuis une Server Action ou un Route Handler). */
export async function writeState(state: JjkdleState): Promise<void> {
  (await cookies()).set(COOKIE, JSON.stringify(state), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
}

/** Supprime l'état courant. */
export async function clearState(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
