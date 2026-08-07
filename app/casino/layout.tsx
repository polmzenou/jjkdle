import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { casinoThemeCss } from "@/lib/universes/theme";
import { CasinoBackdrop } from "@/components/casino/CasinoBackdrop";
import { CasinoNav } from "@/components/casino/CasinoNav";

/**
 * Layout du CASINO. Ne monte PAS `UniverseChrome` : celui-ci impose la palette,
 * le logo et la nav d'un anime, alors que le casino n'appartient à aucun.
 *
 * La palette est re-posée ici — et pas seulement dans le `<head>` du layout
 * racine — pour qu'elle suive la navigation client : en arrivant depuis un
 * univers, ce `<style>` est monté (et celui de l'anime démonté), là où le
 * `<head>` racine ne serait jamais re-rendu. Même mécanique que le hub.
 */
export default async function CasinoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const profile = user
    ? await prisma.user.findUnique({
        where: { id: user.id },
        select: { coins: true },
      })
    : null;

  return (
    <>
      <style>{casinoThemeCss()}</style>
      {/* ⚠️ AUCUN fond opaque sur ce conteneur (`bg-void-900` a été retiré) : il
          est `relative`, donc peint APRÈS les calques à z-index négatif, et il
          recouvrait purement et simplement le décor du casino. Le fond opaque
          vit sur <html> (cf. app/globals.css) exactement pour cette raison —
          même écueil que CursedBackground et MangaDecor. */}
      <div className="relative min-h-screen">
        <CasinoBackdrop />
        <CasinoNav
          coins={profile?.coins ?? null}
          username={user?.username ?? null}
        />
        {children}
      </div>
    </>
  );
}
