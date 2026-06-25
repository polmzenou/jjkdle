/**
 * Seed initial : importe le contenu des fichiers data/ vers la base.
 *
 *   npm run db:seed        (équiv. : npx prisma db seed → tsx prisma/seed.ts)
 *
 * Idempotent (upserts) : peut être relancé sans dupliquer. La base devient la
 * source de vérité au runtime ; ces fichiers ne servent plus qu'au typage et au
 * seed initial.
 */

import { PrismaClient } from "@prisma/client";
import { CATEGORIES } from "../data/roster/categories";
import { ROSTER } from "../data/roster/characters";
import { CONDITIONS } from "../data/ranking/conditions";

const prisma = new PrismaClient();

async function main() {
  // ── Catégories ──
  for (const [position, c] of CATEGORIES.entries()) {
    const data = {
      label: c.label,
      description: c.description,
      weight: c.weight,
      drawCount: c.drawCount,
      position,
    };
    await prisma.category.upsert({
      where: { id: c.id },
      create: { id: c.id, ...data },
      update: data,
    });
  }
  console.log(`✓ ${CATEGORIES.length} catégories`);

  // ── Roster (personnages) ──
  for (const [position, ch] of ROSTER.entries()) {
    const data = {
      name: ch.name,
      title: ch.title,
      tier: ch.tier,
      image: ch.image ?? null,
      ratings: ch.ratings,
      position,
    };
    await prisma.character.upsert({
      where: { id: ch.id },
      create: { id: ch.id, ...data },
      update: data,
    });
  }
  console.log(`✓ ${ROSTER.length} personnages`);

  // ── Conditions "Pyramid" ──
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
  console.log(`✓ ${CONDITIONS.length} conditions Pyramid`);
}

main()
  .then(() => console.log("Seed terminé."))
  .catch((e) => {
    console.error("Seed échoué :", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
