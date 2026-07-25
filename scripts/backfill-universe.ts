/**
 * Backfill multi-univers — ÉTAPE 1, phase A.
 *
 *   npx tsx scripts/backfill-universe.ts
 *
 * À lancer APRÈS `npm run db:push` + `npm run db:generate` de la phase A (le
 * modèle `Universe` et les colonnes NULLABLE `Character.universeId` / `slug`
 * doivent exister). Idempotent : re-lançable sans effet de bord.
 *
 * Effet :
 *   1. upsert l'univers JJK (slug/name depuis lib/universes/jjk.ts) ;
 *   2. tague tous les Character sans univers → universeId = <JJK> ;
 *   3. renseigne slug = id pour les Character sans slug (JJK : id est déjà une
 *      clé lisible unique, ex. "gojo").
 *
 * Une fois ce script OK (0 ligne restante à NULL), on passe à la phase B :
 * colonnes NON-NULL + @@unique([universeId, slug]).
 */

import { PrismaClient } from "@prisma/client";
import { jjk } from "../lib/universes/jjk";

const prisma = new PrismaClient();

async function main() {
  // 1. Univers JJK (idempotent).
  const universe = await prisma.universe.upsert({
    where: { slug: jjk.slug },
    create: { slug: jjk.slug, name: jjk.name },
    update: { name: jjk.name },
  });
  console.log(`✓ Univers "${universe.slug}" (${universe.id})`);

  // 2-3. Tag universeId + slug=id sur les Character non taggés. SQL BRUT à
  // dessein : ces colonnes deviennent NON-NULL en phase B, donc un filtre typé
  // `{ universeId: null }` ne compilerait plus. En raw, le script reste
  // typecheck-safe et re-jouable (no-op idempotent une fois la phase B passée).
  const tagged = await prisma.$executeRaw`
    UPDATE "Character" SET "universeId" = ${universe.id} WHERE "universeId" IS NULL`;
  console.log(`✓ ${tagged} personnages taggés universeId=${universe.slug}`);
  const slugged = await prisma.$executeRaw`
    UPDATE "Character" SET "slug" = "id" WHERE "slug" IS NULL`;
  console.log(`✓ ${slugged} personnages slug = id`);

  // 4. Contrôle : plus aucune ligne à NULL (bloquant avant phase B).
  const [{ remaining }] = await prisma.$queryRaw<{ remaining: number }[]>`
    SELECT COUNT(*)::int AS remaining FROM "Character"
    WHERE "universeId" IS NULL OR "slug" IS NULL`;
  if (remaining > 0) {
    throw new Error(
      `✗ ${remaining} Character encore à NULL (universeId ou slug) — phase B bloquée`,
    );
  }
  console.log("✓ Contrôle OK : aucun Character à NULL. Phase B possible.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
