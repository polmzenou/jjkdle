import type { CategoryConfig, CategoryId } from "@/data/roster/categories";
import type { Character } from "@/data/roster/characters";

/**
 * Logique de tirage du builder, isolée et testable.
 *
 *  - Éligibilité : un personnage n'apparaît dans une catégorie que s'il possède
 *    une note pour cette catégorie (`ratings[categoryId]` défini).
 *  - Taille du tirage : `min(category.drawCount, nbÉligibles)` — on montre « le
 *    plus de personnages possible » sans jamais dépasser le plafond configuré.
 *  - Réutilisation autorisée : un personnage déjà verrouillé ailleurs reste
 *    éligible (aucun retrait du pool).
 *  - RNG injectable pour des tests déterministes.
 */

/** Générateur pseudo-aléatoire : doit renvoyer un float dans [0, 1). */
export type Rng = () => number;

/** Personnages possédant une note pour la catégorie donnée. */
export function eligibleFor(
  categoryId: CategoryId,
  roster: Character[],
): Character[] {
  return roster.filter((c) => c.ratings[categoryId] !== undefined);
}

/** Mélange de Fisher-Yates (copie, ne mute pas l'entrée). */
export function shuffle<T>(items: T[], rng: Rng = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Tire les personnages proposés pour une catégorie : échantillon aléatoire
 * sans doublon dans la ligne, de taille `min(drawCount, nbÉligibles)`.
 */
export function drawCategory(
  category: CategoryConfig,
  roster: Character[],
  rng: Rng = Math.random,
): Character[] {
  const pool = eligibleFor(category.id, roster);
  const count = Math.min(category.drawCount, pool.length);
  return shuffle(pool, rng).slice(0, count);
}

/** Résultat d'un tirage : un tableau de cartes par catégorie. */
export type Draw = Record<CategoryId, Character[]>;

/** Tire toutes les catégories (utilisé au démarrage de la partie). */
export function drawAll(
  categories: CategoryConfig[],
  roster: Character[],
  rng: Rng = Math.random,
): Draw {
  const draw = {} as Draw;
  for (const category of categories) {
    draw[category.id] = drawCategory(category, roster, rng);
  }
  return draw;
}

/**
 * Re-tire uniquement les catégories NON verrouillées, en conservant le tirage
 * existant pour celles qui le sont. Utilisé après chaque sélection du joueur.
 */
export function redrawUnlocked(
  current: Draw,
  categories: CategoryConfig[],
  lockedIds: Set<CategoryId>,
  roster: Character[],
  rng: Rng = Math.random,
): Draw {
  const next = {} as Draw;
  for (const category of categories) {
    next[category.id] = lockedIds.has(category.id)
      ? current[category.id]
      : drawCategory(category, roster, rng);
  }
  return next;
}

// ──────────────────────────────────────────────────────────────────────────
// Variante "1 personnage par catégorie" (layout grille, tap-to-lock)
// ──────────────────────────────────────────────────────────────────────────

/** Tirage grille : un personnage (ou null si aucun éligible) par catégorie. */
export type SingleDraw = Record<CategoryId, Character | null>;

/** Tire UN personnage aléatoire parmi les éligibles d'une catégorie. */
export function drawOne(
  categoryId: CategoryId,
  roster: Character[],
  rng: Rng = Math.random,
): Character | null {
  const pool = eligibleFor(categoryId, roster);
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}

/** Tire un personnage pour chaque catégorie (démarrage de partie). */
export function drawAllOne(
  categories: CategoryConfig[],
  roster: Character[],
  rng: Rng = Math.random,
): SingleDraw {
  const draw = {} as SingleDraw;
  for (const category of categories) {
    draw[category.id] = drawOne(category.id, roster, rng);
  }
  return draw;
}

/**
 * Re-tire uniquement les catégories NON verrouillées (conserve les autres).
 * Utilisé après chaque tap du joueur.
 */
export function redrawUnlockedOne(
  current: SingleDraw,
  categories: CategoryConfig[],
  lockedIds: Set<CategoryId>,
  roster: Character[],
  rng: Rng = Math.random,
): SingleDraw {
  const next = {} as SingleDraw;
  for (const category of categories) {
    next[category.id] = lockedIds.has(category.id)
      ? current[category.id]
      : drawOne(category.id, roster, rng);
  }
  return next;
}

/**
 * Petit générateur déterministe (mulberry32) — pratique pour les tests et pour
 * reproduire une partie à partir d'une graine.
 */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
