/**
 * Seed CIBLÉ — consignes "JJK Pyramid" UNIQUEMENT.
 *
 *   npx tsx scripts/seed-conditions.ts
 *
 * Contrairement à `prisma/seed.ts` (seed complet), ce script ne touche NI au
 * roster (`Character`), NI aux catégories, NI au roster Draft — il ne réécrit
 * que la table `RankingCondition`. À utiliser quand le contenu live (stats,
 * nouveaux persos) a été édité via /admin et ne doit pas être écrasé.
 *
 * Idempotent : upsert des consignes courantes + purge des obsolètes.
 */

import { PrismaClient } from "@prisma/client";
import { CONDITIONS } from "../data/ranking/conditions";

const prisma = new PrismaClient();

async function main() {
  for (const [position, cond] of CONDITIONS.entries()) {
    const data = {
      pool: cond.pool,
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
  const removed = await prisma.rankingCondition.deleteMany({
    where: { id: { notIn: CONDITIONS.map((c) => c.id) } },
  });
  console.log(
    `✓ ${CONDITIONS.length} consignes Pyramid` +
      (removed.count ? ` (${removed.count} obsolète(s) supprimée(s))` : ""),
  );
}

main()
  .then(() => console.log("Seed consignes terminé."))
  .catch((e) => {
    console.error("Seed consignes échoué :", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
