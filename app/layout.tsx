import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AnalyticsGate } from "@/components/AnalyticsGate";
import { CookieConsent } from "@/components/CookieConsent";
import { MotionProvider } from "@/components/MotionProvider";
import {
  getCurrentUniverseConfig,
  isCasinoRequest,
  isHubRequest,
  universeHref,
} from "@/lib/universes/current";
import { themeCss, hubThemeCss, casinoThemeCss } from "@/lib/universes/theme";
import {
  siteSeo,
  hubSeo,
  DEFAULT_OG_IMAGE,
  universeOgImage,
  isIndexableDeployment,
  siteVerification,
} from "@/lib/seo/config";
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
  const [seo, hub, casino] = await Promise.all([
    siteSeo(),
    isHubRequest(),
    isCasinoRequest(),
  ]);
  // Previews Vercel : jamais indexées (contenu dupliqué de la prod).
  const robots: Metadata["robots"] = isIndexableDeployment
    ? {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true, "max-image-preview": "large" },
      }
    : { index: false, follow: false };
  // Le casino est hors univers : pas plus que le hub il ne doit porter le nom
  // d'un anime en suffixe.
  if (casino) {
    return {
      metadataBase: new URL(seo.url),
      title: { default: "Casino", template: "%s · Casino" },
      description:
        "Le casino de la plateforme : mise tes coins au blackjack, en solo ou à une table jusqu'à 5 joueurs.",
      alternates: { canonical: "/casino" },
      // Page de jeu d'argent virtuel, sans contenu à classer : hors index.
      robots: { index: false, follow: true },
      verification: siteVerification,
    };
  }
  // Sur le HUB, la marque est celle de la PLATEFORME, jamais celle d'un anime :
  // c'est la racine du domaine, la page que Google vérifie et classe en premier.
  if (hub) {
    const h = await hubSeo();
    return {
      metadataBase: new URL(seo.url),
      title: { default: h.title, template: `%s · ${h.name}` },
      description: h.description,
      keywords: h.keywords,
      applicationName: h.name,
      category: "games",
      alternates: { canonical: "/" },
      openGraph: {
        type: "website",
        locale: "fr_FR",
        url: "/",
        siteName: h.name,
        title: h.title,
        description: h.description,
        images: [
          { url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: h.title },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: h.title,
        description: h.description,
        images: [DEFAULT_OG_IMAGE],
      },
      robots,
      verification: siteVerification,
    };
  }
  const ogImage = universeOgImage((await getCurrentUniverseConfig()).slug);
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
      images: [{ url: ogImage, width: 1200, height: 630, alt: seo.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [ogImage],
    },
    robots,
    verification: siteVerification,
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
  const [hub, casino, config] = await Promise.all([
    isHubRequest(),
    isCasinoRequest(),
    getCurrentUniverseConfig(),
  ]);

  return (
    <html lang="fr" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        {/* Les classes Tailwind (bg-domain, bg-void-800/60…) consomment ces
            variables. Sur le hub : palette NEUTRE, aucune marque. Au casino :
            feutre + or, sa propre identité. */}
        <style>
          {casino ? casinoThemeCss() : hub ? hubThemeCss() : themeCss(config)}
        </style>
      </head>
      <body className="min-h-screen">
        <MotionProvider>
          {children}
          <CookieConsent />
        </MotionProvider>
        <AnalyticsGate />
        <SpeedInsights />
      </body>
    </html>
  );
}
