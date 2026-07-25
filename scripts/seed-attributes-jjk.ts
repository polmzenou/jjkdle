/**
 * Seed des ATTRIBUTS de l'univers JJK — ÉTAPE 3.
 *
 *   npx tsx scripts/seed-attributes-jjk.ts
 *
 * Écrit en base les DÉFINITIONS d'attributs de l'univers JJK
 * (`lib/universes/jjk-attributes.ts`) : 8 attributs + leurs options. Idempotent
 * (upsert sur les clés uniques) : re-jouable sans effet de bord ni doublon.
 *
 * NE TOUCHE PAS aux personnages : `Character` n'est même pas lu. Les VALEURS par
 * personnage se saisissent via /admin (comme avant cette migration : elles n'ont
 * jamais fait partie des données de seed). Le premier backfill depuis les
 * anciennes colonnes enum a eu lieu une fois, avant leur suppression.
 *
 * Amorcer un NOUVEL univers = copier ce script en changeant les deux imports.
 */

import { PrismaClient } from "@prisma/client";
import { JJK_ATTRIBUTES } from "../lib/universes/jjk-attributes";
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

  for (const [position, spec] of JJK_ATTRIBUTES.entries()) {
    const data = {
      label: spec.label,
      kind: spec.kind,
      // L'ordre du tableau pilote l'ordre des colonnes de la grille.
      position,
      comparable: spec.comparable,
      tolerance: spec.tolerance,
    };
    const attribute = await prisma.attribute.upsert({
      where: { universeId_key: { universeId: universe.id, key: spec.key } },
      create: { universeId: universe.id, key: spec.key, ...data },
      update: data,
      select: { id: true },
    });

    for (const option of spec.options) {
      const optionData = { label: option.label, order: option.order };
      await prisma.attributeOption.upsert({
        where: {
          attributeId_value: {
            attributeId: attribute.id,
            value: option.value,
          },
        },
        create: {
          attributeId: attribute.id,
          value: option.value,
          ...optionData,
        },
        update: optionData,
      });
    }

    console.log(
      `✓ ${spec.key} (${spec.kind}, position ${position})` +
        (spec.options.length ? ` — ${spec.options.length} option(s)` : ""),
    );
  }

  // Contrôle : autant d'attributs en base que de définitions (un excédent
  // signale un attribut créé via l'admin, ce qui est légitime).
  const total = await prisma.attribute.count({
    where: { universeId: universe.id },
  });
  console.log(
    `✓ ${JJK_ATTRIBUTES.length} définition(s) seedée(s) — ${total} attribut(s) ` +
      `en base pour l'univers ${jjk.slug}.`,
  );
}

main()
  .then(() => console.log("Seed attributs JJK terminé."))
  .catch((e) => {
    console.error("Seed attributs JJK échoué :", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
