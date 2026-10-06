import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getCasinoConfig } from "@/lib/casino/config";
import { prisma } from "@/lib/prisma";
import { RouletteGame } from "@/components/casino/RouletteGame";

export const metadata: Metadata = {
  title: "Roulette solo",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * ROULETTE EUROPÉENNE. Même modèle que le pile ou face (cf. app/casino/coinflip) :
 * un tour naît et meurt dans un seul appel. Le solde passé ici n'est qu'un état
 * initial.
 */
export default async function RouletteSoloPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const config = await getCasinoConfig();
  if (!config.enabled && user.role !== "ADMIN") redirect("/casino");

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { coins: true },
  });

  return <RouletteGame initialCoins={profile?.coins ?? 0} minBet={config.minBet} />;
}
