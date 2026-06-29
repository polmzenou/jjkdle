/**
 * Cache mémoire des images récupérées via l'API booru (bouton « OUAIS »).
 *
 * Les URLs ne sont PAS persistées en base : on les garde en mémoire serveur,
 * avec un TTL. Au rendu, le roster superpose ce cache à l'image stockée en base
 * (cf. lib/content/queries.ts et lib/games/draft/queries.ts).
 *
 * Stocké sur `globalThis` pour survivre au hot-reload de Next en dev. En
 * production serverless, le cache est par-instance et éphémère (c'est le but :
 * « pas permanent ») — il se reconstruit au prochain clic sur « OUAIS ».
 */

type CacheEntry = { url: string; at: number };

const TTL_MS = 1000 * 60 * 60 * 24; // 24 h

const GLOBAL_KEY = Symbol.for("jjk.imageCache");
type GlobalWithCache = typeof globalThis & {
  [GLOBAL_KEY]?: Map<string, CacheEntry>;
};
const g = globalThis as GlobalWithCache;
const store: Map<string, CacheEntry> = g[GLOBAL_KEY] ?? new Map();
g[GLOBAL_KEY] = store;

/** Mémorise l'URL d'image d'un perso (clé = id de perso). */
export function setCachedImage(id: string, url: string): void {
  store.set(id, { url, at: Date.now() });
}

/** URL en cache pour un perso, ou `undefined` si absente/expirée. */
export function getCachedImage(id: string): string | undefined {
  const entry = store.get(id);
  if (!entry) return undefined;
  if (Date.now() - entry.at > TTL_MS) {
    store.delete(id);
    return undefined;
  }
  return entry.url;
}
