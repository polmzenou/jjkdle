/**
 * ROTATION QUOTIDIENNE déterministe et SANS ÉTAT (module PUR, testable).
 *
 * Primitive partagée par le personnage mystère du jour (`lib/games/jjkdle/daily`)
 * et par l'étal exotic de la boutique (`lib/cards/shop`) : à partir d'une clé de
 * jour "YYYY-MM-DD" et d'une taille de pool, elle rend les indices du jour.
 *
 * Anti-répétition GARANTIE : `index = (phase + t·step) mod n` avec `step` premier
 * à `n`. Comme `t` parcourt les entiers CONSÉCUTIFS (`jour·count + i`), toute
 * fenêtre de `n` tirages consécutifs donne `n` indices distincts — donc pas de
 * doublon dans une même journée, ni de retour d'un élément tant que le pool n'a
 * pas été entièrement parcouru. Pas de jonction de blocs, pas d'état persistant.
 */

/** Hash déterministe FNV-1a 32 bits d'une chaîne. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Nombre de jours (entier) depuis l'époque Unix pour une clé "YYYY-MM-DD". */
export function dayNumber(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** PGCD. */
function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

/**
 * Pas premier avec `n`, proche du nombre d'or (≈0.618·n) pour une bonne
 * dispersion. Comme gcd(step, n) = 1, la suite `t·step mod n` parcourt les n
 * indices avant de se répéter.
 */
function coprimeStep(n: number): number {
  let step = Math.max(1, Math.round(n * 0.6180339887));
  while (gcd(step, n) !== 1) step = (step % n) + 1;
  return step;
}

/**
 * Les `count` indices du jour `dateKey` dans un pool de taille `n`.
 *
 * `salt` décale la phase : deux rotations de même taille (le daily et l'étal)
 * ne sortent donc pas systématiquement les mêmes positions le même jour.
 *
 * `count` est ramené à `n` : on ne peut pas servir plus d'éléments distincts que
 * le pool n'en contient. Renvoie `[]` sur un pool vide.
 */
export function dailyIndexes(
  dateKey: string,
  n: number,
  salt: string,
  count = 1,
): number[] {
  if (n <= 0) return [];
  const size = Math.min(Math.max(0, Math.trunc(count)), n);
  if (size === 0) return [];

  const day = dayNumber(dateKey);
  const phase = hashString(salt) % n;
  const step = coprimeStep(n);

  const out: number[] = [];
  for (let i = 0; i < size; i += 1) {
    // `t` est CONTIGU d'un jour à l'autre : c'est ce qui étend la garantie
    // anti-doublon au-delà de la journée.
    const t = day * size + i;
    out.push((((phase + t * step) % n) + n) % n);
  }
  return out;
}
