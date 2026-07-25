/**
 * Backfill multi-univers — ÉTAPE 2a, phase A. Contenu restant.
 *
 *   npx tsx scripts/backfill-content.ts
 *
 * À lancer APRÈS le `db:push` + `db:generate` de la phase A 2a (les colonnes
 * NULLABLE `universeId` / `slug` doivent exister sur Category, DraftCharacter,
 * RankingCondition). Idempotent.
 *
 * Tague toutes les lignes de ces 3 tables → univers JJK, et pose slug = id.
 * Contrôle final : 0 ligne à NULL (sinon échoue et bloque la phase B).
 */

import { PrismaClient } from "@prisma/client";
import { jjk } from "../lib/universes/jjk";

const prisma = new PrismaClient();

async function main() {
  const universe = await prisma.universe.findUnique({
    where: { slug: jjk.slug },
    select: { id: true },
  });
  if (!universe) {
    throw new Error(
      `Univers "${jjk.slug}" absent — lancer d'abord scripts/backfill-universe.ts.`,
    );
  }

  // 1-2. Tag universeId + slug=id. SQL BRUT à dessein : ces colonnes deviennent
  // NON-NULL en phase B, donc un filtre typé `{ universeId: null }` ne
  // compilerait plus. En raw, le script reste typecheck-safe et re-jouable
  // (no-op idempotent une fois la phase B passée).
  const cat = await prisma.$executeRaw`
    UPDATE "Category" SET "universeId" = ${universe.id} WHERE "universeId" IS NULL`;
  const draft = await prisma.$executeRaw`
    UPDATE "DraftCharacter" SET "universeId" = ${universe.id} WHERE "universeId" IS NULL`;
  const cond = await prisma.$executeRaw`
    UPDATE "RankingCondition" SET "universeId" = ${universe.id} WHERE "universeId" IS NULL`;
  console.log(
    `✓ Taggés universeId=${jjk.slug} : ${cat} catégories, ${draft} draft, ${cond} conditions`,
  );
  await prisma.$executeRaw`UPDATE "Category" SET "slug" = "id" WHERE "slug" IS NULL`;
  await prisma.$executeRaw`UPDATE "DraftCharacter" SET "slug" = "id" WHERE "slug" IS NULL`;
  await prisma.$executeRaw`UPDATE "RankingCondition" SET "slug" = "id" WHERE "slug" IS NULL`;
  console.log("✓ slug = id posé sur les 3 tables");

  // 3. Contrôle : plus aucune ligne à NULL sur les 3 tables (bloquant phase B).
  const [{ remaining }] = await prisma.$queryRaw<{ remaining: number }[]>`
    SELECT (
      (SELECT COUNT(*) FROM "Category" WHERE "universeId" IS NULL OR "slug" IS NULL)
    + (SELECT COUNT(*) FROM "DraftCharacter" WHERE "universeId" IS NULL OR "slug" IS NULL)
    + (SELECT COUNT(*) FROM "RankingCondition" WHERE "universeId" IS NULL OR "slug" IS NULL)
    )::int AS remaining`;
  if (remaining > 0) {
    throw new Error(`✗ ${remaining} ligne(s) encore à NULL — phase B bloquée`);
  }
  console.log("✓ Contrôle OK : aucune ligne à NULL. Phase B possible.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
