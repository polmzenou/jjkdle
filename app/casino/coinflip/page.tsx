import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getCasinoConfig } from "@/lib/casino/config";
import { prisma } from "@/lib/prisma";
import { CoinflipGame } from "@/components/casino/CoinflipGame";

export const metadata: Metadata = {
  title: "Pile ou face",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * PILE OU FACE.
 *
 * Pas d'écran d'entrée, contrairement au blackjack : il n'y a ni mode à choisir,
 * ni table à rejoindre, ni partie en cours à reprendre — une manche naît et meurt
 * dans un seul appel (cf. lib/casino/coinflip.ts). Envoyer le joueur sur un
 * intermédiaire n'aurait servi qu'à lui faire cliquer une fois de plus.
 *
 * Le solde passé ici n'est qu'un état INITIAL : à partir du premier lancer,
 * c'est celui renvoyé par l'action qui fait foi.
 */
export default async function CoinflipPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const config = await getCasinoConfig();
  if (!config.enabled && user.role !== "ADMIN") redirect("/casino");

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { coins: true },
  });

  return (
    <CoinflipGame initialCoins={profile?.coins ?? 0} minBet={config.minBet} />
  );
}
