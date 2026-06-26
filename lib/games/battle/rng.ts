/**
 * RNG déterministe pour le tirage de cartes. Le tirage est calculé CÔTÉ SERVEUR
 * uniquement à partir de la graine de l'hôte (`seed`) et du curseur (`drawCount`) :
 * reproductible, et le client ne reçoit jamais la prochaine carte.
 */

/** PRNG mulberry32 : rapide, déterministe, suffisant pour un tirage de jeu. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Tire une carte (id) dans `ids` de façon déterministe. Répétitions autorisées
 * (tirage à l'aveugle dans le roster complet à chaque tour).
 */
export function pickCard(seed: number, drawCount: number, ids: string[]): string {
  const rand = mulberry32((seed + drawCount * 0x9e3779b9) >>> 0);
  const index = Math.floor(rand() * ids.length);
  return ids[Math.min(index, ids.length - 1)];
}

/** Graine aléatoire pour une nouvelle partie. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}
