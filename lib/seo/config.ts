import type { Metadata } from "next";
import { headers } from "next/headers";
import { cache } from "react";
import { universeGame } from "@/lib/games/universe";
import {
  getCurrentUniverseConfig,
  listAvailableUniverses,
  universeHref,
} from "@/lib/universes/current";
import type { UniverseConfig } from "@/lib/universes/types";

/**
 * SEO du site, PAR UNIVERS (étape 4). Alimente les métadonnées
 * (`app/layout.tsx`), le sitemap, le robots, le manifest et le JSON-LD.
 *
 * Chaque anime a son nom, sa description et ses mots-clés : tout vient de la
 * config de l'univers courant (`lib/universes/`), résolu par le PRÉFIXE DE CHEMIN
 * (`/jjk/games`) via le middleware. Il n'y a plus de constante globale.
 *
 * Un seul domaine sert tous les animes : l'ORIGINE est dérivée du host réel de la
 * requête (prod, preview Vercel ou localhost) et les CHEMINS canoniques portent le
 * préfixe d'univers (cf. `universeHref`).
 */

export interface SiteSeo {
  /** Origine absolue, sans slash final (ex. "https://jjk-arcade.com"). */
  url: string;
  /** Nom de marque (ex. « JJK Arcade »). */
  name: string;
  /** Titre racine complet. */
  title: string;
  description: string;
  locale: string;
  keywords: string[];
}

/**
 * Image d'aperçu social par défaut (partages Discord/Twitter/Reddit). Générée à
 * la volée par `app/og/route.tsx`. Les pages de jeu la remplacent par leur
 * screenshot via `gameMetadata`.
 */
export const DEFAULT_OG_IMAGE = "/og";

/** Image d'aperçu social par défaut d'un univers (son nom, ses jeux, sa palette). */
export function universeOgImage(slug: string): string {
  return `${DEFAULT_OG_IMAGE}?u=${encodeURIComponent(slug)}`;
}

/**
 * Marque de la PLATEFORME (le hub multi-anime, à la racine). Distincte du nom de
 * chaque univers (« JJK Arcade »…), qui ne vaut que sous son préfixe.
 */
export const PLATFORM_NAME = "Anime Arcade";

/**
 * Faux sur les déploiements Vercel hors production (previews) : leurs URLs
 * `*.vercel.app` dupliqueraient tout le contenu du site si Google les indexait.
 * Vrai en local et hors Vercel (`VERCEL_ENV` absent).
 */
export const isIndexableDeployment =
  !process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production";

/** Jeton de vérification Google Search Console (balise meta), si configuré. */
export const siteVerification: Metadata["verification"] = process.env
  .NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
  ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
  : undefined;

/** Lecture des headers tolérante au rendu statique (hors contexte de requête). */
async function requestHeaders(): Promise<Headers | null> {
  try {
    return await headers();
  } catch {
    return null;
  }
}

/**
 * Origine du site pour la requête courante.
 *
 * Ordre : host réel de la requête → `NEXT_PUBLIC_SITE_URL` → domaine canonique
 * de l'univers. Le dernier repli sert au rendu statique, où aucun host n'existe.
 */
async function resolveSiteUrl(universe: UniverseConfig): Promise<string> {
  const h = await requestHeaders();
  const host = h?.get("x-forwarded-host") ?? h?.get("host");
  if (host) {
    // `https` sauf en local. On NE se fie PAS à `x-forwarded-proto` : servi sans
    // proxy TLS (ex. `next start`), il vaut "http" et produirait un canonical en
    // http pour un vrai domaine. Tout host non local est servi en TLS (Vercel).
    const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host);
    return `${isLocal ? "http" : "https"}://${host}`.replace(/\/+$/, "");
  }
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  return fromEnv || `https://${universe.domains[0]}`;
}

/**
 * Bloc SEO de l'univers courant. Mémoïsé par requête (`cache()`) : appelé par le
 * layout, le JSON-LD et chaque page de jeu dans un même rendu.
 */
export const siteSeo = cache(async (): Promise<SiteSeo> => {
  const universe = await getCurrentUniverseConfig();
  return {
    url: await resolveSiteUrl(universe),
    name: universe.name,
    title: universe.title,
    description: universe.description,
    locale: universe.locale,
    keywords: universe.keywords,
  };
});

