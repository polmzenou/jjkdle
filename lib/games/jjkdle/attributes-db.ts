import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CONTENT_REVALIDATE, CONTENT_TAG } from "@/lib/content/cache";
import { getCurrentUniverse } from "@/lib/universes/current";
import {
  buildAttributeSchema,
  type AttributeSchema,
  type AttributeSpec,
} from "./attribute-schema";

/**
 * Chargement du SCHÉMA D'ATTRIBUTS d'un univers depuis la base (étape 3).
 * Module server-only (importe Prisma) : Server Components / Actions / Routes.
 *
 * Le modèle pur vit dans attribute-schema.ts ; ce module ne fait que lire les
 * tables `Attribute`/`AttributeOption` et les mettre en forme.
 */

/**
 * Cache PARTAGÉ entre requêtes (Data Cache de Next, tag `content`), puis
 * mémoïsation par requête (`cache()` de React).
 *
 * Un cache mémoire au niveau du module avait été écarté : il ne pouvait être
 * vidé que dans l'instance qui faisait la modification, les autres continuaient
 * de servir l'ancien schéma. Le Data Cache, lui, est commun à toutes les
 * instances : chaque écriture d'attribut (lib/admin/attribute-store.ts) appelle
 * `invalidateContent()`, et la lecture suivante repart de la base partout.
 * Seules les colonnes brutes (JSON pur) sont mises en cache ; le schéma est
 * reconstruit à chaque lecture.
 */
const loadColumns = unstable_cache(
  async (universeId: string): Promise<AttributeSpec[]> => {
    const rows = await prisma.attribute.findMany({
      where: { universeId },
      orderBy: { position: "asc" },
      select: {
        key: true,
        label: true,
        kind: true,
        comparable: true,
        tolerance: true,
        options: {
          // Ordre d'affichage des options dans les `<select>` de l'admin : le
          // rang significatif d'abord (listes ordonnées), puis le libellé.
          orderBy: [{ order: "asc" }, { label: "asc" }],
          select: { value: true, label: true, order: true },
        },
      },
    });

    const columns: AttributeSpec[] = rows.map((r) => ({
      key: r.key,
      label: r.label,
      kind: r.kind,
      comparable: r.comparable,
      tolerance: r.tolerance,
      options: r.options.map((o) => ({
        value: o.value,
        label: o.label,
        order: o.order,
      })),
    }));

    return columns;
  },
  ["content-attribute-columns"],
  { tags: [CONTENT_TAG], revalidate: CONTENT_REVALIDATE },
);

const loadForUniverse = cache(
  async (universeId: string): Promise<AttributeSchema> =>
    buildAttributeSchema(await loadColumns(universeId)),
);

/**
 * Schéma d'attributs de l'univers (défaut = univers courant), colonnes triées
 * par `position` — c'est cet ordre qui pilote la grille du jeu.
 */
export async function loadAttributeSchema(
  universeId?: string,
): Promise<AttributeSchema> {
  return loadForUniverse(universeId ?? (await getCurrentUniverse()).id);
}
