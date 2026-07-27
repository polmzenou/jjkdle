import { prisma } from "@/lib/prisma";
import { getCachedImage } from "@/lib/admin/image-cache";
import { getCurrentUniverse } from "@/lib/universes/current";
import type { HLCharacter, HLPool } from "./types";

/**
 * Lecture du pool « Higher/Lower » en base (source de vérité = roster + attributs
 * saisis via /admin). Module server-only (importe Prisma) : Server Components /
 * Actions / Routes.
 *
 * On NE crée AUCUNE stat : le jeu compare l'attribut désigné par l'univers
 * (`UniverseConfig.higherLower`, défaut `cursedEnergy` pour JJK), quel que soit
 * son type :
 *  - NUMERIC  → la valeur comparée est le nombre saisi, affiché tel quel ;
 *  - ORDINAL  → la valeur comparée est le RANG de l'option (`AttributeOption.order`),
 *    la carte affiche son libellé (CSM : « Minimum » … « Surpuissant »), et les
 *    ex æquo — fréquents avec 7 rangs — sont départagés par `battleValue`.
 *
 * Les autres types (CATEGORICAL, BOOLEAN) n'ont pas d'ordre : un univers qui
 * en désignerait un obtiendrait un pool vide (le jeu s'affiche alors désactivé).
 */

/** Il faut au moins 2 personnages notés pour lancer une partie. */
export const MIN_HL_POOL = 2;

/** Attribut comparé par défaut, quand l'univers n'en déclare pas (JJK). */
const DEFAULT_HL_ATTRIBUTE_KEY = "cursedEnergy";

/**
 * Personnages de l'univers dont la valeur comparée est renseignée, + le libellé
 * de l'attribut comparé (affiché sur les cartes et dans les consignes).
 */
export async function getHigherLowerPool(universeId?: string): Promise<HLPool> {
  const universe = await getCurrentUniverse();
  const uid = universeId ?? universe.id;
  const key = universe.config.higherLower?.attributeKey ?? DEFAULT_HL_ATTRIBUTE_KEY;

  const attribute = await prisma.attribute.findUnique({
    where: { universeId_key: { universeId: uid, key } },
    select: {
      id: true,
      label: true,
      kind: true,
      options: { select: { id: true, label: true, order: true } },
    },
  });
  // Attribut absent (univers pas encore configuré) : pool vide, pas d'exception.
  if (!attribute) return { attributeLabel: key, characters: [] };

  const numeric = attribute.kind === "NUMERIC";
  // Une option sans `order` n'est pas comparable (cf. « Pas de grade » en JJK) :
  // les personnages qui la portent sont hors pool.
  const rankByOptionId = new Map(
    attribute.options
      .filter((o) => o.order !== null)
      .map((o) => [o.id, { rank: o.order as number, label: o.label }]),
  );
  if (!numeric && rankByOptionId.size === 0) {
    return { attributeLabel: attribute.label, characters: [] };
  }

  const rows = await prisma.character.findMany({
    where: {
      universeId: uid,
      attributeValues: {
        some: {
          attributeId: attribute.id,
          ...(numeric
            ? { numericValue: { not: null } }
            : { optionId: { in: [...rankByOptionId.keys()] } }),
        },
      },
    },
    select: {
      id: true,
      name: true,
      image: true,
      // Départage des ex æquo sur un attribut ORDINAL (cf. plus bas).
      battleValue: true,
      attributeValues: {
        where: { attributeId: attribute.id },
        select: { numericValue: true, optionId: true },
      },
    },
    orderBy: { position: "asc" },
  });

  return {
    attributeLabel: attribute.label,
    characters: rows.flatMap((r): HLCharacter[] => {
      // L'image en cache (bouton « OUAIS ») prime sur celle stockée en base.
      const image = getCachedImage(r.id) ?? r.image ?? undefined;
      const raw = r.attributeValues[0];
      if (!raw) return [];

      // NUMERIC : la valeur affichée EST la valeur comparée, donc aucun départage
      // caché — un « 60 vs 60 » tranché en douce paraîtrait arbitraire au joueur.
      // ORDINAL : les rangs sont peu nombreux, les ex æquo sont la norme et le
      // départage par `battleValue` est ce qui rend la paire jouable.
      const graded = numeric
        ? { value: raw.numericValue as number, tiebreak: 0, valueLabel: String(raw.numericValue) }
        : (() => {
            const option = raw.optionId ? rankByOptionId.get(raw.optionId) : undefined;
            if (!option) return null;
            return {
              value: option.rank,
              // Personnage sans `battleValue` : 0, il perd tous ses ex æquo.
              tiebreak: r.battleValue ?? 0,
              valueLabel: option.label,
            };
          })();
      if (!graded) return [];

      return [{ id: r.id, name: r.name, ...(image ? { image } : {}), ...graded }];
    }),
  };
}
