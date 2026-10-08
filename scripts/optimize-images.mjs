/**
 * Génère des versions WebP légères des images statiques affichées sur le site.
 *
 * Les PNG d'origine (logos 1536×1024 de 2-3 Mo, captures de jeux ~1 Mo) restent
 * en place : ils servent aux aperçus de partage (Open Graph), où le WebP est mal
 * supporté. Le site, lui, affiche les `.webp` générés ici, à côté de l'original.
 *
 *   node scripts/optimize-images.mjs
 *
 * Idempotent : relancer le script régénère simplement les fichiers.
 */
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";

const PUBLIC = resolve(import.meta.dirname, "../public");

/** Logos d'univers : jusqu'à 240 px de haut sur la landing → ~530 px réels (retina). */
const LOGO_WIDTH = 800;
/** Captures de jeux : fond de carte / vitrine, jamais en plein écran. */
const SCREEN_WIDTH = 1200;
/** Portraits de personnages trop lourds, ré-encodés sur place. */
const OVERSIZED_PORTRAITS = ["assets/characters/Yuji_Portrait_Modulo.webp"];
const PORTRAIT_MAX = 800;

const kb = (n) => `${Math.round(n / 1024)} Ko`;

async function toWebp(src, width, quality) {
  const out = src.replace(/\.png$/i, ".webp");
  const before = (await stat(src)).size;
  await sharp(src)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality, alphaQuality: 90, effort: 6 })
    .toFile(out);
  const after = (await stat(out)).size;
  console.log(`${src.slice(PUBLIC.length + 1)} ${kb(before)} → ${kb(after)}`);
}

async function main() {
  for (const name of await readdir(PUBLIC)) {
    if (/^logo.*\.png$/i.test(name)) await toWebp(join(PUBLIC, name), LOGO_WIDTH, 85);
  }

  const assets = join(PUBLIC, "assets");
  for (const name of await readdir(assets)) {
    if (/\.png$/i.test(name)) await toWebp(join(assets, name), SCREEN_WIDTH, 75);
  }

  for (const rel of OVERSIZED_PORTRAITS) {
    const file = join(PUBLIC, rel);
    const input = await readFile(file);
    const { width = 0, height = 0 } = await sharp(input).metadata();
    // Déjà à la bonne taille : on ne ré-encode pas (perte à chaque passage).
    if (Math.max(width, height) <= PORTRAIT_MAX) continue;
    const before = input.length;
    const buf = await sharp(input)
      .resize({ width: PORTRAIT_MAX, height: PORTRAIT_MAX, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80, effort: 6 })
      .toBuffer();
    if (buf.length < before) {
      await writeFile(file, buf);
      console.log(`${rel} ${kb(before)} → ${kb(buf.length)}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
