import { getCurrentUniverseConfig } from "@/lib/universes/current";
import { gameForUniverse, gamesForUniverse } from "./registry";
import type { Game } from "./types";

/**
 * Registre des jeux DE L'UNIVERS COURANT, côté serveur.
 *
 * Même contenu que `GAMES`, mais avec les textes de l'univers résolu par le
 * middleware (`gameCopy` de sa config) : « JJKdle » sur /jjk, « CSMdle » sur
 * /csm. À utiliser dans tout Server Component / metadata qui AFFICHE un nom de
 * jeu ; `GAMES` reste correct pour les ids, routes et flags.
 *
 * Module server-only (chaîne d'import vers `next/headers` + Prisma) — l'équivalent
 * client est `useUniverseGames()` / `useGameTitle()` (components/universe).
 */
export async function universeGames(): Promise<Game[]> {
  return gamesForUniverse((await getCurrentUniverseConfig()).gameCopy);
}

/** Un jeu du registre avec les textes de l'univers courant. */
export async function universeGame(id: string): Promise<Game | undefined> {
  return gameForUniverse(id, (await getCurrentUniverseConfig()).gameCopy);
}

/**
 * Titre affichable d'un jeu dans l'univers courant. Repli sur l'id si le jeu
 * n'existe pas, pour ne jamais casser un rendu à cause d'une faute de frappe.
 */
export async function universeGameTitle(id: string): Promise<string> {
  return (await universeGame(id))?.title ?? id;
}