/**
 * SEO du HUB (la racine) : marque de la plateforme, et une description qui
 * NOMME chaque anime disponible — c'est la page d'entrée du domaine, elle doit
 * pouvoir ressortir sur « jeux Chainsaw Man » autant que sur « jeux JJK ».
 * Mémoïsé par requête : lu par le layout et le JSON-LD du hub.
 */
export const hubSeo = cache(async () => {
  const [{ url }, universes] = await Promise.all([
    siteSeo(),
    listAvailableUniverses(),
  ]);
  const works = universes.map((u) => u.config.sourceWork);
  const title = `${PLATFORM_NAME} — Mini-jeux anime gratuits`;
  const description = `Mini-jeux anime gratuits dans le navigateur : ${works.join(", ")}. Devine le personnage du jour (dle), Qui est-ce ?, quiz, draft, tier list et combats. Sans compte.`;
  const keywords = [
    "jeux anime",
    "jeux anime gratuits",
    "anime wordle",
    "anime dle",
    "quiz anime",
    "tier list anime",
    ...works.flatMap((w) => [`jeux ${w}`, `${w} quiz`, `${w} dle`]),
  ];
  return { url, name: PLATFORM_NAME, title, description, keywords };
});

/** Résout un chemin relatif en URL absolue (canonical, sitemap, JSON-LD). */
export async function absoluteUrl(path = "/"): Promise<string> {
  const { url } = await siteSeo();
  return `${url}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Garantit que la meta description NOMME l'anime. Plusieurs descriptions de jeu
 * sont génériques (« Classe 8 personnages… ») et identiques d'un univers à
 * l'autre : sans le nom de l'œuvre, six pages partageraient le même snippet et
 * aucune ne dirait de quel anime elle parle.
 */
function withSourceWork(
  description: string,
  title: string,
  sourceWork: string,
): string {
  if (description.toLowerCase().includes(sourceWork.toLowerCase())) {
    return description;
  }
  // « JJK Codenames : jeu… » → « JJK Codenames (Jujutsu Kaisen) : jeu… »,
  // plutôt que de répéter le titre devant une description qui l'a déjà.
  if (description.startsWith(title)) {
    return `${title} (${sourceWork})${description.slice(title.length)}`;
  }
  return `${title} (${sourceWork}) : ${description}`;
}

/**
 * Métadonnées d'une page de jeu, dérivées du registre (`lib/games/registry.ts`)
 * — source unique : titre, description et screenshot (`previewImage`) servent à
 * la fois au hub, au SEO et à l'aperçu social.
 *
 * Le titre est passé « nu » : le template de `app/layout.tsx` ajoute le nom de
 * l'univers. `seoDescription` permet d'affiner la meta description d'une page
 * sans toucher au texte affiché dans le registre.
 */
export async function gameMetadata(
  id: string,
  seoDescription?: string,
): Promise<Metadata> {
  const [seo, universe, game] = await Promise.all([
    siteSeo(),
    getCurrentUniverseConfig(),
    universeGame(id),
  ]);
  if (!game) {
    // Ne casse pas le build si un id est mal orthographié : fallback générique.
    return { title: seo.name, description: seo.description };
  }

  // L'univers est un préfixe de chemin : canonical et og:url doivent le porter,
  // sinon toutes les URLs canoniques des animes se confondraient.
  const route = await universeHref(game.route);
  const description = withSourceWork(
    seoDescription ?? game.seoDescription ?? game.description,
    game.title,
    universe.sourceWork,
  );
  // Sans capture dédiée, l'image par défaut de l'univers : un `openGraph` de
  // page REMPLACE celui du layout, l'omettre laissait la page sans aperçu.
  const images = [
    {
      url: game.previewImage ?? universeOgImage(universe.slug),
      alt: `${game.title} — ${seo.name}`,
    },
  ];

  return {
    title: game.title,
    description,
    alternates: { canonical: route },
    openGraph: {
      type: "website",
      siteName: seo.name,
      locale: seo.locale,
      url: route,
      title: `${game.title} · ${seo.name}`,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: `${game.title} · ${seo.name}`,
      description,
      images: images.map((i) => i.url),
    },
  };
}
