/**
 * Backfill multi-univers — ÉTAPE 2e, phase A. Tables de partie EN COURS.
 *
 *   npx tsx scripts/backfill-sessions.ts
 *
 * À lancer APRÈS le `db:push` + `db:generate` de la phase A 2e (colonne NULLABLE
 * `universeId` sur les 4 tables de session). Idempotent.
 *
 * Tague toutes les lignes des 4 tables de session → univers JJK. Ces tables sont
 * ÉPHÉMÈRES (lobbys et parties en cours) : le backfill ne concerne que les
 * parties encore ouvertes au moment de la migration.
 * SQL BRUT à dessein (colonnes bientôt NON-NULL → filtre typé `null` invalide) :
 * le script reste typecheck-safe et re-jouable (no-op une fois la phase B passée).
 */

import { PrismaClient } from "@prisma/client";
import { jjk } from "../lib/universes/jjk";

const prisma = new PrismaClient();

// Noms de tables Postgres (respectent la casse Prisma).
const TABLES = [
  "Lobby",
  "HigherLowerSession",
  "GuessWhoGame",
  "CodenamesGame",
] as const;

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

  let total = 0;
  for (const table of TABLES) {
    // Identifiant de table non paramétrable → interpolation contrôlée (liste fermée).
    const n = await prisma.$executeRawUnsafe(
      `UPDATE "${table}" SET "universeId" = $1 WHERE "universeId" IS NULL`,
      universe.id,
    );
    console.log(`✓ ${table}: ${n} ligne(s) taggée(s) universeId=${jjk.slug}`);
    total += n;
  }
  console.log(`✓ Total : ${total} ligne(s) taggée(s).`);

  // Contrôle : plus aucune ligne à NULL sur les 4 tables (bloquant phase B).
  let remaining = 0;
  for (const table of TABLES) {
    const rows = await prisma.$queryRawUnsafe<{ c: number }[]>(
      `SELECT COUNT(*)::int AS c FROM "${table}" WHERE "universeId" IS NULL`,
    );
    remaining += rows[0]?.c ?? 0;
  }
  if (remaining > 0) {
    throw new Error(`✗ ${remaining} ligne(s) encore à NULL — phase B bloquée`);
  }
  console.log("✓ Contrôle OK : aucune ligne de session à NULL. Phase B possible.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
