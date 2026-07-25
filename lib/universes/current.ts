import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { DEFAULT_UNIVERSE_SLUG, getUniverseBySlug } from "./registry";
import { universePath } from "./routing";
import type { UniverseConfig } from "./types";

/**
 * Résolution de l'UNIVERS COURANT côté serveur. Module server-only (importe
 * Prisma) : Server Components / Actions / Route Handlers.
 *
 * L'univers est déterminé par le PREMIER SEGMENT DE L'URL (`/jjk/games`) dans
 * `middleware.ts`, qui pose le slug dans le header `x-universe`. Ce module est le
 * SEUL point de lecture de ce header : tout le reste du code appelle simplement
 * `getCurrentUniverse()`.
 *
 * Repli en cascade, pour ne jamais planter :
 *   1. header `x-universe` (cas normal, posé par le middleware) ;
 *   2. `DEFAULT_UNIVERSE` / JJK — quand `headers()` n'est pas disponible
 *      (génération statique : sitemap, robots, manifest, og) ou que le slug
 *      reçu est inconnu du registre.
 */

export interface CurrentUniverse {
  /** `Universe.id` en base (sert de filtre `universeId` aux requêtes de contenu). */
  id: string;
  /** Slug stable (ex. "jjk"). */
  slug: string;
  /** Config code (thème/branding/labels). */
  config: UniverseConfig;
}

// Le mapping slug → id est stable → cache mémoire (évite un round-trip par requête).
const idBySlug = new Map<string, string>();

async function resolveId(slug: string): Promise<string> {
  const cached = idBySlug.get(slug);
  if (cached) return cached;
  const row = await prisma.universe.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!row) {
    throw new Error(
      `Univers "${slug}" absent en base. Lancer scripts/backfill-universe.ts.`,
    );
  }
  idBySlug.set(slug, row.id);
  return row.id;
}

/** Résout l'id base d'un univers par slug (helper admin/étape 5). */
export async function getUniverseId(slug: string): Promise<string> {
  return resolveId(slug);
}

/** Lecture d'un header posé par le middleware, tolérante au rendu statique. */
async function middlewareFlag(name: string): Promise<boolean> {
  try {
    return (await headers()).get(name) === "1";
  } catch {
    return false; // hors requête (génération statique)
  }
}

/**
 * Vrai si la requête courante REND la page hub (choix d'univers). Sert à retirer
 * la nav et la marque d'un anime, et à neutraliser les métadonnées.
 */
export const isHubRequest = cache(() => middlewareFlag("x-hub"));

/**
 * Préfixe un chemin interne par l'univers courant, côté SERVEUR :
 * `/games` → `/jjk/games`.
 *
 * À utiliser pour tout `href`, `redirect()` et URL canonique rendus côté serveur.
 * L'équivalent client est `useUniverseHref()` (components/universe).
 */
export async function universeHref(pathname: string): Promise<string> {
  return universePath(pathname, await getCurrentUniverseSlug());
}

/**
 * Invalide le cache d'une route de l'espace univers depuis son chemin LOGIQUE :
 * `revalidateUniversePath("/games/jjkdle")` invalide `/jjk/games/jjkdle`.
 *
 * À utiliser pour TOUTE invalidation d'une page sous `app/[universe]/`. Un
 * `revalidatePath("/games/jjkdle")` nu ne correspond à aucune route depuis que
 * l'univers est un segment réel : il n'invaliderait rien, silencieusement.
 *
 * L'univers ciblé est celui de la requête courante — donc, dans une action
 * `/admin`, celui que l'admin administre (cf. admin-scope) : on invalide bien
 * l'univers que l'on vient de modifier.
 */
export async function revalidateUniversePath(
  pathname: string,
  type?: "page" | "layout",
): Promise<void> {
  revalidatePath(await universeHref(pathname), type);
}

/** Univers utilisable : présent en base ET configuré en code. */
export interface AvailableUniverse {
  id: string;
  slug: string;
  name: string;
  config: UniverseConfig;
}

/**
 * Univers réellement UTILISABLES : il faut à la fois une ligne `Universe` (les
 * données s'y rattachent) et un `UniverseConfig` en code (thème, domaines).
 *
 * Une ligne sans config est ignorée : on ne saurait ni la thémer ni la router.
 * Sert au sélecteur d'univers de l'admin et au hub.
 */
export async function listAvailableUniverses(): Promise<AvailableUniverse[]> {
  const rows = await prisma.universe.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, slug: true, name: true },
  });
  return rows.flatMap((row) => {
    const config = getUniverseBySlug(row.slug);
    return config ? [{ ...row, config }] : [];
  });
}

/**
 * Slug de l'univers courant, lu depuis le header posé par le middleware.
 *
 * `headers()` lève hors contexte de requête (rendu statique) : on retombe alors
 * silencieusement sur l'univers par défaut, ce qui garde sitemap/robots/manifest
 * générables statiquement.
 */
export const getCurrentUniverseSlug = cache(async (): Promise<string> => {
  let slug: string | null = null;
  try {
    slug = (await headers()).get("x-universe");
  } catch {
    slug = null; // hors requête (génération statique)
  }
  // Un slug inconnu du registre (domaine mal configuré) ne casse pas la page.
  return slug && getUniverseBySlug(slug) ? slug : DEFAULT_UNIVERSE_SLUG;
});

/**
 * Config de l'univers courant, SANS toucher la base. À utiliser quand seul le
 * branding/thème/les libellés sont nécessaires (métadonnées, logo, thème CSS) :
 * évite une requête inutile.
 */
export const getCurrentUniverseConfig = cache(
  async (): Promise<UniverseConfig> => {
    const slug = await getCurrentUniverseSlug();
    const config = getUniverseBySlug(slug);
    if (!config) {
      throw new Error(`Config univers introuvable pour le slug "${slug}".`);
    }
    return config;
  },
);

/**
 * Univers courant (config + `id` en base). Mémoïsé par requête via `cache()`
 * (même pattern que `getCurrentUser`) : appelé par presque toutes les requêtes
 * de contenu, il ne doit coûter qu'une seule résolution par rendu.
 */
export const getCurrentUniverse = cache(async (): Promise<CurrentUniverse> => {
  const config = await getCurrentUniverseConfig();
  const id = await resolveId(config.slug);
  return { id, slug: config.slug, config };
});
