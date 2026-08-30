/**
 * Import EN MASSE des VALEURS d'attributs par personnage (`CharacterAttribute`).
 *
 *   npx tsx scripts/seed-character-attributes.ts --universe csm --dry-run
 *   npx tsx scripts/seed-character-attributes.ts --universe csm
 *
 * Pendant de `seed-ratings.ts` pour les attributs data-driven (étape 3). À ne pas
 * confondre avec `seed-attributes-jjk.ts`, qui seede les DÉFINITIONS d'attributs
 * (colonnes de la grille JJKdle) : ici on remplit les valeurs des personnages,
 * dans des attributs qui doivent déjà exister en base.
 *
 * ── Format du fichier (défaut : data/attributes/<univers>.json) ──
 *
 *   {
 *     "angel-devil": {
 *       "csmspecies": "DEVIL",
 *       "csmgender": "MALE",
 *       "csmpower": "HIGH"
 *     }
 *   }
 *
 * Clé de 1er niveau = `Character.slug`, clé de 2e niveau = `Attribute.key`.
 * Valeur = la `value` d'une `AttributeOption` (pas son libellé) pour un attribut
 * CATEGORICAL/ORDINAL/BOOLEAN, un entier pour un attribut NUMERIC.
 *
 * Un attribut ABSENT du fichier n'est PAS écrit : « non renseigné » est un état
 * porteur de sens (il rend le personnage inéligible comme cible du jour), donc
 * on ne le devine jamais. C'est aussi ce qui permet de livrer un lot incomplet
 * et de finir à la main dans /admin.
 *
 * ── Modes d'écriture ──
 *
 *   (défaut)    fusion : écrit les attributs cités, laisse les autres tels quels.
 *   --replace   remplacement : pour les personnages CITÉS dans le fichier, les
 *               attributs non listés sont SUPPRIMÉS (retour à « non renseigné »).
 *   --dry-run   n'écrit rien, affiche le diff qui serait appliqué.
 *
 * Comme pour les notes, toute erreur (personnage, attribut ou option inconnue)
 * annule l'import entier avant la moindre écriture.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();

type AttributesFile = Record<string, Record<string, string | number>>;

/** Lecture des options de la ligne de commande (`--clé valeur` / `--drapeau`). */
function parseArgs(argv: string[]) {
  const get = (name: string) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    universe: get("universe"),
    file: get("file"),
    replace: argv.includes("--replace"),
    dryRun: argv.includes("--dry-run"),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.universe) {
    throw new Error("Univers manquant : --universe <slug> (ex. --universe csm).");
  }

  const universe = await prisma.universe.findUnique({
    where: { slug: args.universe },
    select: { id: true, slug: true },
  });
  if (!universe) {
    throw new Error(
      `Univers "${args.universe}" absent — le créer d'abord via /admin/universes.`,
    );
  }

  const path = resolve(args.file ?? `data/attributes/${universe.slug}.json`);
  // Les clés préfixées `_` documentent le fichier (source des valeurs, choix de
  // traduction, trous assumés) : elles ne désignent aucun personnage. Même
  // convention que `seed-images-fandom.ts`.
  const file = Object.fromEntries(
    Object.entries(
      JSON.parse(readFileSync(path, "utf8")) as AttributesFile,
    ).filter(([key]) => !key.startsWith("_")),
  );
  console.log(
    `Fichier : ${path} — ${Object.keys(file).length} personnage(s) à renseigner.`,
  );

  const attributes = await prisma.attribute.findMany({
    where: { universeId: universe.id },
    select: {
      id: true,
      key: true,
      kind: true,
      options: { select: { id: true, value: true } },
    },
    orderBy: { position: "asc" },
  });
  if (attributes.length === 0) {
    throw new Error(
      `Aucun attribut pour l'univers "${universe.slug}" — les définir d'abord (/admin ou script de seed).`,
    );
  }
  const byKey = new Map(attributes.map((a) => [a.key, a]));

  const characters = await prisma.character.findMany({
    where: { universeId: universe.id },
    select: {
      id: true,
      slug: true,
      name: true,
      attributeValues: {
        select: {
          attributeId: true,
          optionId: true,
          numericValue: true,
          attribute: { select: { key: true } },
          option: { select: { value: true } },
        },
      },
    },
    orderBy: { position: "asc" },
  });
  const bySlug = new Map(characters.map((c) => [c.slug, c]));

  // ── 1. Validation intégrale (aucune écriture tant qu'il reste une erreur) ──
  const errors: string[] = [];
  const planned: {
    characterId: string;
    name: string;
    /** attributeId → données Prisma à upserter. */
    writes: Map<string, { optionId: string | null; numericValue: number | null }>;
    /** attributeId → attributs à supprimer (mode --replace). */
    clears: string[];
    changes: string[];
  }[] = [];

  for (const [charSlug, raw] of Object.entries(file)) {
    const character = bySlug.get(charSlug);
    if (!character) {
      errors.push(
        `Personnage inconnu dans l'univers ${universe.slug} : "${charSlug}".`,
      );
      continue;
    }

    const current = new Map(
      character.attributeValues.map((v) => [
        v.attribute.key,
        v.option?.value ?? v.numericValue,
      ]),
    );

    const writes = new Map<
      string,
      { optionId: string | null; numericValue: number | null }
    >();
    const changes: string[] = [];

    for (const [key, value] of Object.entries(raw)) {
      const attribute = byKey.get(key);
      if (!attribute) {
        errors.push(`${charSlug} : attribut inconnu "${key}".`);
        continue;
      }

      if (attribute.kind === "NUMERIC") {
        if (!Number.isInteger(value)) {
          errors.push(
            `${charSlug} / ${key} : valeur invalide (${value}) — entier attendu (attribut NUMERIC).`,
          );
          continue;
        }
        writes.set(attribute.id, {
          optionId: null,
          numericValue: Number(value),
        });
      } else {
        const option = attribute.options.find((o) => o.value === String(value));
        if (!option) {
          errors.push(
            `${charSlug} / ${key} : option inconnue "${value}" — attendu : ` +
              attribute.options.map((o) => o.value).join(", "),
          );
          continue;
        }
        writes.set(attribute.id, { optionId: option.id, numericValue: null });
      }

      const before = current.get(key);
      if (before == null) changes.push(`+${key}=${value}`);
      else if (String(before) !== String(value))
        changes.push(`~${key} ${before}→${value}`);
    }

    // --replace : ce que le fichier ne cite pas redevient « non renseigné ».
    const clears = args.replace
      ? character.attributeValues
          .filter((v) => !(v.attribute.key in raw))
          .map((v) => v.attributeId)
          : [];
    for (const v of character.attributeValues) {
      if (clears.includes(v.attributeId)) changes.push(`-${v.attribute.key}`);
    }

    planned.push({
      characterId: character.id,
      name: character.name,
      writes,
      clears,
      changes,
    });
  }

  if (errors.length > 0) {
    console.error(`\n✗ ${errors.length} erreur(s) — rien n'a été écrit :`);
    for (const e of errors) console.error(`  · ${e}`);
    throw new Error("Import annulé.");
  }

  // ── 2. Diff ──
  let touched = 0;
  for (const p of planned) {
    if (p.changes.length === 0) {
      console.log(`= ${p.name} (inchangé)`);
      continue;
    }
    touched++;
    console.log(`${args.dryRun ? "·" : "✓"} ${p.name} : ${p.changes.join(", ")}`);
  }

  // Le contrôle qui compte vraiment ici : un personnage dont il manque un
  // attribut ne peut pas sortir comme cible du jour (cf. isComplete).
  const incomplete = characters.filter((c) => {
    const written = planned.find((p) => p.characterId === c.id)?.writes.size ?? 0;
    const existing = new Set(c.attributeValues.map((v) => v.attributeId));
    const after = args.replace
      ? written
      : new Set([
          ...existing,
          ...(planned.find((p) => p.characterId === c.id)?.writes.keys() ?? []),
        ]).size;
    return after < attributes.length;
  });
  if (incomplete.length > 0) {
    console.log(
      `\nℹ ${incomplete.length} personnage(s) toujours incomplet(s) (donc hors pool quotidien) : ` +
        incomplete.map((c) => c.slug).join(", "),
    );
  }

  if (args.dryRun) {
    console.log(
      `\n--dry-run : ${touched} personnage(s) auraient été modifié(s). Aucune écriture.`,
    );
    return;
  }

  // ── 3. Écriture atomique ──
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  for (const p of planned) {
    for (const [attributeId, data] of p.writes) {
      ops.push(
        prisma.characterAttribute.upsert({
          where: {
            characterId_attributeId: { characterId: p.characterId, attributeId },
          },
          create: { characterId: p.characterId, attributeId, ...data },
          update: data,
        }),
      );
    }
    for (const attributeId of p.clears) {
      ops.push(
        prisma.characterAttribute.deleteMany({
          where: { characterId: p.characterId, attributeId },
        }),
      );
    }
  }
  await prisma.$transaction(ops);

  console.log(
    `\n✓ ${planned.length} personnage(s) traité(s), ${touched} modifié(s) ` +
      `(mode ${args.replace ? "remplacement" : "fusion"}) — univers ${universe.slug}.`,
  );
}

main()
  .then(() => console.log("Import des attributs terminé."))
  .catch((e) => {
    console.error(
      "Import des attributs échoué :",
      e instanceof Error ? e.message : e,
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
