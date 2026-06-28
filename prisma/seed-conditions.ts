/**
 * Seed ciblé : met à jour UNIQUEMENT les conditions "Pyramid"
 * (table rankingCondition) depuis data/ranking/conditions.ts.
 *
 *   npx tsx prisma/seed-conditions.ts
 *
 * À utiliser quand on a modifié l'ordre / les personnages d'une condition
 * dans conditions.ts et qu'on veut le pousser en base SANS réécrire le
 * roster, les catégories ou le Draft (qui ont pu être édités via le CRUD).
 */

import { PrismaClient } from "@prisma/client";
import { CONDITIONS } from "../data/ranking/conditions";

const prisma = new PrismaClient();

async function main() {
  for (const [position, cond] of CONDITIONS.entries()) {
    const data = {
      category: cond.category,
      prompt: cond.prompt,
      order: cond.order,
      position,
    };
    await prisma.rankingCondition.upsert({
      where: { id: cond.id },
      create: { id: cond.id, ...data },
      update: data,
    });
  }
  console.log(`✓ ${CONDITIONS.length} conditions Pyramid mises à jour`);
}

main()
  .then(() => console.log("Seed conditions terminé."))
  .catch((e) => {
    console.error("Seed conditions échoué :", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
