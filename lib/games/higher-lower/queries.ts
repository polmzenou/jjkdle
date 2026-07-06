import { prisma } from "@/lib/prisma";
import { getCachedImage } from "@/lib/admin/image-cache";
import type { HLCharacter } from "./types";

/**
 * Lecture du pool « Higher/Lower » en base (source de vérité = roster JJKdle).
 * Module server-only (importe Prisma) : Server Components / Actions / Routes.
 *
 * Le pool = personnages dont l'énergie occulte lore (`cursedEnergy`) est
 * renseignée. On NE crée AUCUNE stat : on lit la valeur existante posée via
 * /admin (cf. schema.prisma → Character.cursedEnergy).
 */

/** Il faut au moins 2 personnages notés pour lancer une partie. */
export const MIN_HL_POOL = 2;

/** Personnages avec une énergie occulte renseignée, prêts pour le duel. */
export async function getHigherLowerPool(): Promise<HLCharacter[]> {
  const rows = await prisma.character.findMany({
    where: { cursedEnergy: { not: null } },
    select: { id: true, name: true, image: true, cursedEnergy: true },
    orderBy: { position: "asc" },
  });

  return rows.map((r) => {
    // L'image en cache (bouton « OUAIS ») prime sur celle stockée en base.
    const image = getCachedImage(r.id) ?? r.image ?? undefined;
    return {
      id: r.id,
      name: r.name,
      ...(image ? { image } : {}),
      // cursedEnergy est non-null par le filtre `where` ci-dessus.
      cursedEnergy: r.cursedEnergy as number,
    };
  });
}
