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
 * Mélange déterministe (Fisher-Yates) de `ids` à partir de la seule graine.
 * Ne dépend PAS du curseur : la même graine produit toujours le même ordre, ce
 * qui permet d'indexer le tirage par `drawCount` sans jamais retomber deux fois
 * sur la même carte.
 */
export function shuffleIds(seed: number, ids: string[]): string[] {
  const rand = mulberry32(seed >>> 0);
  const out = ids.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Tire une carte (id) dans `ids` de façon déterministe et SANS DOUBLON : on
 * parcourt un ordre mélangé fixé par la graine et on renvoie la `drawCount`-ième
 * carte. Tant que `drawCount < ids.length`, chaque tirage est unique.
 */
export function pickCard(seed: number, drawCount: number, ids: string[]): string {
  if (ids.length === 0) return ids[0];
  const shuffled = shuffleIds(seed, ids);
  return shuffled[drawCount % shuffled.length];
}

/** Graine aléatoire pour une nouvelle partie. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}
