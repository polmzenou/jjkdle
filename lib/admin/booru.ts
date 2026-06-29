import { setCachedImage } from "@/lib/admin/image-cache";

/**
 * Connecteur vers une API « booru » (style Rule34/Gelbooru) pour récupérer
 * automatiquement une image par personnage.
 *
 * L'endpoint posts renvoie une liste au format XML ; on en extrait le `file_url`
 * du premier post correspondant aux tags. Les URLs ne sont pas écrites en base :
 * elles vont dans un cache mémoire (cf. lib/admin/image-cache.ts).
 *
 * Configuration via .env (jamais exposée au client) :
 *   BOORU_API_BASE    URL de base de l'endpoint posts (sans &tags=...).
 *   BOORU_API_KEY     clé d'API (rule34.xxx l'exige désormais).
 *   BOORU_USER_ID     identifiant utilisateur associé à la clé.
 *   BOORU_SERIES_TAG  tag de série ajouté à chaque requête (déf. jujutsu_kaisen).
 */

const SERIES_TAG = process.env.BOORU_SERIES_TAG?.trim() || "jujutsu_kaisen";

// Certaines API booru rejettent les requêtes sans User-Agent identifiable.
const USER_AGENT = "jjkdle/1.0 (+roster image sync)";

// Délai entre deux appels API pour respecter la limite par seconde de rule34.
// Surchargeable via BOORU_REQUEST_DELAY_MS (défaut : 300 ms ≈ 3 req/s).
const REQUEST_DELAY_MS = (() => {
  const n = Number(process.env.BOORU_REQUEST_DELAY_MS);
  return Number.isFinite(n) && n >= 0 ? n : 300;
})();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Convertit un nom de perso en tag booru : minuscules, accents retirés, underscores. */
export function nameToTag(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Variantes de tag à essayer pour un nom. rule34 n'a pas d'ordre cohérent
 * (« satoru_gojo » mais « fushiguro_megumi ») : pour un nom à deux mots on tente
 * les deux ordres et on garde celui qui a le plus de résultats.
 */
export function candidateTags(name: string): string[] {
  const tag = nameToTag(name);
  if (!tag) return [];
  const tokens = tag.split("_").filter(Boolean);
  const candidates = [tag];
  if (tokens.length === 2) {
    const reversed = `${tokens[1]}_${tokens[0]}`;
    if (reversed !== tag) candidates.push(reversed);
  }
  return candidates;
}

/** Construit l'URL de requête posts pour une liste de tags (séparés par `+`). */
function buildUrl(base: string, tags: string[]): string {
  const joined = tags.map((t) => encodeURIComponent(t)).join("+");
  const sep = base.includes("?") ? "&" : "?";
  let url = `${base}${sep}limit=1&pid=1&tags=${joined}`;

  // Authentification (rule34.xxx la rend obligatoire) : ajoutée si renseignée.
  const apiKey = process.env.BOORU_API_KEY?.trim();
  const userId = process.env.BOORU_USER_ID?.trim();
  if (apiKey) url += `&api_key=${encodeURIComponent(apiKey)}`;
  if (userId) url += `&user_id=${encodeURIComponent(userId)}`;

  return url;
}

// Espacement minimal entre deux appels réseau, quel que soit le nombre de
// variantes testées par perso (throttle global pour la limite par seconde).
let lastCallAt = 0;
async function throttle(): Promise<void> {
  if (REQUEST_DELAY_MS <= 0) return;
  const wait = REQUEST_DELAY_MS - (Date.now() - lastCallAt);
  if (wait > 0) await sleep(wait);
  lastCallAt = Date.now();
}

const MAX_RETRIES = 3; // tentatives par appel en cas de rate-limit / erreur réseau.

type PostsResult =
  | { ok: true; count: number; fileUrl: string | null }
  | { ok: false }; // échec après retries (rate-limit, réseau, erreur API)

/**
 * Interroge l'API pour un tag : nombre total de posts + file_url du 1er.
 * Réessaie avec backoff sur les échecs transitoires (HTTP non-2xx, réseau,
 * erreur applicative type rate-limit).
 */
async function fetchPosts(base: string, tag: string): Promise<PostsResult> {
  const url = buildUrl(base, [SERIES_TAG, tag]);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    await throttle();
    if (attempt > 0) await sleep(800 * attempt); // backoff progressif

    let body: string;
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: { "User-Agent": USER_AGENT },
      });
      if (!res.ok) continue; // 429, 5xx… : on retente
      body = await res.text();
    } catch {
      continue; // réseau/DNS/timeout : on retente
    }

    // 200 + erreur applicative (rate-limit, auth…) : on retente.
    if (/<error/i.test(body)) continue;

    const count = Number(/count="(\d+)"/.exec(body)?.[1] ?? 0);
    const match = /file_url="([^"]+)"/.exec(body);
    let fileUrl = match ? match[1].trim() : null;
    if (fileUrl?.startsWith("//")) fileUrl = `https:${fileUrl}`;
    return { ok: true, count, fileUrl };
  }

  return { ok: false };
}

