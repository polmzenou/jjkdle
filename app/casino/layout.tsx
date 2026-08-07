import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { casinoThemeCss } from "@/lib/universes/theme";
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
      <div className="relative min-h-screen bg-void-900">
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

/** Décor : halo de tapis + trame de feutre. `fixed` et `-z-10`, donc inerte. */
function CasinoBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 55% at 50% 0%, rgb(var(--color-domain) / 0.22) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(rgb(255 255 255 / 0.9) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />
    </div>
  );
}
