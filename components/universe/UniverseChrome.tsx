import { CursedBackground } from "@/components/CursedBackground";
import { SiteNav } from "@/components/SiteNav";
import { TutorialButton } from "@/components/TutorialButton";
import { MaintenanceScreen } from "@/components/MaintenanceScreen";
import { SiteJsonLd } from "@/components/seo/JsonLd";
import { UniverseProvider } from "@/components/universe/UniverseProvider";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedImageCount } from "@/lib/admin/image-cache";
import { getMaintenance } from "@/lib/config/app-config";
import { prisma } from "@/lib/prisma";
import { getCurrentUniverse } from "@/lib/universes/current";
import { themeCss } from "@/lib/universes/theme";

/**
 * CHROME d'un univers : palette, fond, barre de nav, provider de branding.
 *
 * ⚠️ Ce chrome ne doit JAMAIS être monté par le layout RACINE. En App Router,
 * une navigation client ne re-rend que les segments SOUS le layout commun : tout
 * ce qui dépend de l'univers et vit dans `app/layout.tsx` reste figé sur la
 * valeur du premier chargement. C'était le bug « /jjk sans header, en gris » —
 * la palette neutre et l'absence de nav du hub survivaient à la navigation.
 *
 * Il est donc monté par les layouts de SEGMENT, qui se re-rendent dès que le
 * segment change : `app/[universe]/layout.tsx` (l'univers est dans l'URL, donc
 * jjk → csm change le segment), et les espaces hors univers (auth, admin) qui
 * gardent malgré tout la palette de l'univers de repli.
 */
export async function UniverseChrome({
  children,
  /** Injecte le JSON-LD du site. Réservé aux pages publiques d'un univers. */
  jsonLd = false,
}: {
  children: React.ReactNode;
  jsonLd?: boolean;
}) {
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
    <>
      {/* Palette FAISANT AUTORITÉ. Le layout racine en pose déjà une copie dans
          le <head> (pour le premier paint) ; celle-ci vient plus loin dans le
          document, donc elle l'emporte par ordre de cascade — et elle, elle est
          re-rendue à chaque changement de segment. */}
      <style>{themeCss(universe.config)}</style>
      <UniverseProvider
        branding={{
          slug: universe.slug,
          name: universe.config.name,
          logo: universe.config.logo,
          labels: universe.config.labels,
          gameCopy: universe.config.gameCopy,
        }}
      >
        {jsonLd && <SiteJsonLd />}
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
      </UniverseProvider>
    </>
  );
}
