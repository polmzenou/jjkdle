/**
 * Seed des OBJETS MAUDITS de l'univers JJK (« The Culling Tower »).
 *
 *   npx tsx scripts/seed-items-jjk.ts
 *
 * Écrit en base les 24 objets de `lib/universes/jjk-items.ts`.
 * Idempotent (upsert sur `@@unique([universeId, slug])`) : re-jouable sans
 * doublon — un re-run resynchronise nom, description, rareté, effets et ordre.
 *
 * ⚠️ NE TOUCHE PAS aux images : elles se téléversent depuis /admin (onglet
 * Objets) et vivent en base dans `imageData`. Un re-run du seed ne les efface
 * donc pas — c'est justement pour ça que `image`/`imageData` sont absents du
 * payload d'upsert.
 *
 * Amorcer un autre univers : copier ce fichier, changer les deux imports. Les
 * EFFETS, eux, sont communs à tous les univers (lib/games/tower/effects.ts).
 */

import { PrismaClient } from "@prisma/client";
import { JJK_ITEMS } from "../lib/universes/jjk-items";
import { jjk } from "../lib/universes/jjk";

const prisma = new PrismaClient();

async function main() {
  const universe = await prisma.universe.findUnique({
    where: { slug: jjk.slug },
    select: { id: true },
  });
  if (!universe) {
    throw new Error(
      `Univers "${jjk.slug}" absent — le créer d'abord via ` +
        `npx tsx scripts/seed-universe.ts ${jjk.slug} (ou /admin/universes).`,
    );
  }

  let created = 0;
  let updated = 0;

  for (const [position, item] of JJK_ITEMS.entries()) {
    const data = {
      name: item.name,
      description: item.description,
      rarity: item.rarity,
      effectKind: item.effectKind,
      effectValue: item.effectValue,
      effectKind2: item.effectKind2 ?? null,
      effectValue2: item.effectValue2 ?? null,
      enabled: true,
      position,
    };

    const existing = await prisma.item.findUnique({
      where: { universeId_slug: { universeId: universe.id, slug: item.slug } },
      select: { id: true },
    });

    if (existing) {
      await prisma.item.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.item.create({
        data: { ...data, slug: item.slug, universeId: universe.id },
      });
      created += 1;
    }
  }

  const byRarity = JJK_ITEMS.reduce<Record<string, number>>((acc, i) => {
    acc[i.rarity] = (acc[i.rarity] ?? 0) + 1;
    return acc;
  }, {});

  console.log(
    `Objets JJK : ${created} créé(s), ${updated} mis à jour ` +
      `(${Object.entries(byRarity)
        .map(([r, n]) => `${n} ${r.toLowerCase()}`)
        .join(", ")}).`,
  );
  console.log("Images à téléverser depuis /admin → onglet Objets.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
