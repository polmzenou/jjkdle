import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getCasinoConfig } from "@/lib/casino/config";
import { findTableForUser } from "@/lib/casino/store";
import { prisma } from "@/lib/prisma";
import { isPusherConfigured } from "@/lib/pusher/server";
import { BlackjackEntry } from "@/components/casino/BlackjackEntry";

export const metadata: Metadata = {
  title: "Blackjack",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Entrée du blackjack : choix solo / table publique.
 *
 * `/login` est déjà hors univers (cf. UNIVERSE_FREE_PREFIXES), la redirection ne
 * risque donc pas de repasser par un préfixe d'anime.
 */
export default async function BlackjackEntryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const config = await getCasinoConfig();
  if (!config.enabled && user.role !== "ADMIN") redirect("/casino");

  const [profile, table] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { coins: true } }),
    findTableForUser(user.id),
  ]);

  return (
    <BlackjackEntry
      coins={profile?.coins ?? 0}
      minBet={config.minBet}
      pusherReady={isPusherConfigured()}
      resumeCode={table?.code ?? null}
    />
  );
}
