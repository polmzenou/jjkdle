import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { viewFor } from "@/lib/casino/engine";
import { seatOf } from "@/lib/casino/state";
import { findTableByCode } from "@/lib/casino/store";
import { isPusherConfigured } from "@/lib/pusher/server";
import { BlackjackTable } from "@/components/casino/BlackjackTable";

export const metadata: Metadata = {
  title: "Table de blackjack",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * La TABLE. Rendue côté serveur avec un premier snapshot, puis pilotée par le
 * composant client (Pusher + ticks).
 *
 * Il faut être ASSIS pour voir la table : pas de spectateurs au casino. Un
 * joueur sans siège est renvoyé vers l'écran d'entrée, où il pourra en demander
 * un — plutôt que de tomber sur un écran vide dont il ne comprendrait pas
 * pourquoi il ne peut pas miser.
 */
export default async function BlackjackTablePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const table = await findTableByCode(code);
  if (!table) redirect("/casino/blackjack");
  if (!seatOf(table, user.id)) redirect("/casino/blackjack");

  return (
    <BlackjackTable
      initialTable={await viewFor(table, user.id)}
      pusherReady={isPusherConfigured()}
    />
  );
}
