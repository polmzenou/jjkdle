import { prisma } from "@/lib/prisma";
import { getCachedImage } from "@/lib/admin/image-cache";
import { getCurrentUniverse } from "@/lib/universes/current";
import type { HLCharacter } from "./types";

/**
 * Lecture du pool « Higher/Lower » en base (source de vérité = roster JJKdle).
 * Module server-only (importe Prisma) : Server Components / Actions / Routes.
 *
 * Le pool = personnages dont l'attribut NUMERIC de référence est renseigné. On NE
 * crée AUCUNE stat : on lit la valeur posée via /admin (attribut data-driven,
 * étape 3 — pour JJK c'est l'énergie occulte « lore »).
 */

/** Il faut au moins 2 personnages notés pour lancer une partie. */
export const MIN_HL_POOL = 2;

/**
 * Clé de l'attribut comparé par Higher/Lower.
 *
 * Le jeu compare deux persos sur UNE valeur numérique. La clé reste `cursedEnergy`
 * (attribut JJK) ; l'étape 4 la rendra configurable par univers via le
 * `UniverseConfig`, en même temps que son libellé affiché.
 */
const HL_ATTRIBUTE_KEY = "cursedEnergy";

/** Personnages de l'univers dont la valeur comparée est renseignée. */
export async function getHigherLowerPool(
  universeId?: string,
): Promise<HLCharacter[]> {
  const uid = universeId ?? (await getCurrentUniverse()).id;
  const rows = await prisma.character.findMany({
    where: {
      universeId: uid,
      attributeValues: {
        some: {
          attribute: { key: HL_ATTRIBUTE_KEY, universeId: uid },
          numericValue: { not: null },
        },
      },
    },
    select: {
      id: true,
      name: true,
      image: true,
      attributeValues: {
        where: { attribute: { key: HL_ATTRIBUTE_KEY, universeId: uid } },
        select: { numericValue: true },
      },
    },
    orderBy: { position: "asc" },
  });

  return rows.map((r) => {
    // L'image en cache (bouton « OUAIS ») prime sur celle stockée en base.
    const image = getCachedImage(r.id) ?? r.image ?? undefined;
    return {
      id: r.id,
      name: r.name,
      ...(image ? { image } : {}),
      // Non-null garanti par le filtre `where` ci-dessus.
      cursedEnergy: r.attributeValues[0]!.numericValue as number,
    };
  });
}
