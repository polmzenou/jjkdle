import { headers } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { DEFAULT_UNIVERSE_SLUG, getUniverseBySlug } from "./registry";
import type { UniverseConfig } from "./types";

/**
 * Résolution de l'UNIVERS COURANT côté serveur. Module server-only (importe
 * Prisma) : Server Components / Actions / Route Handlers.
 *
 * L'univers est déterminé par le HOSTNAME dans `middleware.ts`, qui pose le slug
 * dans le header `x-universe`. Cette fonction est le SEUL point de lecture de ce
 * header : tout le reste du code appelle simplement `getCurrentUniverse()`.
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
