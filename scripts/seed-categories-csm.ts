/**
 * Seed des CATÉGORIES du builder de l'univers CSM.
 *
 *   npx tsx scripts/seed-categories-csm.ts
 *
 * Écrit en base les 8 catégories de `lib/universes/csm-categories.ts`.
 * Idempotent (upsert sur `@@unique([universeId, slug])`) : re-jouable sans
 * doublon — un re-run resynchronise libellé, description, poids, tirages et
 * ordre, sans jamais toucher aux notes déjà saisies.
 *
 * NE TOUCHE PAS aux personnages : les NOTES par personnage se saisissent via
 * /admin (onglet Roster) ou le panneau admin de la vue builder.
 *
 * Amorcer un NOUVEL univers = copier ce script en changeant les deux imports.
 */

import { PrismaClient } from "@prisma/client";
import { CSM_CATEGORIES } from "../lib/universes/csm-categories";
import { csm } from "../lib/universes/csm";

const prisma = new PrismaClient();

async function main() {
  const universe = await prisma.universe.findUnique({
    where: { slug: csm.slug },
    select: { id: true },
  });
  if (!universe) {
    throw new Error(
      `Univers "${csm.slug}" absent — le créer d'abord via /admin/universes.`,
    );
  }

  for (const [position, c] of CSM_CATEGORIES.entries()) {
    // Le slug est la clé stable par univers ; l'id (PK globale) est la clé des
    // notes dans `Character.ratings` et ne doit jamais changer.
    const slug = c.id.replace(new RegExp(`^${csm.slug}-`), "");
    const data = {
      label: c.label,
      description: c.description,
      weight: c.weight,
      drawCount: c.drawCount,
      // L'ordre du tableau pilote l'ordre des lignes du builder.
      position,
    };
    await prisma.category.upsert({
      where: { universeId_slug: { universeId: universe.id, slug } },
      create: { id: c.id, slug, universeId: universe.id, ...data },
      update: data,
      select: { id: true },
    });
    console.log(`✓ ${c.id} (position ${position}, poids ${c.weight})`);
  }

  // Contrôle : un excédent signale une catégorie créée via l'admin, ce qui est
  // légitime — le seed n'est qu'un point de départ.
  const total = await prisma.category.count({
    where: { universeId: universe.id },
  });
  console.log(
    `✓ ${CSM_CATEGORIES.length} définition(s) seedée(s) — ${total} catégorie(s) ` +
      `en base pour l'univers ${csm.slug}.`,
  );
}

main()
  .then(() => console.log("Seed catégories CSM terminé."))
  .catch((e) => {
    console.error("Seed catégories CSM échoué :", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
