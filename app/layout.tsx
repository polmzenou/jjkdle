import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { CursedBackground } from "@/components/CursedBackground";
import { SiteNav } from "@/components/SiteNav";
import { TutorialButton } from "@/components/TutorialButton";
import { MaintenanceScreen } from "@/components/MaintenanceScreen";
import { SiteJsonLd } from "@/components/seo/JsonLd";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedImageCount } from "@/lib/admin/image-cache";
import { getMaintenance } from "@/lib/config/app-config";
import { getCurrentUniverse } from "@/lib/universes/current";
import { themeCss } from "@/lib/universes/theme";
import { UniverseProvider } from "@/components/universe/UniverseProvider";
import { prisma } from "@/lib/prisma";
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
  const seo = await siteSeo();
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
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: seo.locale,
      url: "/",
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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [user, maintenance, universe] = await Promise.all([
    getCurrentUser(),
    getMaintenance(),
    getCurrentUniverse(),
  ]);
  const isAdmin = user?.role === "ADMIN";
  const maintenanceActive = maintenance.enabled && !isAdmin;
  // Profil (avatar + niveau) pour la barre de nav. Niveau = global (User) ;
  // loadout équipé (avatar/titre/cadre) = univers courant (UserUniverseProfile).
  const profile = user
    ? await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          level: true,
          universeProfiles: {
            where: { universeId: universe.id },
            select: {
              equippedTitleKey: true,
              equippedFrameKey: true,
              avatarCharacter: { select: { image: true } },
            },
          },
        },
      })
    : null;
  const navProfile = profile?.universeProfiles[0];
  const navUser = user
    ? {
        username: user.username,
        isAdmin: user.role === "ADMIN",
        isVip: user.role === "VIP",
        // ADMIN et VIP peuvent lancer/vider la synchro d'images.
        canSyncImages: user.role === "ADMIN" || user.role === "VIP",
        avatarImage: navProfile?.avatarCharacter?.image ?? null,
        level: profile?.level ?? 1,
        titleKey: navProfile?.equippedTitleKey ?? null,
        frameKey: navProfile?.equippedFrameKey ?? null,
      }
    : null;
  // Compteur du cache d'images (pour afficher « Vider le cache »).
  const cachedImageCount = navUser?.canSyncImages ? getCachedImageCount() : 0;

  return (
    <html lang="fr" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        {/* Palette de l'univers courant, injectée AVANT le premier paint pour
            éviter tout flash des couleurs par défaut. Les classes Tailwind
            (bg-domain, bg-void-800/60…) consomment ces variables. */}
        <style>{themeCss(universe.config)}</style>
      </head>
      <body className="min-h-screen">
        <UniverseProvider
          branding={{
            slug: universe.slug,
            name: universe.config.name,
            logo: universe.config.logo,
            labels: universe.config.labels,
          }}
        >
          <SiteJsonLd />
          <CursedBackground />
          {maintenanceActive ? (
            <MaintenanceScreen message={maintenance.message} />
          ) : (
            <>
              {/* Bandeau admin : la maintenance est active mais l'admin passe. */}
              {maintenance.enabled && isAdmin && (
                <div className="sticky top-0 z-50 bg-cursed px-4 py-1.5 text-center text-xs font-bold uppercase tracking-wide text-white">
                  Mode maintenance actif — visible par les admins uniquement
                </div>
              )}
              <SiteNav user={navUser} cachedImageCount={cachedImageCount} />
              {children}
              <TutorialButton />
            </>
          )}
          <Analytics />
          <SpeedInsights />
        </UniverseProvider>
      </body>
    </html>
  );
}
