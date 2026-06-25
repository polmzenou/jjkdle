import { readFile, writeFile, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";

/**
 * Stockage du leaderboard (data/leaderboard/entries.json).
 *
 * Même contrat que le roster (lib/admin/roster-store.ts) : lecture possible
 * partout, écriture uniquement en local (le filesystem de Vercel est en
 * lecture seule). `writesAllowed()` le détecte pour bloquer proprement.
 */

export type LeaderboardGame = "builder" | "ranking";

export interface LeaderboardEntry {
  id: string;
  pseudo: string;
  score: number;
  game: LeaderboardGame;
  createdAt: string;
}

/** Score maximum atteignable par jeu (sert à valider les soumissions). */
export const MAX_SCORE: Record<LeaderboardGame, number> = {
  builder: 1000,
  ranking: 10000,
};

const FILE = resolve(process.cwd(), "data/leaderboard/entries.json");
/** Plafond d'entrées conservées pour éviter une croissance illimitée du fichier. */
const MAX_STORED = 500;

/** Les écritures sont-elles possibles (hors Vercel) ? */
export function writesAllowed(): boolean {
  return !process.env.VERCEL;
}

export async function readLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const raw = await readFile(FILE, "utf8");
    const list = JSON.parse(raw) as unknown;
    return Array.isArray(list) ? (list as LeaderboardEntry[]) : [];
  } catch {
    // Fichier absent / illisible → leaderboard vide.
    return [];
  }
}

/**
 * Top N trié par score décroissant (départage par ancienneté).
 * Si `game` est fourni, ne garde que les scores de ce jeu.
 */
export async function topEntries(
  limit = 8,
  game?: LeaderboardGame,
): Promise<LeaderboardEntry[]> {
  const list = await readLeaderboard();
  return list
    .filter((e) => (game ? e.game === game : true))
    .sort(
      (a, b) => b.score - a.score || a.createdAt.localeCompare(b.createdAt),
    )
    .slice(0, limit);
}

async function writeLeaderboard(list: LeaderboardEntry[]): Promise<void> {
  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(list, null, 2) + "\n", "utf8");
}

/** Ajoute une entrée (déjà validée par l'appelant) et renvoie l'entrée créée. */
export async function addEntry(input: {
  pseudo: string;
  score: number;
  game: LeaderboardGame;
}): Promise<LeaderboardEntry> {
  const list = await readLeaderboard();
  const entry: LeaderboardEntry = {
    id: randomUUID(),
    pseudo: input.pseudo,
    score: input.score,
    game: input.game,
    createdAt: new Date().toISOString(),
  };
  list.push(entry);

  // Ne garde que les meilleurs scores si on dépasse le plafond.
  const trimmed = list
    .sort((a, b) => b.score - a.score || a.createdAt.localeCompare(b.createdAt))
    .slice(0, MAX_STORED);

  await writeLeaderboard(trimmed);
  return entry;
}
