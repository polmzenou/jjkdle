/**
 * Migration des clés `AppConfig` vers le namespace PAR UNIVERS — ÉTAPE 4.
 *
 *   npx tsx scripts/migrate-config-universe.ts
 *
 * Les feature flags, le mode maintenance et le mot du jour forcé étaient GLOBAUX
 * (`game.jjkdle.enabled`, `site.maintenance`, `jjkdle.forcedTarget`). Ils sont
 * désormais préfixés par l'univers (`u.jjk.game.jjkdle.enabled`, …) pour que
 * désactiver un jeu sur JJK ne le désactive pas sur les autres animes.
 *
 * Ce script RENOMME les clés existantes vers le namespace JJK. Sans lui, la
 * config JJK actuelle serait silencieusement oubliée (tous les jeux réactivés,
 * maintenance perdue, mot du jour forcé effacé).
 *
 * Idempotent : une clé déjà migrée est ignorée ; relançable sans risque.
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { jjk } from "../lib/universes/jjk";

const prisma = new PrismaClient();

/** Anciennes clés globales → nouvelle clé, dans le namespace de l'univers. */
function namespaced(oldKey: string, slug: string): string | null {
  // Flags de jeu : "game.<id>.enabled"
  if (/^game\..+\.enabled$/.test(oldKey)) return `u.${slug}.${oldKey}`;
  if (oldKey === "site.maintenance") return `u.${slug}.site.maintenance`;
  if (oldKey === "jjkdle.forcedTarget") return `u.${slug}.jjkdle.forcedTarget`;
  return null; // clé non concernée (ou déjà préfixée)
}

async function main() {
  const rows = await prisma.appConfig.findMany();
  if (rows.length === 0) {
    console.log("Aucune ligne AppConfig — rien à migrer.");
    return;
  }

  let migrated = 0;
  let skipped = 0;
  for (const row of rows) {
    // Déjà dans un namespace d'univers → ne pas y toucher.
    if (row.key.startsWith("u.")) {
      skipped += 1;
      continue;
    }
    const newKey = namespaced(row.key, jjk.slug);
    if (!newKey) {
      skipped += 1;
      continue;
    }

    // La cible existe déjà (script relancé après une écriture admin) : on garde
    // la valeur la plus récente, donc celle déjà dans le namespace.
    const existing = await prisma.appConfig.findUnique({
      where: { key: newKey },
      select: { key: true },
    });
    if (existing) {
      await prisma.appConfig.delete({ where: { key: row.key } });
      console.log(`· ${row.key} → ${newKey} déjà présent, ancienne clé supprimée`);
      skipped += 1;
      continue;
    }

    // `value` est un JSON déjà validé en base. La colonne étant requise, un
    // `null` JSON se réécrit via `Prisma.JsonNull`.
    await prisma.appConfig.create({
      data: {
        key: newKey,
        value:
          row.value === null
            ? Prisma.JsonNull
            : (row.value as Prisma.InputJsonValue),
      },
    });
    await prisma.appConfig.delete({ where: { key: row.key } });
    console.log(`✓ ${row.key} → ${newKey}`);
    migrated += 1;
  }

  console.log(
    `✓ ${migrated} clé(s) migrée(s) vers le namespace "${jjk.slug}", ` +
      `${skipped} ignorée(s).`,
  );

  // Contrôle : plus aucune clé globale connue ne traîne.
  const remaining = await prisma.appConfig.findMany({ select: { key: true } });
  const stale = remaining.filter(
    (r) => !r.key.startsWith("u.") && namespaced(r.key, jjk.slug) !== null,
  );
  if (stale.length > 0) {
    throw new Error(
      `✗ Clés globales restantes : ${stale.map((s) => s.key).join(", ")}`,
    );
  }
  console.log("✓ Contrôle OK : toutes les clés connues sont namespacées.");
}

main()
  .then(() => console.log("Migration config terminée."))
  .catch((e) => {
    console.error("Migration config échouée :", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
