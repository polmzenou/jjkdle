/**
 * Seed des OBJETS de « The Culling Tower », pour n'importe quel univers.
 *
 *   npx tsx scripts/seed-items.ts --universe aot --dry-run
 *   npx tsx scripts/seed-items.ts --universe aot
 *   npx tsx scripts/seed-items.ts --universe aot --force-images
 *   npx tsx scripts/seed-items.ts --universe aot --no-images
 *
 * Écrit en base les 24 objets de `lib/universes/<univers>-items.ts`. Idempotent
 * (upsert sur `@@unique([universeId, slug])`) : un re-run resynchronise nom,
 * description, rareté, effets et ordre, sans doublon.
 *
 * ── Images ──
 *
 * Un objet dont la donnée porte `wikiImage` voit son visuel téléchargé depuis le
 * wiki Fandom de l'univers et écrit EN BASE (`imageData`/`imageMime`), exactement
 * comme un upload depuis /admin → onglet Objets : mêmes formats, même plafond de
 * 3 Mo, même URL `/api/items/<id>/image?v=<timestamp>`.
 *
 *   (défaut)        seuls les objets SANS image sont illustrés — un visuel
 *                   téléversé à la main depuis l'admin n'est jamais écrasé ;
 *   --force-images  ré-télécharge et écrase les images existantes ;
 *   --no-images     ne touche qu'aux données, aucune requête au wiki.
 *
 * Une image introuvable est SIGNALÉE et l'objet reste sans visuel (il s'affiche
 * avec ses initiales) — jamais d'image approximative écrite « pour remplir ».
 *
 * --dry-run résout et télécharge les images pour vérification, mais n'écrit
 * RIEN en base (ni objets, ni images).
 *
 * Ajouter un univers : créer `lib/universes/<slug>-items.ts` (calque de
 * `jjk-items.ts`), l'ajouter à `CATALOGS`, et son wiki à `WIKIS`.
 */

import { PrismaClient } from "@prisma/client";
import type { ItemSeed, WikiImage } from "../lib/universes/item-seed";
import { JJK_ITEMS } from "../lib/universes/jjk-items";
import { CSM_ITEMS } from "../lib/universes/csm-items";
import { AOT_ITEMS } from "../lib/universes/aot-items";
import { KNY_ITEMS } from "../lib/universes/kny-items";
import { TG_ITEMS } from "../lib/universes/tg-items";
import { BLEACH_ITEMS } from "../lib/universes/bleach-items";

const prisma = new PrismaClient();

const CATALOGS: Record<string, ItemSeed[]> = {
  jjk: JJK_ITEMS,
  csm: CSM_ITEMS,
  aot: AOT_ITEMS,
  kny: KNY_ITEMS,
  tg: TG_ITEMS,
  bleach: BLEACH_ITEMS,
};

/**
 * Wiki interrogé pour les images, par univers. Local au script pour la même
 * raison que dans `seed-images-fandom.ts` : outillage de seed, jamais lu au
 * runtime. Bleach pointe ici le wiki ANGLAIS (cf. `bleach-items.ts`).
 */
const WIKIS: Record<string, string> = {
  csm: "https://chainsaw-man.fandom.com/api.php",
  aot: "https://attackontitan.fandom.com/api.php",
  kny: "https://kimetsu-no-yaiba.fandom.com/api.php",
  tg: "https://tokyoghoul.fandom.com/api.php",
  bleach: "https://bleach.fandom.com/api.php",
};

/** Même liste que la route d'upload /api/items/[id]/image. */
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
]);
const MAX_BYTES = 3 * 1024 * 1024;

/**
 * Fichiers génériques que certains wikis servent comme image d'infobox quand la
 * page n'en a pas (`NoPicAvailable.png` sur le wiki Chainsaw Man). Les écrire
 * reviendrait à afficher un « pas d'image » en guise d'objet.
 */
const PLACEHOLDER = /nopic|no_?image|placeholder|image_?needed/i;

