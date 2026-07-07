import type { Metadata } from "next";
import { getGame } from "@/lib/games/registry";

/**
 * Source unique de vérité pour le SEO du site. Alimente les métadonnées
 * (`app/layout.tsx`), le sitemap, le robots, le manifest et les données
 * structurées JSON-LD.
 *
 * `NEXT_PUBLIC_SITE_URL` doit pointer vers l'URL de prod (URL Vercel pour
 * l'instant, domaine custom plus tard). Le fallback n'est qu'un filet de
 * sécurité — définis la variable d'env pour que les URLs OG/canonical soient
 * correctes.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://jjkdle-arcade.vercel.app"
).replace(/\/+$/, "");

export const SITE_NAME = "JJK Arcade";
export const SITE_TITLE = "JJK Arcade — Mini-jeux Jujutsu Kaisen";
export const SITE_DESCRIPTION =
  "L'arcade fan dédiée à Jujutsu Kaisen : une collection de mini-jeux gratuits (JJKdle, Qui est-ce ?, quiz, draft, tier list…) pour tester ta connaissance de l'univers JJK. Sans compte, jouable dans le navigateur.";

/** Locale par défaut. Prête à évoluer quand l'anglais sera branché (i18n). */
export const SITE_LOCALE = "fr_FR";

/**
 * Image d'aperçu social par défaut (partages Discord/Twitter/Reddit). Générée à
 * la volée par `app/og/route.tsx` (branding). Les pages de jeu la remplacent par
 * leur screenshot via `gameMetadata`.
 */
export const DEFAULT_OG_IMAGE = "/og";

/**
 * Mots-clés cibles (français d'abord). Utilisés dans les métadonnées ; l'impact
 * direct sur le ranking est faible mais ils cadrent le champ lexical du site.
 */
export const KEYWORDS = [
  "Jujutsu Kaisen",
  "JJK",
  "jeux Jujutsu Kaisen",
  "jeux JJK",
  "JJKdle",
  "wordle Jujutsu Kaisen",
  "quiz Jujutsu Kaisen",
  "qui est-ce Jujutsu Kaisen",
  "tier list JJK",
  "jeux anime",
  "jeux anime gratuits",
  "Gojo",
  "Sukuna",
  "Itadori",
];

/** Résout un chemin relatif en URL absolue (canonical, sitemap, JSON-LD). */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Métadonnées d'une page de jeu, dérivées du registre (`lib/games/registry.ts`)
 * — source unique : titre, description et screenshot (`previewImage`) servent à
 * la fois au hub, au SEO et à l'aperçu social.
 *
 * Le titre est passé « nu » : le template de `app/layout.tsx` ajoute
 * « · JJK Arcade ». `seoDescription` permet d'affiner la meta description d'une
 * page sans toucher au texte affiché dans le registre.
 */
export function gameMetadata(id: string, seoDescription?: string): Metadata {
  const game = getGame(id);
  if (!game) {
    // Ne casse pas le build si un id est mal orthographié : fallback générique.
    return { title: SITE_NAME, description: SITE_DESCRIPTION };
  }

  const description = seoDescription ?? game.description;
  const images = game.previewImage
    ? [{ url: game.previewImage, alt: `${game.title} — ${SITE_NAME}` }]
    : undefined;

  return {
    title: game.title,
    description,
    alternates: { canonical: game.route },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      url: game.route,
      title: `${game.title} · ${SITE_NAME}`,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: `${game.title} · ${SITE_NAME}`,
      description,
      images: images?.map((i) => i.url),
    },
  };
}
