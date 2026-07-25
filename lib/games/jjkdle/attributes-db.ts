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

// Les définitions d'attributs changent très rarement (édition admin ponctuelle,
// cf. étape 5) alors qu'elles sont lues à chaque partie → cache mémoire par
// univers, même approche que le cache slug→id de lib/universes/current.ts.
// L'admin appelle `invalidateAttributeSchema` après une modification.
const cache = new Map<string, AttributeSchema>();

/**
 * Schéma d'attributs de l'univers (défaut = univers courant), colonnes triées
 * par `position` — c'est cet ordre qui pilote la grille du jeu.
 */
export async function loadAttributeSchema(
  universeId?: string,
): Promise<AttributeSchema> {
  const uid = universeId ?? (await getCurrentUniverse()).id;
  const cached = cache.get(uid);
  if (cached) return cached;

  const rows = await prisma.attribute.findMany({
    where: { universeId: uid },
    orderBy: { position: "asc" },
    select: {
      key: true,
      label: true,
      kind: true,
      comparable: true,
      tolerance: true,
      options: {
        // Ordre d'affichage des options dans les `<select>` de l'admin : le rang
        // significatif d'abord (listes ordonnées), puis le libellé.
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

  const schema = buildAttributeSchema(columns);
  cache.set(uid, schema);
  return schema;
}

/** Vide le cache (après édition des attributs côté admin). */
export function invalidateAttributeSchema(universeId?: string): void {
  if (universeId) cache.delete(universeId);
  else cache.clear();
}
