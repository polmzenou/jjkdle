/**
 * Import EN MASSE des notes du builder (`Character.ratings`) depuis un fichier.
 *
 *   npx tsx scripts/seed-ratings.ts --universe csm
 *   npx tsx scripts/seed-ratings.ts --universe csm --dry-run
 *   npx tsx scripts/seed-ratings.ts --universe jjk --file data/ratings/jjk.json --replace
 *
 * Sert à noter un roster entier sans passer 80 fois par le formulaire /admin.
 * L'admin reste la source d'édition courante : ce script n'est qu'un moyen
 * d'écrire vite un lot cohérent, et il est ré-jouable (idempotent).
 *
 * ── Format du fichier (défaut : data/ratings/<univers>.json) ──
 *
 *   {
 *     "denji": { "combat-overall": 82, "devils": 70, "hybrid": 88 },
 *     "makima": { "combat-overall": 90, "hax": 100 }
 *   }
 *
 * Clé de 1er niveau = `Character.slug` (= l'id pour tout le roster actuel).
 * Clé de 2e niveau  = le slug OU l'id de la catégorie ("combat-overall" comme
 * "csm-combat-overall") : les deux sont acceptés et normalisés vers
 * `Category.id`, seule clé valide dans le JSON `ratings`.
 * Valeur = entier 0–100. Une catégorie ABSENTE reste absente : c'est ce qui rend
 * le personnage inéligible au tirage de cette catégorie (0 ≠ absent).
 *
 * ── Modes d'écriture ──
 *
 *   (défaut)    fusion : les catégories du fichier écrasent celles déjà en base,
 *               les autres notes du personnage sont CONSERVÉES.
 *   --replace   remplacement : les notes du fichier deviennent les seules notes
 *               du personnage (ce qui n'y figure pas est SUPPRIMÉ).
 *   --dry-run   n'écrit rien, affiche le diff qui serait appliqué.
 *
 * ── Validation ──
 *
 * Tout est vérifié AVANT la moindre écriture, et la première erreur rencontrée
 * annule l'import entier (personnage inconnu, catégorie inconnue, note hors
 * 0–100 ou non entière). Un import à moitié appliqué sur un roster de 80 persos
 * serait bien plus pénible à rattraper qu'un import refusé.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();

type RatingsFile = Record<string, Record<string, number>>;

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

/** Notes triées par clé — rend les diffs lisibles et l'écriture déterministe. */
function sortRatings(ratings: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(ratings).sort(([a], [b]) => a.localeCompare(b)),
  );
}

/** Résumé des catégories ajoutées / modifiées / retirées pour un personnage. */
function describeDiff(
  before: Record<string, number>,
  after: Record<string, number>,
): string[] {
  const changes: string[] = [];
  for (const [key, value] of Object.entries(after)) {
    const old = before[key];
    if (old === undefined) changes.push(`+${key}=${value}`);
    else if (old !== value) changes.push(`~${key} ${old}→${value}`);
  }
  for (const key of Object.keys(before)) {
    if (!(key in after)) changes.push(`-${key}`);
  }
  return changes;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.universe) {
    throw new Error(
      "Univers manquant : --universe <slug> (ex. --universe csm).",
    );
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

  const path = resolve(args.file ?? `data/ratings/${universe.slug}.json`);
  // Les clés préfixées `_` documentent le fichier (barème retenu, catégories
  // volontairement laissées vides) : elles ne désignent aucun personnage. Même
  // convention que `seed-images-fandom.ts`.
  const file = Object.fromEntries(
    Object.entries(JSON.parse(readFileSync(path, "utf8")) as RatingsFile).filter(
      ([key]) => !key.startsWith("_"),
    ),
  );
  console.log(
    `Fichier : ${path} — ${Object.keys(file).length} personnage(s) à noter.`,
  );

  const categories = await prisma.category.findMany({
    where: { universeId: universe.id },
    select: { id: true, slug: true, label: true },
    orderBy: { position: "asc" },
  });
  if (categories.length === 0) {
    throw new Error(
      `Aucune catégorie pour l'univers "${universe.slug}" — lancer d'abord son script de seed de catégories.`,
    );
  }

  // Slug ET id acceptés en entrée ; on écrit toujours l'id (clé du JSON ratings).
  const categoryId = new Map<string, string>();
  for (const c of categories) {
    categoryId.set(c.slug, c.id);
    categoryId.set(c.id, c.id);
  }

  const characters = await prisma.character.findMany({
    where: { universeId: universe.id },
    select: { id: true, slug: true, name: true, ratings: true },
    orderBy: { position: "asc" },
  });
  const bySlug = new Map(characters.map((c) => [c.slug, c]));

  // ── 1. Validation intégrale (aucune écriture tant qu'il reste une erreur) ──
  const errors: string[] = [];
  const planned: {
    id: string;
    name: string;
    before: Record<string, number>;
    after: Record<string, number>;
  }[] = [];

  for (const [charSlug, rawRatings] of Object.entries(file)) {
    const character = bySlug.get(charSlug);
    if (!character) {
      errors.push(
        `Personnage inconnu dans l'univers ${universe.slug} : "${charSlug}".`,
      );
      continue;
    }

    const next: Record<string, number> = {};
    for (const [rawKey, value] of Object.entries(rawRatings)) {
      const id = categoryId.get(rawKey);
      if (!id) {
        errors.push(`${charSlug} : catégorie inconnue "${rawKey}".`);
        continue;
      }
      if (!Number.isInteger(value) || value < 0 || value > 100) {
        errors.push(
          `${charSlug} / ${rawKey} : note invalide (${value}) — entier 0–100 attendu.`,
        );
        continue;
      }
      next[id] = value;
    }

    const before = (character.ratings ?? {}) as Record<string, number>;
    planned.push({
      id: character.id,
      name: character.name,
      before,
      after: sortRatings(args.replace ? next : { ...before, ...next }),
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
    const changes = describeDiff(p.before, p.after);
    if (changes.length === 0) {
      console.log(`= ${p.name} (inchangé)`);
      continue;
    }
    touched++;
    console.log(`${args.dryRun ? "·" : "✓"} ${p.name} : ${changes.join(", ")}`);
  }

  // Signalé, pas corrigé : un roster partiellement noté est un cas légitime
  // (personnage volontairement hors builder), pas une anomalie à bloquer.
  const missing = characters.filter((c) => !(c.slug in file));
  if (missing.length > 0) {
    console.log(
      `\nℹ ${missing.length} personnage(s) absent(s) du fichier, laissé(s) tel quel : ` +
        missing.map((c) => c.slug).join(", "),
    );
  }

  if (args.dryRun) {
    console.log(
      `\n--dry-run : ${touched} personnage(s) auraient été modifié(s). Aucune écriture.`,
    );
    return;
  }

  // ── 3. Écriture atomique ──
  const writes: Prisma.PrismaPromise<unknown>[] = planned.map((p) =>
    prisma.character.update({
      where: { id: p.id },
      data: { ratings: p.after },
    }),
  );
  await prisma.$transaction(writes);

  console.log(
    `\n✓ ${planned.length} personnage(s) traité(s), ${touched} modifié(s) ` +
      `(mode ${args.replace ? "remplacement" : "fusion"}) — univers ${universe.slug}.`,
  );
}

main()
  .then(() => console.log("Import des notes terminé."))
  .catch((e) => {
    console.error("Import des notes échoué :", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
