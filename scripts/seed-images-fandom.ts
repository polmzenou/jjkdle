/**
 * Import EN MASSE des images du roster depuis un wiki Fandom.
 *
 *   npx tsx scripts/seed-images-fandom.ts --universe aot --dry-run
 *   npx tsx scripts/seed-images-fandom.ts --universe aot
 *   npx tsx scripts/seed-images-fandom.ts --universe aot --force
 *
 * Le wiki interrogé dépend de l'univers (cf. `WIKIS` plus bas) : chaque anime a
 * le sien, et un univers qui n'y figure pas est refusé plutôt qu'envoyé sur le
 * wiki d'un autre.
 *
 * Télécharge le portrait de chaque personnage et l'écrit EN BASE
 * (`Character.imageData`/`imageMime`), exactement comme le fait un upload manuel
 * via /admin : même contrat, mêmes limites (formats autorisés, 3 Mo), même URL
 * d'affichage `/api/characters/<id>/image?v=<timestamp>`.
 *
 * ── Pourquoi une table de correspondance explicite ──
 *
 * Une recherche par nom sur un wiki ramène silencieusement le mauvais portrait
 * (homonymes, pages de doublage, versions Junior High / live-action). Un mauvais
 * visage dans un jeu de devinette est un bug INVISIBLE jusqu'au jour où le perso
 * sort au tirage. Le fichier de correspondance nomme donc la page ou le fichier
 * cible pour chaque personnage — c'est relisible, corrigeable, et versionné.
 *
 * ── Format du fichier (défaut : data/images/<univers>-fandom.json) ──
 *
 *   {
 *     "_comment": "…",
 *     "annie-leonhart": "Annie Leonhart (Anime)",
 *     "levi-ackerman": { "file": "Levi Ackermann (Anime) character image.png" }
 *   }
 *
 * Clé      = `Character.id` (les clés préfixées `_` sont de la documentation).
 * Valeur   = titre de PAGE wiki (chaîne) ou fichier ÉPINGLÉ (`{ "file": ... }`).
 *            Le fichier épinglé sert quand la page n'a pas d'image d'infobox, ou
 *            quand plusieurs variantes existent et qu'il faut trancher (les
 *            quatre porteurs du Titan Mâchoire, par exemple).
 *
 * ── Résolution d'une page ──
 *
 *   1. `prop=pageimages` (+ `redirects=1`, qui rattrape les variantes
 *      d'orthographe : « Marlo Freudenberg » → « Marlowe Freudenberg ») ;
 *   2. à défaut, recherche des fichiers préfixés `<Titre>_character_image`, en
 *      écartant les déclinaisons hors continuité principale (Junior High,
 *      live-action, Spoof on Titan…).
 *
 * Un personnage non résolu est SIGNALÉ et laissé intact — jamais d'image
 * approximative écrite « pour remplir ».
 *
 * ── Modes ──
 *
 *   (défaut)   les personnages qui ont DÉJÀ une image sont sautés.
 *   --force    ré-télécharge et écrase les images existantes.
 *   --dry-run  résout et télécharge pour vérifier, mais n'écrit rien en base.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Même liste que la route d'upload /api/characters/[id]/image. */
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
]);
const MAX_BYTES = 3 * 1024 * 1024;

const UA = "jjk-arcade/1.0 (+roster image seed)";
const REQUEST_DELAY_MS = 250; // ~4 req/s, courtoisie envers le wiki

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Wiki visé par univers.
 *
 * Volontairement LOCAL au script plutôt qu'un champ de `UniverseConfig` : c'est
 * de l'outillage de seed, joué à la main une fois par univers, jamais lu au
 * runtime. L'y mettre obligerait les quatre univers et `labels.test.ts` à porter
 * une donnée qui ne sert qu'ici.
 *
 * `offCanon` n'écarte que le REPLI par recherche de préfixe (cf.
 * `urlOfPrefixSearch`) : ce sont les déclinaisons qui portent le bon nom mais pas
 * le bon dessin, propres à chaque franchise.
 */
type Wiki = { api: string; offCanon: string[] };

const WIKIS: Record<string, Wiki> = {
  aot: {
    api: "https://attackontitan.fandom.com/api.php",
    offCanon: [
      "junior_high",
      "live-action",
      "spoof",
      "chibi",
      "before_the_fall",
      "attack_on_avengers",
      "lost_girls",
      "(aot_",
    ],
  },
  kny: {
    api: "https://kimetsu-no-yaiba.fandom.com/api.php",
    // `kimetsu_gakuen` est le pendant KNY de `junior_high` : un spin-off scolaire
    // dont les profils portent exactement le nom des personnages.
    offCanon: [
      "kimetsu_gakuen",
      "junior_high",
      "live-action",
      "stage_play",
      "chibi",
    ],
  },
};

