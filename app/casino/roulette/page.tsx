import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getCasinoConfig } from "@/lib/casino/config";
import { findTableForUser } from "@/lib/casino/store";
import { prisma } from "@/lib/prisma";
import { isPusherConfigured } from "@/lib/pusher/server";
import { RouletteEntry } from "@/components/casino/RouletteEntry";

export const metadata: Metadata = {
  title: "Roulette",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Entrée de la roulette : solo ou table à plusieurs (cf. le blackjack). */
export default async function RouletteEntryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const config = await getCasinoConfig();
  if (!config.enabled && user.role !== "ADMIN") redirect("/casino");

  const [profile, table] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { coins: true } }),
    findTableForUser(user.id, "roulette"),
  ]);

  return (
    <RouletteEntry
      coins={profile?.coins ?? 0}
      minBet={config.minBet}
      pusherReady={isPusherConfigured()}
      resumeCode={table?.code ?? null}
    />
  );
}