export type ImageLookup =
  | { status: "found"; url: string }
  | { status: "empty" } // requêtes OK mais aucune image trouvée
  | { status: "failed" }; // toutes les variantes ont échoué (rate-limit, réseau)

/**
 * Cherche la meilleure image pour un personnage : on essaie chaque variante de
 * tag et on retient celle qui totalise le plus de posts. Distingue « aucun
 * résultat » (empty) d'un « échec d'appel » (failed) pour un diagnostic clair.
 *
 * Lève une erreur uniquement si BOORU_API_BASE n'est pas configuré.
 */
export async function lookupImage(name: string): Promise<ImageLookup> {
  const base = process.env.BOORU_API_BASE?.trim();
  if (!base) {
    throw new Error(
      "BOORU_API_BASE n'est pas défini dans .env — impossible d'interroger l'API.",
    );
  }

  let anyOk = false;
  let best: { count: number; fileUrl: string | null } | null = null;
  for (const tag of candidateTags(name)) {
    const res = await fetchPosts(base, tag);
    if (!res.ok) continue;
    anyOk = true;
    if (!best || res.count > best.count) best = res;
  }

  if (!anyOk) return { status: "failed" };
  if (best?.fileUrl) return { status: "found", url: best.fileUrl };
  return { status: "empty" };
}

export type ImageRefreshResult = {
  ok: boolean;
  error?: string;
  /** Persos du roster builder dont l'image a été mise à jour. */
  builderUpdated: number;
  /** Persos du roster Jujutsu Draft dont l'image a été mise à jour. */
  draftUpdated: number;
  /** Persos dont l'API n'a renvoyé aucune image (tag inexistant). */
  notFound: number;
  /** Persos dont les appels ont échoué (rate-limit, réseau) malgré les retries. */
  failed: number;
  /** Total de persos parcourus (builder + draft). */
  total: number;
};

/**
 * Parcourt les deux rosters et met en cache (mémoire, pas en base) la première
 * image trouvée sur l'API pour chaque perso (tag dérivé du nom). Le roster
 * superpose ensuite ce cache à l'affichage. Renvoie un récapitulatif chiffré.
 */
export async function refreshAllRosterImages(
  roster: { id: string; name: string }[],
  draftRoster: { id: string; name: string }[],
): Promise<Omit<ImageRefreshResult, "ok" | "error">> {
  let builderUpdated = 0;
  let draftUpdated = 0;
  let notFound = 0;
  let failed = 0;

  const all = [
    ...roster.map((c) => ({ ...c, kind: "builder" as const })),
    ...draftRoster.map((c) => ({ ...c, kind: "draft" as const })),
  ];

  // L'espacement entre appels est géré par le throttle global de fetchPosts.
  for (const c of all) {
    const res = await lookupImage(c.name);
    if (res.status === "failed") {
      failed++;
      continue;
    }
    if (res.status === "empty") {
      notFound++;
      continue;
    }
    setCachedImage(c.id, res.url);
    if (c.kind === "builder") builderUpdated++;
    else draftUpdated++;
  }

  return {
    builderUpdated,
    draftUpdated,
    notFound,
    failed,
    total: roster.length + draftRoster.length,
  };
}
