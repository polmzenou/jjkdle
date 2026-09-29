import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getCasinoConfig } from "@/lib/casino/config";
import { prisma } from "@/lib/prisma";
import { SlotMachine } from "@/components/casino/SlotMachine";

export const metadata: Metadata = {
  title: "Machine à sous",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * MACHINE À SOUS. Même modèle que le pile ou face (cf. app/casino/coinflip) :
 * pas d'écran d'entrée, un spin naît et meurt dans un seul appel. Le solde passé
 * ici n'est qu'un état initial.
 */
export default async function SlotsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const config = await getCasinoConfig();
  if (!config.enabled && user.role !== "ADMIN") redirect("/casino");

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { coins: true },
  });

  return <SlotMachine initialCoins={profile?.coins ?? 0} minBet={config.minBet} />;
}
