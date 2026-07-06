import { cookies } from "next/headers";
import { seal, unseal } from "@/lib/games/seal";
import type { GameMode, GameStatus } from "./types";

/**
 * État de la partie JJKdle persisté dans un cookie (aucun compte requis, aucune
 * écriture filesystem → compatible Vercel ; calqué sur lib/bestScore.ts).
 *
 * SÉCURITÉ : le contenu est CHIFFRÉ (AES-GCM, cf. lib/games/seal) en plus d'être
 * httpOnly. `httpOnly` seul ne suffit pas — la valeur du cookie reste lisible
 * dans les DevTools / un proxy, ce qui exposerait `targetId` (la réponse) et
 * permettrait de forcer `status: "won"`. Le scellement rend le cookie à la fois
 * illisible ET infalsifiable : toute altération casse le déchiffrement.
 *
 * Lecture/écriture brutes uniquement ici ; la validation « est-ce toujours le bon
 * jour ? » se fait côté action/page (qui dispose du roster pour recalculer la cible).
 */

const COOKIE = "jjkdle_state";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export interface JjkdleState {
  mode: GameMode;
  /** Clé "YYYY-MM-DD" de la partie (sert à expirer l'état au changement de jour). */
  date: string;
  /** Id du perso mystère (SECRET — jamais renvoyé au client tant que non gagné). */
  targetId: string;
  /** Ids des persos déjà proposés, dans l'ordre. */
  guesses: string[];
  status: GameStatus;
  /** Nombre de parties bonus VIP déjà jouées aujourd'hui (mode "vip" uniquement). */
  replays?: number;
}

/** Lit l'état déchiffré depuis le cookie (null si absent/illisible/falsifié). */
export async function readState(): Promise<JjkdleState | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  const parsed = unseal<JjkdleState>(raw);
  if (
    parsed &&
    typeof parsed.targetId === "string" &&
    Array.isArray(parsed.guesses)
  ) {
    return parsed;
  }
  return null;
}

/** Écrit l'état SCELLÉ (à appeler depuis une Server Action ou un Route Handler). */
export async function writeState(state: JjkdleState): Promise<void> {
  (await cookies()).set(COOKIE, seal(state), {
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
