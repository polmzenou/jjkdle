import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Character } from "@/data/roster/characters";

/**
 * Lecture/écriture du roster JSON (data/roster/characters.json).
 *
 * ⚠️ L'écriture ne fonctionne qu'en local : le filesystem de Vercel est en
 * lecture seule. `writesAllowed()` le détecte pour bloquer proprement.
 */

const FILE = resolve(process.cwd(), "data/roster/characters.json");

/** Les écritures sont-elles possibles (hors Vercel) ? */
export function writesAllowed(): boolean {
  return !process.env.VERCEL;
}

export async function readRoster(): Promise<Character[]> {
  const raw = await readFile(FILE, "utf8");
  return JSON.parse(raw) as Character[];
}

async function writeRoster(list: Character[]): Promise<void> {
  await writeFile(FILE, JSON.stringify(list, null, 2) + "\n", "utf8");
}

/** Ajoute (ou remplace si l'id existe) un personnage, puis réécrit le fichier. */
export async function upsertCharacter(char: Character): Promise<void> {
  const list = await readRoster();
  const idx = list.findIndex((c) => c.id === char.id);
  if (idx >= 0) list[idx] = char;
  else list.push(char);
  await writeRoster(list);
}

/** Supprime un personnage par id. */
export async function deleteCharacter(id: string): Promise<void> {
  const list = await readRoster();
  await writeRoster(list.filter((c) => c.id !== id));
}