type Target = string | { file: string };
type MappingFile = Record<string, Target>;

/** Lecture des options de la ligne de commande (`--clé valeur` / `--drapeau`). */
function parseArgs(argv: string[]) {
  const get = (name: string) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    universe: get("universe"),
    file: get("file"),
    force: argv.includes("--force"),
    dryRun: argv.includes("--dry-run"),
  };
}

async function api<T>(wiki: Wiki, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ format: "json", ...params });
  const res = await fetch(`${wiki.api}?${qs}`, {
    headers: { "User-Agent": UA },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API wiki HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** URL d'un fichier épinglé (`File:<nom>`). */
async function urlOfFile(wiki: Wiki, name: string): Promise<string | null> {
  const json = await api<{
    query?: {
      pages?: Record<
        string,
        { missing?: string; imageinfo?: { url: string }[] }
      >;
    };
  }>(wiki, {
    action: "query",
    titles: `File:${name}`,
    prop: "imageinfo",
    iiprop: "url",
  });

  for (const page of Object.values(json.query?.pages ?? {})) {
    if (page.imageinfo?.[0]?.url) return page.imageinfo[0].url;
  }
  return null;
}

/** Image d'infobox d'une page (suit les redirections). */
async function urlOfPageImage(wiki: Wiki, title: string): Promise<string | null> {
  const json = await api<{
    query?: {
      pages?: Record<
        string,
        { missing?: string; original?: { source: string } }
      >;
    };
  }>(wiki, {
    action: "query",
    titles: title,
    prop: "pageimages",
    piprop: "original",
    redirects: "1",
  });

  for (const page of Object.values(json.query?.pages ?? {})) {
    if (page.original?.source) return page.original.source;
  }
  return null;
}

/** Repli : meilleur fichier `<Titre>_character_image*` du wiki. */
async function urlOfPrefixSearch(
  wiki: Wiki,
  title: string,
): Promise<string | null> {
  const json = await api<{
    query?: { allimages?: { name: string; url: string }[] };
  }>(wiki, {
    action: "query",
    list: "allimages",
    ailimit: "50",
    aiprefix: `${title.replace(/ /g, "_")}_character_image`,
  });

  const hits = (json.query?.allimages ?? []).filter((h) => {
    const lower = h.name.toLowerCase();
    return !wiki.offCanon.some((bad) => lower.includes(bad));
  });
  if (hits.length === 0) return null;

  // À égalité, le nom le plus court est le portrait canonique (les variantes
  // ajoutent toujours un suffixe : « (Titan) », « (c. 829) », « (Anime) »…).
  hits.sort((a, b) => a.name.length - b.name.length);
  return hits[0].url;
}

type Resolved = { url: string; via: string };

async function resolveImageUrl(
  wiki: Wiki,
  target: Target,
): Promise<Resolved | null> {
  if (typeof target !== "string") {
    const url = await urlOfFile(wiki, target.file);
    return url ? { url, via: "fichier épinglé" } : null;
  }

  const page = await urlOfPageImage(wiki, target);
  if (page) return { url: page, via: "page" };

  await sleep(REQUEST_DELAY_MS);
  const prefix = await urlOfPrefixSearch(wiki, target);
  return prefix ? { url: prefix, via: "recherche préfixe" } : null;
}

// `Uint8Array` et non `Buffer` : c'est le type attendu par le champ Bytes de
// Prisma, et `Buffer<ArrayBufferLike>` ne s'y assigne pas.
// `Uint8Array<ArrayBuffer>` et non `Buffer` ni `Uint8Array` tout court : c'est le
// type exact du champ Bytes de Prisma, et le paramètre par défaut
// (`ArrayBufferLike`, qui admet `SharedArrayBuffer`) ne s'y assigne pas.
type Download = { bytes: Uint8Array<ArrayBuffer>; mime: string };

async function download(url: string): Promise<Download | string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    cache: "no-store",
  });
  if (!res.ok) return `téléchargement HTTP ${res.status}`;

  const mime = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!ALLOWED_MIME.has(mime)) return `format non supporté (${mime || "inconnu"})`;

  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) {
    return `image trop lourde (${(bytes.byteLength / 1024 / 1024).toFixed(1)} Mo > 3 Mo)`;
  }
  return { bytes, mime };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.universe) {
    throw new Error("Univers manquant : --universe <slug> (ex. --universe aot).");
  }

  // Résolu AVANT toute requête : sans cette garde, un slug inconnu partirait
  // interroger le wiki d'un autre anime et ramènerait des visages faux.
  const wiki = WIKIS[args.universe];
  if (!wiki) {
    throw new Error(
      `Aucun wiki déclaré pour l'univers "${args.universe}" — ` +
        `l'ajouter à WIKIS dans ce script (connus : ${Object.keys(WIKIS).join(", ")}).`,
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

  const path = resolve(args.file ?? `data/images/${universe.slug}-fandom.json`);
  // Les clés préfixées `_` documentent le fichier (choix d'orthographe, cas
  // laissés de côté) : elles ne désignent aucun personnage.
  const mapping = Object.fromEntries(
    Object.entries(JSON.parse(readFileSync(path, "utf8")) as MappingFile).filter(
      ([key]) => !key.startsWith("_"),
    ),
  );

  const characters = await prisma.character.findMany({
    where: { universeId: universe.id },
    select: { id: true, name: true, image: true, imageMime: true },
    orderBy: { name: "asc" },
  });
  const byId = new Map(characters.map((c) => [c.id, c]));

  const unknown = Object.keys(mapping).filter((id) => !byId.has(id));
  if (unknown.length > 0) {
    throw new Error(
      `Personnage(s) inconnu(s) dans l'univers ${universe.slug} : ${unknown.join(", ")}.`,
    );
  }

  console.log(
    `Wiki : ${wiki.api}\n` +
      `Fichier : ${path} — ${Object.keys(mapping).length} correspondance(s), ` +
      `${characters.length} personnage(s) dans l'univers ${universe.slug}.\n`,
  );

  let written = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const [id, target] of Object.entries(mapping)) {
    const character = byId.get(id)!;

    if (!args.force && (character.image || character.imageMime)) {
      skipped++;
      console.log(`= ${character.name} — image déjà présente (--force pour écraser)`);
      continue;
    }

    await sleep(REQUEST_DELAY_MS);
    let resolved: Resolved | null;
    try {
      resolved = await resolveImageUrl(wiki, target);
    } catch (e) {
      failures.push(`${character.name} : ${(e as Error).message}`);
      console.log(`✗ ${character.name} — ${(e as Error).message}`);
      continue;
    }
    if (!resolved) {
      const label = typeof target === "string" ? target : target.file;
      failures.push(`${character.name} : introuvable sur le wiki ("${label}")`);
      console.log(`✗ ${character.name} — introuvable ("${label}")`);
      continue;
    }

    const result = await download(resolved.url);
    if (typeof result === "string") {
      failures.push(`${character.name} : ${result}`);
      console.log(`✗ ${character.name} — ${result}`);
      continue;
    }

    const size = `${Math.round(result.bytes.byteLength / 1024)} Ko`;
    if (args.dryRun) {
      console.log(`· ${character.name} — ${resolved.via}, ${result.mime}, ${size}`);
      written++;
      continue;
    }

    await prisma.character.update({
      where: { id },
      data: {
        imageData: result.bytes,
        imageMime: result.mime,
        image: `/api/characters/${id}/image?v=${Date.now()}`,
      },
    });
    written++;
    console.log(`✓ ${character.name} — ${resolved.via}, ${result.mime}, ${size}`);
  }

  // Signalé, pas corrigé : un roster partiellement illustré est un cas légitime.
  const missing = characters.filter((c) => !(c.id in mapping));
  if (missing.length > 0) {
    console.log(
      `\nℹ ${missing.length} personnage(s) absent(s) du fichier, laissé(s) tel quel : ` +
        missing.map((c) => c.id).join(", "),
    );
  }

  console.log(
    `\n${args.dryRun ? "--dry-run : " : ""}${written} image(s) ` +
      `${args.dryRun ? "résolue(s)" : "écrite(s)"}, ${skipped} sautée(s), ` +
      `${failures.length} échec(s).`,
  );
  if (failures.length > 0) {
    console.log("\nÉchecs (à corriger dans le fichier de correspondance) :");
    for (const f of failures) console.log(`  · ${f}`);
  }
}

main()
  .then(() => console.log("\nImport des images terminé."))
  .catch((e) => {
    console.error(
      "Import des images échoué :",
      e instanceof Error ? e.message : e,
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
