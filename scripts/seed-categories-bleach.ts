/**
 * Seed des CATÉGORIES du builder de l'univers Bleach.
 *
 *   npx tsx scripts/seed-categories-bleach.ts
 *
 * Écrit en base les 11 catégories de `lib/universes/bleach-categories.ts`.
 * Idempotent (upsert sur `@@unique([universeId, slug])`) : re-jouable sans
 * doublon — un re-run resynchronise libellé, description, poids, tirages et
 * ordre, sans jamais toucher aux notes déjà saisies.
 *
 * NE TOUCHE PAS aux personnages : les NOTES par personnage se saisissent via
 * /admin (onglet Roster), le panneau admin de la vue builder, ou en masse avec
 *   npx tsx scripts/seed-ratings.ts --universe bleach
 *
 * ⚠️ À LANCER AVANT `seed-ratings.ts`, qui échoue net tant qu'aucune catégorie
 * n'existe pour l'univers.
 *
 * Copie conforme de `seed-categories-tg.ts`, seuls les deux imports changent —
 * c'est le patron documenté pour amorcer le builder d'un nouvel univers.
 */

import { PrismaClient } from "@prisma/client";
import { BLEACH_CATEGORIES } from "../lib/universes/bleach-categories";
import { bleach } from "../lib/universes/bleach";

const prisma = new PrismaClient();

async function main() {
  const universe = await prisma.universe.findUnique({
    where: { slug: bleach.slug },
    select: { id: true },
  });
  if (!universe) {
    throw new Error(
      `Univers "${bleach.slug}" absent — le créer d'abord via ` +
        `npx tsx scripts/seed-universe.ts ${bleach.slug} (ou /admin/universes).`,
    );
  }

  for (const [position, c] of BLEACH_CATEGORIES.entries()) {
    // Le slug est la clé stable par univers ; l'id (PK globale) est la clé des
    // notes dans `Character.ratings` et ne doit jamais changer.
    const slug = c.id.replace(new RegExp(`^${bleach.slug}-`), "");
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
    `✓ ${BLEACH_CATEGORIES.length} définition(s) seedée(s) — ${total} catégorie(s) ` +
      `en base pour l'univers ${bleach.slug}.`,
  );
}

main()
  .then(() => console.log("Seed catégories Bleach terminé."))
  .catch((e) => {
    console.error("Seed catégories Bleach échoué :", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
