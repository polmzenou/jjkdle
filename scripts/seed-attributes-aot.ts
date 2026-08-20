/**
 * Seed des ATTRIBUTS de l'univers AOT (DÉFINITIONS uniquement).
 *
 *   npx tsx scripts/seed-attributes-aot.ts
 *
 * Écrit en base les définitions de `lib/universes/aot-attributes.ts` : 7
 * attributs + leurs options. Idempotent (upsert sur les clés uniques) :
 * re-jouable sans effet de bord ni doublon.
 *
 * Copie conforme de `seed-attributes-jjk.ts` (mêmes upserts, mêmes contrôles),
 * seuls les deux imports changent — c'est le patron documenté pour amorcer un
 * univers entier, par opposition à `seed-attributes-csm-status.ts` qui ajoute UN
 * attribut à un univers déjà peuplé.
 *
 * NE TOUCHE PAS aux personnages : `Character` n'est même pas lu. Les VALEURS par
 * personnage se saisissent via /admin, ou s'importent avec
 *   npx tsx scripts/seed-character-attributes.ts --universe aot --file <json>
 */

import { PrismaClient } from "@prisma/client";
import { AOT_ATTRIBUTES } from "../lib/universes/aot-attributes";
import { aot } from "../lib/universes/aot";

const prisma = new PrismaClient();

async function main() {
  const universe = await prisma.universe.findUnique({
    where: { slug: aot.slug },
    select: { id: true },
  });
  if (!universe) {
    throw new Error(
      `Univers "${aot.slug}" absent — le créer d'abord via /admin/universes.`,
    );
  }

  for (const [position, spec] of AOT_ATTRIBUTES.entries()) {
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
        (spec.options.length
          ? ` — ${spec.options.length} option(s)`
          : " — aucune option (à saisir via /admin)"),
    );
  }

  // Contrôle : autant d'attributs en base que de définitions (un excédent
  // signale un attribut créé via l'admin, ce qui est légitime).
  const total = await prisma.attribute.count({
    where: { universeId: universe.id },
  });
  console.log(
    `✓ ${AOT_ATTRIBUTES.length} définition(s) seedée(s) — ${total} attribut(s) ` +
      `en base pour l'univers ${aot.slug}.`,
  );

  // Rappel utile : une colonne sans valeur sort TOUS les personnages du pool
  // quotidien tant qu'elle n'est pas renseignée (cf. isCompleteFor).
  const filled = await prisma.characterAttribute.count({
    where: { attribute: { universeId: universe.id } },
  });
  console.log(
    `ℹ ${filled} valeur(s) d'attribut renseignée(s) pour l'univers ${aot.slug}.`,
  );
}

main()
  .then(() => console.log("Seed attributs AOT terminé."))
  .catch((e) => {
    console.error("Seed attributs AOT échoué :", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
