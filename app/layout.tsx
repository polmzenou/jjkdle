import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import {
  getCurrentUniverseConfig,
  isHubRequest,
  universeHref,
} from "@/lib/universes/current";
import { themeCss, hubThemeCss } from "@/lib/universes/theme";
import { siteSeo, DEFAULT_OG_IMAGE } from "@/lib/seo/config";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
  display: "swap",
});

/**
 * Métadonnées de l'UNIVERS COURANT (résolu par hostname). Dynamique et non plus
 * constante : le même déploiement sert plusieurs animes, chacun avec son nom,
 * son titre, sa description et ses mots-clés.
 */
export async function generateMetadata(): Promise<Metadata> {
  const [seo, hub] = await Promise.all([siteSeo(), isHubRequest()]);
  // Sur le HUB, aucun suffixe de marque : « Les univers · JJK Arcade » n'aurait
  // aucun sens sur une page qui sert justement à choisir entre les animes.
  if (hub) {
    return {
      metadataBase: new URL(seo.url),
      title: { default: "Les univers", template: "%s" },
      description:
        "Choisis ton univers : chaque anime a son arcade, son roster et ses classements.",
      alternates: { canonical: "/" },
      robots: { index: true, follow: true },
    };
  }
  return {
    metadataBase: new URL(seo.url),
    title: {
      default: seo.title,
      // Les sous-pages passent un titre « nu » → suffixé automatiquement.
      template: `%s · ${seo.name}`,
    },
    description: seo.description,
    keywords: seo.keywords,
    applicationName: seo.name,
    authors: [{ name: seo.name }],
    creator: seo.name,
    category: "games",
    alternates: { canonical: await universeHref("/") },
    openGraph: {
      type: "website",
      locale: seo.locale,
      url: await universeHref("/"),
      siteName: seo.name,
      title: seo.title,
      description: seo.description,
      images: [
        { url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: seo.title },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [DEFAULT_OG_IMAGE],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
      : undefined,
  };
}

/**
 * Layout RACINE : uniquement ce qui est vrai pour TOUTE la plateforme (document,
 * polices, mesures). Il ne monte AUCUN chrome d'univers.
 *
 * Raison : en App Router, une navigation client ne re-rend que les segments SOUS
 * le layout commun. Un layout racine qui porterait la palette et la nav resterait
 * figé sur l'univers du premier chargement — c'était le bug « /jjk affiché avec
 * la palette grise du hub et sans header ». Le chrome vit donc dans les layouts
 * de segment : `app/[universe]/layout.tsx`, `app/universes/layout.tsx`, etc.
 *
 * Seule exception : le `<style>` ci-dessous, qui n'existe que pour le PREMIER
 * PAINT (le fond du <body> est peint avant que le corps du document ne soit
 * analysé). Il est toujours juste au chargement d'un document, éventuellement
 * périmé après une navigation client — auquel cas la palette posée par le layout
 * de segment, plus bas dans le document, l'emporte par ordre de cascade.
 */
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [hub, config] = await Promise.all([
    isHubRequest(),
    getCurrentUniverseConfig(),
  ]);

  return (
    <html lang="fr" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        {/* Les classes Tailwind (bg-domain, bg-void-800/60…) consomment ces
            variables. Sur le hub : palette NEUTRE, aucune marque. */}
        <style>{hub ? hubThemeCss() : themeCss(config)}</style>
      </head>
      <body className="min-h-screen">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
