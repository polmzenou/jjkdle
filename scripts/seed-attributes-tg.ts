/**
 * Seed des ATTRIBUTS de l'univers TG (Tokyo Ghoul) — DÉFINITIONS uniquement.
 *
 *   npx tsx scripts/seed-attributes-tg.ts
 *
 * Écrit en base les définitions de `lib/universes/tg-attributes.ts` : 9
 * attributs + leurs options. Idempotent (upsert sur les clés uniques) :
 * re-jouable sans effet de bord ni doublon.
 *
 * Copie conforme de `seed-attributes-kny.ts` (mêmes upserts, mêmes contrôles),
 * seuls les deux imports changent — c'est le patron documenté pour amorcer un
 * univers entier, par opposition à `seed-attributes-csm-status.ts` qui ajoute UN
 * attribut à un univers déjà peuplé.
 *
 * NE TOUCHE PAS aux personnages : `Character` n'est même pas lu. Les VALEURS par
 * personnage se saisissent via /admin, ou s'importent avec
 *   npx tsx scripts/seed-character-attributes.ts --universe tg --file <json>
 */

import { PrismaClient } from "@prisma/client";
import { TG_ATTRIBUTES } from "../lib/universes/tg-attributes";
import { tg } from "../lib/universes/tg";

const prisma = new PrismaClient();

async function main() {
  const universe = await prisma.universe.findUnique({
    where: { slug: tg.slug },
    select: { id: true },
  });
  if (!universe) {
    throw new Error(
      `Univers "${tg.slug}" absent — le créer d'abord via ` +
        `npx tsx scripts/seed-universe.ts ${tg.slug} (ou /admin/universes).`,
    );
  }

  for (const [position, spec] of TG_ATTRIBUTES.entries()) {
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
    `✓ ${TG_ATTRIBUTES.length} définition(s) seedée(s) — ${total} attribut(s) ` +
      `en base pour l'univers ${tg.slug}.`,
  );

  // Rappel utile : une colonne sans valeur sort TOUS les personnages du pool
  // quotidien tant qu'elle n'est pas renseignée (cf. isCompleteFor).
  const filled = await prisma.characterAttribute.count({
    where: { attribute: { universeId: universe.id } },
  });
  console.log(
    `ℹ ${filled} valeur(s) d'attribut renseignée(s) pour l'univers ${tg.slug}.`,
  );
}

main()
  .then(() => console.log("Seed attributs TG terminé."))
  .catch((e) => {
    console.error("Seed attributs TG échoué :", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