/**
 * Largeur de la VIGNETTE demandée au wiki, qui la redimensionne côté serveur.
 * Les originaux sont souvent des captures 4K ou des GIF animés de 5 à 10 Mo, bien
 * au-delà du plafond de 3 Mo — alors qu'un objet ne s'affiche qu'en icône.
 */
const THUMB_WIDTH = "480";

const UA = "jjk-arcade/1.0 (+tower item seed)";
const REQUEST_DELAY_MS = 250; // ~4 req/s, courtoisie envers le wiki

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseArgs(argv: string[]) {
  const i = argv.indexOf("--universe");
  return {
    universe: i >= 0 ? argv[i + 1] : undefined,
    dryRun: argv.includes("--dry-run"),
    forceImages: argv.includes("--force-images"),
    noImages: argv.includes("--no-images"),
  };
}

type PagesResponse = {
  query?: {
    pages?: Record<
      string,
      {
        thumbnail?: { source: string };
        imageinfo?: { url: string; thumburl?: string }[];
      }
    >;
  };
};

async function resolveImageUrl(
  api: string,
  target: WikiImage,
): Promise<string | null> {
  const params: Record<string, string> =
    typeof target === "string"
      ? // Image d'infobox de la page (suit les redirections).
        {
          titles: target,
          prop: "pageimages",
          piprop: "thumbnail",
          pithumbsize: THUMB_WIDTH,
          redirects: "1",
        }
      : {
          titles: `File:${target.file}`,
          prop: "imageinfo",
          iiprop: "url",
          iiurlwidth: THUMB_WIDTH,
        };

  const qs = new URLSearchParams({ format: "json", action: "query", ...params });
  const res = await fetch(`${api}?${qs}`, {
    headers: { "User-Agent": UA },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API wiki HTTP ${res.status}`);
  const json = (await res.json()) as PagesResponse;

  for (const page of Object.values(json.query?.pages ?? {})) {
    const info = page.imageinfo?.[0];
    const url = page.thumbnail?.source ?? info?.thumburl ?? info?.url;
    if (url) return url;
  }
  return null;
}

/** Nom du fichier d'une URL Fandom (`…/Nom.png/revision/latest?cb=…`). */
function fileNameOf(url: string): string {
  const path = new URL(url).pathname.split("/revision/")[0];
  return decodeURIComponent(path.split("/").pop() ?? url);
}

// `Uint8Array<ArrayBuffer>` : le type exact du champ Bytes de Prisma (cf. la
// même remarque dans seed-images-fandom.ts).
type Download = { bytes: Uint8Array<ArrayBuffer>; mime: string };

async function download(url: string): Promise<Download | string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    cache: "no-store",
  });
  if (!res.ok) {
    // Le CDN d'images de Fandom sert parfois un défi Cloudflare (« Just a
    // moment… ») à la place du fichier. On ne cherche pas à le contourner.
    const blocked = res.status === 403 && res.headers.get("cf-mitigated");
    return blocked
      ? "CDN du wiki protégé par un défi anti-bot (HTTP 403) — réessayer plus tard ou téléverser depuis /admin"
      : `téléchargement HTTP ${res.status}`;
  }

  const mime = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!ALLOWED_MIME.has(mime)) return `format non supporté (${mime || "inconnu"})`;

  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) {
    return `image trop lourde (${(bytes.byteLength / 1024 / 1024).toFixed(1)} Mo > 3 Mo)`;
  }
  return { bytes, mime };
}

/** Résout + télécharge l'image d'un objet. Une chaîne = motif de l'échec. */
async function fetchItemImage(
  api: string,
  target: WikiImage,
): Promise<(Download & { file: string }) | string> {
  const label = typeof target === "string" ? target : target.file;
  let url: string | null;
  try {
    url = await resolveImageUrl(api, target);
  } catch (e) {
    return (e as Error).message;
  }
  if (!url) return `introuvable sur le wiki ("${label}")`;

  const file = fileNameOf(url);
  if (PLACEHOLDER.test(file)) return `image générique du wiki (${file}) pour "${label}"`;

  const result = await download(url);
  return typeof result === "string" ? result : { ...result, file };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const known = Object.keys(CATALOGS).join(", ");
  if (!args.universe) {
    throw new Error(`Univers manquant : --universe <slug> (connus : ${known}).`);
  }
  const catalog = CATALOGS[args.universe];
  if (!catalog) {
    throw new Error(`Aucun catalogue d'objets pour "${args.universe}" (connus : ${known}).`);
  }
  const api = WIKIS[args.universe];
  const withImages = !args.noImages && api !== undefined;

  const universe = await prisma.universe.findUnique({
    where: { slug: args.universe },
    select: { id: true },
  });
  if (!universe) {
    throw new Error(
      `Univers "${args.universe}" absent — le créer d'abord via ` +
        `npx tsx scripts/seed-universe.ts ${args.universe} (ou /admin/universes).`,
    );
  }

  let created = 0;
  let updated = 0;
  let imaged = 0;
  let kept = 0;
  const failures: string[] = [];

  for (const [position, item] of catalog.entries()) {
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
      select: { id: true, imageMime: true },
    });

    // `image`/`imageData` restent HORS de ce payload : un re-run du seed ne doit
    // jamais effacer un visuel téléversé depuis l'admin.
    let id = existing?.id;
    if (args.dryRun) {
      if (existing) updated += 1;
      else created += 1;
    } else if (existing) {
      await prisma.item.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      ({ id } = await prisma.item.create({
        data: { ...data, slug: item.slug, universeId: universe.id },
        select: { id: true },
      }));
      created += 1;
    }

    if (!withImages || !item.wikiImage) continue;
    if (existing?.imageMime && !args.forceImages) {
      kept += 1;
      console.log(`= ${item.name} — image déjà présente (--force-images pour écraser)`);
      continue;
    }

    await sleep(REQUEST_DELAY_MS);
    const image = await fetchItemImage(api, item.wikiImage);
    if (typeof image === "string") {
      failures.push(`${item.name} : ${image}`);
      console.log(`✗ ${item.name} — ${image}`);
      continue;
    }

    const size = `${Math.round(image.bytes.byteLength / 1024)} Ko`;
    if (!args.dryRun && id) {
      await prisma.item.update({
        where: { id },
        data: {
          imageData: image.bytes,
          imageMime: image.mime,
          image: `/api/items/${id}/image?v=${Date.now()}`,
        },
      });
    }
    imaged += 1;
    console.log(`✓ ${item.name} — ${image.file}, ${image.mime}, ${size}`);
  }

  const byRarity = catalog.reduce<Record<string, number>>((acc, i) => {
    acc[i.rarity] = (acc[i.rarity] ?? 0) + 1;
    return acc;
  }, {});

  const prefix = args.dryRun ? "--dry-run (rien n'est écrit) : " : "";
  console.log(
    `\n${prefix}objets ${args.universe} : ` +
      `${created} ${args.dryRun ? "à créer" : "créé(s)"}, ` +
      `${updated} ${args.dryRun ? "à mettre à jour" : "mis à jour"} (` +
      Object.entries(byRarity)
        .map(([r, n]) => `${n} ${r.toLowerCase()}`)
        .join(", ") +
      ").",
  );
  if (withImages) {
    console.log(
      `Images : ${imaged} ${args.dryRun ? "résolue(s)" : "écrite(s)"}, ` +
        `${kept} conservée(s), ${failures.length} échec(s).`,
    );
  } else {
    console.log("Images : non traitées — à téléverser depuis /admin → onglet Objets.");
  }
  if (failures.length > 0) {
    console.log("\nÉchecs (corriger `wikiImage` dans le fichier d'objets) :");
    for (const f of failures) console.log(`  · ${f}`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
