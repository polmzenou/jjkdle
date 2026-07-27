/**
 * Seed de l'attribut « Statut » de l'univers CSM (DÉFINITION uniquement).
 *
 *   npx tsx scripts/seed-attributes-csm-status.ts
 *
 * Écrit en base la définition de `CSM_STATUS` (`lib/universes/csm-attributes.ts`)
 * et ses 4 options. Idempotent : re-jouable sans doublon ni effet de bord.
 *
 * Différence avec `seed-attributes-jjk.ts`, qui seede TOUT un univers : ici on
 * ajoute UN attribut à un univers déjà peuplé, donc la `position` ne peut pas
 * venir d'un index de tableau — elle se calcule (max existant + 1) pour que la
 * colonne se pose à la FIN de la grille sans bousculer l'ordre des 5 autres.
 * Sur un re-run, la position déjà en base est CONSERVÉE : si tu réordonnes les
 * colonnes depuis /admin, ce script ne le défera pas.
 *
 * NE TOUCHE PAS aux personnages : les VALEURS s'importent avec
 *   npx tsx scripts/seed-character-attributes.ts --universe csm \
 *     --file data/attributes/csm-status.json
 */

import { PrismaClient } from "@prisma/client";
import { CSM_STATUS } from "../lib/universes/csm-attributes";
import { csm } from "../lib/universes/csm";

const prisma = new PrismaClient();

async function main() {
  const universe = await prisma.universe.findUnique({
    where: { slug: csm.slug },
    select: { id: true },
  });
  if (!universe) {
    throw new Error(
      `Univers "${csm.slug}" absent — le créer d'abord via /admin/universes.`,
    );
  }

  const existing = await prisma.attribute.findUnique({
    where: { universeId_key: { universeId: universe.id, key: CSM_STATUS.key } },
    select: { id: true, position: true },
  });

  // Nouvelle colonne → en fin de grille. Colonne déjà là → on garde sa place.
  let position = existing?.position;
  if (position == null) {
    const last = await prisma.attribute.findFirst({
      where: { universeId: universe.id },
      select: { position: true },
      orderBy: { position: "desc" },
    });
    position = last ? last.position + 1 : 0;
  }

  const data = {
    label: CSM_STATUS.label,
    kind: CSM_STATUS.kind,
    position,
    comparable: CSM_STATUS.comparable,
    tolerance: CSM_STATUS.tolerance,
  };
  const attribute = await prisma.attribute.upsert({
    where: { universeId_key: { universeId: universe.id, key: CSM_STATUS.key } },
    create: { universeId: universe.id, key: CSM_STATUS.key, ...data },
    update: data,
    select: { id: true },
  });

  for (const option of CSM_STATUS.options) {
    const optionData = { label: option.label, order: option.order };
    await prisma.attributeOption.upsert({
      where: {
        attributeId_value: { attributeId: attribute.id, value: option.value },
      },
      create: { attributeId: attribute.id, value: option.value, ...optionData },
      update: optionData,
    });
  }

  console.log(
    `✓ ${CSM_STATUS.key} (${CSM_STATUS.kind}, position ${position}) — ` +
      `${CSM_STATUS.options.length} option(s)` +
      (existing ? " [mise à jour]" : " [création]"),
  );

  // Rappel utile : tant que les valeurs ne sont pas importées, cette colonne
  // vide sort TOUS les personnages du pool quotidien (cf. isComplete).
  const total = await prisma.attribute.count({
    where: { universeId: universe.id },
  });
  const filled = await prisma.characterAttribute.count({
    where: { attributeId: attribute.id },
  });
  console.log(
    `ℹ ${total} attribut(s) pour l'univers ${csm.slug} — « ${CSM_STATUS.label} » ` +
      `renseigné pour ${filled} personnage(s).`,
  );
}

main()
  .then(() => console.log("Seed attribut Statut CSM terminé."))
  .catch((e) => {
    console.error("Seed attribut Statut CSM échoué :", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
