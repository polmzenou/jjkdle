import { prisma } from "@/lib/prisma";
import { DEFAULT_UNIVERSE_SLUG, getUniverseBySlug } from "./registry";
import type { UniverseConfig } from "./types";

/**
 * Résolution de l'UNIVERS COURANT côté serveur. Module server-only (importe
 * Prisma) : Server Components / Actions / Route Handlers.
 *
 * Étapes 1-3 : renvoie toujours l'univers par DÉFAUT (JJK). Le vrai routing par
 * hostname (middleware → header `x-universe`) arrive à l'étape 4 ; cette
 * fonction en sera le SEUL point de bascule — tout le reste du code lit déjà
 * `getCurrentUniverse()`.
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

/** Univers courant (défaut JJK jusqu'à l'étape 4). */
export async function getCurrentUniverse(): Promise<CurrentUniverse> {
  const slug = DEFAULT_UNIVERSE_SLUG;
  const config = getUniverseBySlug(slug);
  if (!config) {
    throw new Error(`Config univers introuvable pour le slug "${slug}".`);
  }
  const id = await resolveId(slug);
  return { id, slug, config };
}
