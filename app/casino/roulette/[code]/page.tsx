import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { setRouletteRigged } from "@/lib/casino/config";
import { rouletteViewFor } from "@/lib/casino/roulette-engine";
import { seatOf } from "@/lib/casino/state";
import { findTableByCode } from "@/lib/casino/store";
import { isPusherConfigured } from "@/lib/pusher/server";
import { RouletteTable } from "@/components/casino/RouletteTable";

export const metadata: Metadata = {
  title: "Table de roulette",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Le TAPIS partagé. Comme au blackjack, il faut être assis pour le voir : un
 * joueur sans siège repart vers l'écran d'entrée.
 */
export default async function RouletteTablePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const table = await findTableByCode(code, "roulette");
  if (!table || !seatOf(table, user.id)) redirect("/casino/roulette");

  // Un ADMIN qui arrive à la table la trouve toujours en mode normal.
  const isAdmin = user.role === "ADMIN";
  if (isAdmin) await setRouletteRigged(false);

  return (
    <RouletteTable
      initialTable={await rouletteViewFor(table, user.id)}
      pusherReady={isPusherConfigured()}
      rigged={isAdmin ? false : undefined}
    />
  );
}
