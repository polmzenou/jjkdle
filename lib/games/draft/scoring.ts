import type {
  Boss,
  CombatResult,
  DraftCharacter,
  DraftCategoryId,
  DraftSelection,
  DuelResult,
} from "./types";
import { DRAFT_CATEGORIES } from "./categories";
import { DRAFT_ROSTER_BY_ID } from "./roster";

/**
 * Cœur du jeu « Jujutsu Draft » — 100 % pur et testable (aucune dépendance
 * React/Prisma). Réutilisable côté client (animation), serveur (anti-triche) et
 * par un futur mode multijoueur.
 *
 * Score global caché d'un sorcier = somme des contributions des 8 persos.
 *   contribution = statValue
 *                + round(cost * COST_COEF)                  (bonus de coût)
 *                + (placé dans sa catégorie ? round(statValue * CATEGORY_BONUS) : 0)
 *
 * Le score n'est JAMAIS montré au joueur : seul le déroulé du combat l'est.
 */

export const BUDGET = 100;
export const COST_COEF = 0.4;
export const CATEGORY_BONUS = 0.5;

/**
 * Seuils cachés des boss — CALIBRÉS PAR SIMULATION (cf. scoring.test.ts).
 *
 * Tirage CLOISONNÉ (chaque perso est toujours dans sa catégorie d'excellence →
 * bonus toujours appliqué). Distribution mesurée sur toutes les équipes légales
 * (budget ≤ 100) : min **92** (équipe la moins chère), médiane ≈ 186, max
 * **223** (optimum). Seuils placés pour une courbe régulière sur [92, 223] :
 *   Panda   90  → tombe avec n'importe quelle équipe (même la moins chère, 92)
 *   Mahito 140  → un brin au-dessus du plancher
 *   Geto   165  → équipe correcte
 *   Sukuna 188  → bonne équipe (≈ médiane)
 *   Gojo   205  → très bonne équipe
 *   Yuji   217  → quasi-optimum (budget optimisé)
 */
export const BOSSES: Boss[] = [
  { id: "panda", name: "Panda", threshold: 90, image: "/assets/characters/Panda_Portrait_Anime.webp" },
  { id: "mahito", name: "Mahito", threshold: 140, image: "/assets/characters/Mahito_Portrait_Anime.webp" },
  { id: "geto", name: "Suguru Geto", threshold: 165, image: "/assets/characters/Suguru_Portrait_Anime.webp" },
  { id: "sukuna", name: "Ryomen Sukuna", threshold: 188, image: "/assets/characters/Sukuna_Portrait_Anime.webp" },
  { id: "gojo", name: "Satoru Gojo", threshold: 205, image: "/assets/characters/Satoru_Portrait_Anime.webp" },
  { id: "yuji", name: "Yuji Itadori", threshold: 217, image: "/assets/characters/Yuji_Portrait_Anime_2.webp" },
];

/** Contribution d'un perso placé dans `slotCategory`. */
export function contribution(
  character: DraftCharacter,
  slotCategory: DraftCategoryId,
): number {
  const base = character.statValue;
  const costBonus = Math.round(character.cost * COST_COEF);
  const categoryBonus =
    slotCategory === character.excellenceCategory
      ? Math.round(character.statValue * CATEGORY_BONUS)
      : 0;
  return base + costBonus + categoryBonus;
}

/** Coût total d'une sélection (persos résolus via `rosterById`). */
export function totalCost(
  selection: DraftSelection,
  rosterById: Record<string, DraftCharacter> = DRAFT_ROSTER_BY_ID,
): number {
  let cost = 0;
  for (const charId of Object.values(selection)) {
    const c = charId ? rosterById[charId] : undefined;
    if (c) cost += c.cost;
  }
  return cost;
}

/** Score global caché = somme des contributions des persos sélectionnés. */
export function computeGlobalScore(
  selection: DraftSelection,
  rosterById: Record<string, DraftCharacter> = DRAFT_ROSTER_BY_ID,
): number {
  let score = 0;
  for (const category of DRAFT_CATEGORIES) {
    const charId = selection[category.id];
    const character = charId ? rosterById[charId] : undefined;
    if (character) score += contribution(character, category.id);
  }
  return score;
}

/**
 * Déroule le combat à partir du score global : on affronte les boss en séquence
 * et on s'arrête au premier boss dont le seuil n'est pas atteint.
 */
export function resolveCombat(
  globalScore: number,
  bosses: Boss[] = BOSSES,
): CombatResult {
  const duels: DuelResult[] = [];
  let enemiesKilled = 0;

  for (const boss of bosses) {
    const survived = globalScore >= boss.threshold;
    duels.push({ boss, survived, margin: globalScore - boss.threshold });
    if (!survived) break;
    enemiesKilled += 1;
  }

  return {
    globalScore,
    enemiesKilled,
    outcome: enemiesKilled === bosses.length ? "VICTORY" : "DEFEAT",
    duels,
  };
}

/** Raccourci : score + combat à partir d'une sélection. */
export function evaluateDraft(
  selection: DraftSelection,
  rosterById: Record<string, DraftCharacter> = DRAFT_ROSTER_BY_ID,
): CombatResult {
  return resolveCombat(computeGlobalScore(selection, rosterById));
}

/**
 * Valide une sélection reçue du client (anti-triche côté serveur) : 8 catégories
 * présentes, persos connus, tous distincts, budget respecté. Le score n'est
 * jamais cru — il est recalculé via `evaluateDraft`. Ne vérifie pas le tirage
 * d'origine (non persisté) : le recalcul plafonne de toute façon le score au
 * maximum atteignable légalement.
 */
export type ValidationResult =
  | { ok: true; selection: DraftSelection }
  | { ok: false; error: string };

export function validateSelection(
  raw: unknown,
  rosterById: Record<string, DraftCharacter> = DRAFT_ROSTER_BY_ID,
): ValidationResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Draft manquant ou invalide." };
  }
  const obj = raw as Record<string, unknown>;
  const selection: DraftSelection = {};
  const seen = new Set<string>();

  for (const category of DRAFT_CATEGORIES) {
    const value = obj[category.id];
    if (typeof value !== "string") {
      return { ok: false, error: `Catégorie non remplie : ${category.id}.` };
    }
    if (!rosterById[value]) {
      return { ok: false, error: `Personnage inconnu : ${value}.` };
    }
    if (seen.has(value)) {
      return { ok: false, error: `Personnage en double : ${value}.` };
    }
    seen.add(value);
    selection[category.id] = value;
  }

  if (totalCost(selection, rosterById) > BUDGET) {
    return { ok: false, error: "Budget dépassé." };
  }
  return { ok: true, selection };
}
