import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { CursedBackground } from "@/components/CursedBackground";
import { SiteNav } from "@/components/SiteNav";
import { TutorialButton } from "@/components/TutorialButton";
import { MaintenanceScreen } from "@/components/MaintenanceScreen";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedImageCount } from "@/lib/admin/image-cache";
import { getMaintenance } from "@/lib/config/app-config";
import { prisma } from "@/lib/prisma";
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

export const metadata: Metadata = {
  title: "JJK Arcade — Mini-jeux Jujutsu Kaisen",
  description:
    "Plateforme de mini-jeux autour de l'univers Jujutsu Kaisen. Jeu principal : Build the Perfect Sorcerer.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [user, maintenance] = await Promise.all([
    getCurrentUser(),
    getMaintenance(),
  ]);
  const isAdmin = user?.role === "ADMIN";
  const maintenanceActive = maintenance.enabled && !isAdmin;
  // Profil (avatar + niveau) pour la barre de nav.
  const profile = user
    ? await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          level: true,
          equippedTitleKey: true,
          equippedFrameKey: true,
          avatarCharacter: { select: { image: true } },
        },
      })
    : null;
  const navUser = user
    ? {
        username: user.username,
        isAdmin: user.role === "ADMIN",
        isVip: user.role === "VIP",
        // ADMIN et VIP peuvent lancer/vider la synchro d'images.
        canSyncImages: user.role === "ADMIN" || user.role === "VIP",
        avatarImage: profile?.avatarCharacter?.image ?? null,
        level: profile?.level ?? 1,
        titleKey: profile?.equippedTitleKey ?? null,
        frameKey: profile?.equippedFrameKey ?? null,
      }
    : null;
  // Compteur du cache d'images (pour afficher « Vider le cache »).
  const cachedImageCount = navUser?.canSyncImages ? getCachedImageCount() : 0;

  return (
    <html lang="fr" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen">
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
      </body>
    </html>
  );
}
