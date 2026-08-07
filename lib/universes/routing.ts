/**
 * ROUTAGE PAR PRÉFIXE DE CHEMIN (`/jjk/games`, `/csm/games`).
 * Module PUR (utilisable dans le middleware Edge, côté serveur et côté client).
 *
 * Un seul domaine sert tous les animes : c'est le PREMIER SEGMENT du chemin qui
 * détermine l'univers. Ce segment EXISTE dans l'arborescence (`app/[universe]/`) :
 * les pages ne sont pas réécrites, sans quoi tous les univers partageraient le
 * même arbre de segments et le chrome (palette, logo, nav) ne se re-rendrait
 * jamais d'un anime à l'autre. Un seul dossier dynamique suffit — toujours aucun
 * `app/jjk/` ni `app/csm/`.
 *
 *   /                → hub (choix de l'univers)
 *   /jjk             → landing JJK      (app/[universe]/page.tsx)
 *   /jjk/games/...   → jeux JJK         (app/[universe]/games/...)
 *   /admin           → administration   (hors univers : cf. admin-scope)
 *   /jjk/api/...     → route API JJK    (réécrit vers `/api/...`)
 *
 * Les chemins SANS préfixe sont redirigés vers leur forme préfixée (cf.
 * middleware) : un lien qui aurait oublié le préfixe ne renvoie donc pas
 * silencieusement sur l'univers par défaut.
 */

/** Chemins qui n'appartiennent à AUCUN univers (jamais préfixés). */
const UNIVERSE_FREE_PREFIXES = [
  "/admin", // administration : son univers vient d'un cookie (admin-scope)
  "/universes", // hub
  // Le casino ne se joue pas dans un anime : il mise des coins, qui sont GLOBAUX
  // (`User.coins`). Le préfixer par un univers découperait les tables publiques
  // par anime — moins de joueurs par table pour une distinction que le jeu ne
  // fait pas. Il a sa propre palette, cf. `casinoThemeCss` dans ./theme.
  "/casino",
  "/login",
  "/register",
  "/og", // image d'aperçu social
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
  "/icon", // app/icon.png
  "/apple-icon", // app/apple-icon.tsx
];

/** Vrai si ce chemin ne doit jamais porter de préfixe d'univers. */
export function isUniverseFreePath(pathname: string): boolean {
  return UNIVERSE_FREE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/** Découpe un chemin en `{ slug, rest }` si son 1er segment est un slug connu. */
export function splitUniversePath(
  pathname: string,
  isKnownSlug: (slug: string) => boolean,
): { slug: string; rest: string } | null {
  const match = /^\/([^/]+)(\/.*)?$/.exec(pathname);
  if (!match) return null;
  const [, first, rest] = match;
  if (!isKnownSlug(first)) return null;
  // `/jjk` → rest `/` (la landing de l'univers).
  return { slug: first, rest: rest && rest !== "" ? rest : "/" };
}

/**
 * Préfixe un chemin interne par l'univers : `/games` → `/jjk/games`.
 *
 * À utiliser pour TOUT lien interne (et tout `fetch` d'API) afin que l'univers
 * ne soit jamais perdu. Les chemins hors univers (admin, auth, hub) et les URLs
 * absolues sont renvoyés inchangés.
 */
export function universePath(pathname: string, slug: string): string {
  if (!pathname.startsWith("/")) return pathname; // URL absolue ou ancre
  if (isUniverseFreePath(pathname)) return pathname;
  // `/` → `/jjk` (et non `/jjk/`, pour garder des URLs canoniques stables).
  if (pathname === "/") return `/${slug}`;
  return `/${slug}${pathname}`;
}

/**
 * Opération INVERSE de `universePath` : `/jjk/games` → `/games`, `/jjk` → `/`.
 *
 * Nécessaire côté client depuis que l'univers n'est plus effacé par une
 * réécriture : `usePathname()` renvoie l'URL réelle, préfixe compris. Tout code
 * qui raisonne sur la route « logique » (lien actif, page de jeu…) doit donc
 * dépréfixer d'abord. Un chemin qui ne porte pas ce préfixe est rendu inchangé.
 */
export function stripUniversePath(pathname: string, slug: string): string {
  if (pathname === `/${slug}`) return "/";
  if (pathname.startsWith(`/${slug}/`)) return pathname.slice(slug.length + 1);
  return pathname;
}
