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
import { DRAFT_ROSTER } from "../lib/games/draft/roster";
import { jjk } from "../lib/universes/jjk";

const prisma = new PrismaClient();

async function main() {
  // ── Univers JJK (multi-univers, étape 1) : le contenu seedé lui est rattaché. ──
  const universe = await prisma.universe.upsert({
    where: { slug: jjk.slug },
    create: { slug: jjk.slug, name: jjk.name },
    update: { name: jjk.name },
  });
  console.log(`✓ Univers "${universe.slug}"`);

  // ── Catégories ──
  for (const [position, c] of CATEGORIES.entries()) {
    const data = {
      label: c.label,
      description: c.description,
      weight: c.weight,
      drawCount: c.drawCount,
      position,
      universeId: universe.id,
      slug: c.id,
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
      battleValue: ch.battleValue ?? null,
      position,
      universeId: universe.id,
      slug: ch.id,
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
      pool: cond.pool,
      category: cond.category,
      prompt: cond.prompt,
      order: cond.order,
      position,
      universeId: universe.id,
      slug: cond.id,
    };
    await prisma.rankingCondition.upsert({
      where: { id: cond.id },
      create: { id: cond.id, ...data },
      update: data,
    });
  }
  // Élague les consignes obsolètes (entièrement dérivées du code : sûr à purger).
  const removed = await prisma.rankingCondition.deleteMany({
    where: { id: { notIn: CONDITIONS.map((c) => c.id) } },
  });
  console.log(
    `✓ ${CONDITIONS.length} conditions Pyramid` +
      (removed.count ? ` (${removed.count} obsolète(s) supprimée(s))` : ""),
  );

  // ── Roster "Jujutsu Draft" ──
  for (const [position, ch] of DRAFT_ROSTER.entries()) {
    const data = {
      name: ch.name,
      image: ch.image ?? null,
      excellenceCategory: ch.excellenceCategory,
      tier: ch.tier,
      cost: ch.cost,
      statValue: ch.statValue,
      position,
      universeId: universe.id,
      slug: ch.id,
    };
    await prisma.draftCharacter.upsert({
      where: { id: ch.id },
      create: { id: ch.id, ...data },
      update: data,
    });
  }
  console.log(`✓ ${DRAFT_ROSTER.length} personnages Jujutsu Draft`);
}

main()
  .then(() => console.log("Seed terminé."))
  .catch((e) => {
    console.error("Seed échoué :", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
