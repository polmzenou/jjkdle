import { cache } from "react";
import { prisma } from "@/lib/prisma";
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
 * Mémoïsation PAR REQUÊTE (`cache()` de React), pas par process.
 *
 * Un cache mémoire au niveau du module semblait raisonnable — définitions lues à
 * chaque partie, écrites de loin en loin — mais il ne peut être vidé que dans
 * l'instance qui a fait la modification. Toutes les autres continuaient de
 * servir l'ancien schéma jusqu'à leur recyclage : un attribut supprimé restait
 * listé dans le formulaire du roster, un attribut créé n'y apparaissait pas, et
 * l'admin ne pouvait qu'attendre. La table est minuscule : une requête par rendu
 * est un prix dérisoire pour un effet immédiat.
 */
const loadForUniverse = cache(
  async (universeId: string): Promise<AttributeSchema> => {
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

    return buildAttributeSchema(columns);
  },
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
