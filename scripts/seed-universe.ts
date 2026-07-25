/**
 * Crée (ou met à jour) la ligne `Universe` d'un anime — ÉTAPE 5.
 *
 *   npx tsx scripts/seed-universe.ts <slug>
 *   npx tsx scripts/seed-universe.ts csm
 *
 * Le slug doit exister dans le registre (`lib/universes/registry.ts`) : la
 * CONFIG (thème, domaines, libellés) vit en code, seule la ligne de base est
 * créée ici. C'est elle qui permet de rattacher du contenu à l'univers.
 *
 * Idempotent : un univers déjà présent voit juste son nom resynchronisé.
 *
 * Ajouter un anime, de bout en bout :
 *   1. `lib/universes/<slug>.ts` + ajout à `UNIVERSES` (registre) ;
 *   2. `lib/universes/<slug>-attributes.ts` (optionnel : amorçage des attributs) ;
 *   3. ce script ;
 *   4. le reste via /admin (sélecteur d'univers) : attributs, roster, catégories.
 */

import { PrismaClient } from "@prisma/client";
import { getUniverseBySlug, listUniverses } from "../lib/universes/registry";

const prisma = new PrismaClient();

async function main() {
  const slug = process.argv[2]?.trim();
  if (!slug) {
    throw new Error(
      `Slug manquant. Usage : npx tsx scripts/seed-universe.ts <slug>\n` +
        `Slugs configurés : ${listUniverses()
          .map((u) => u.slug)
          .join(", ")}`,
    );
  }

  const config = getUniverseBySlug(slug);
  if (!config) {
    throw new Error(
      `Univers "${slug}" absent du registre — créer lib/universes/${slug}.ts ` +
        `et l'ajouter à UNIVERSES avant de lancer ce script.\n` +
        `Slugs configurés : ${listUniverses()
          .map((u) => u.slug)
          .join(", ")}`,
    );
  }

  const universe = await prisma.universe.upsert({
    where: { slug: config.slug },
    create: { slug: config.slug, name: config.name },
    update: { name: config.name },
    select: { id: true, slug: true, name: true },
  });

  console.log(
    `✓ Univers "${universe.slug}" (${universe.name}) prêt — id ${universe.id}`,
  );
  console.log(`  domaines : ${config.domains.join(", ")}`);
  console.log(
    `  Prochaine étape : /admin → sélecteur d'univers → onglet Attributs.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e instanceof Error ? e.message : e);
    await prisma.$disconnect();
    process.exit(1);
  });
