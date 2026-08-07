import "server-only";
import { getCasinoConfig, type CasinoConfig } from "@/lib/casino/config";
import { CARD_BACKS } from "@/lib/casino/skins";
import { prisma } from "@/lib/prisma";
import type { CasinoPhaseValue } from "@/lib/casino/types";

/**
 * Données de l'onglet Casino de /admin. Module server-only.
 *
 * Le casino n'a PAS de registre de transactions : la « marge de la maison » est
 * donc dérivée de compteurs agrégés (`CasinoStats`), pas d'une somme de lignes.
 * C'est suffisant pour surveiller l'équilibre du jeu, mais ça ne permet pas
 * d'auditer un mouvement précis — à garder en tête avant de s'en servir pour
 * arbitrer une réclamation de joueur.
 */

export interface LiveTable {
  code: string;
  mode: string;
  phase: CasinoPhaseValue;
  handNumber: number;
  seatCount: number;
  maxSeats: number;
  /** Ouverte au matchmaking (c'est là que tombent les nouveaux joueurs). */
  open: boolean;
  players: { username: string; bet: number }[];
  updatedAt: string;
}

export interface CasinoAdminData {
  config: CasinoConfig;
  stats: {
    handsPlayed: number;
    wagered: number;
    paidOut: number;
    /** Positif = la maison gagne. C'est l'espérance du blackjack. */
    houseNet: number;
  };
  tables: LiveTable[];
  cardBacks: { id: string; label: string; description: string }[];
}

export async function getCasinoAdminData(): Promise<CasinoAdminData> {
  const [config, stats, tables] = await Promise.all([
    getCasinoConfig(),
    prisma.casinoStats.findUnique({ where: { id: "global" } }),
    prisma.casinoTable.findMany({
      orderBy: { lastActivityAt: "desc" },
      take: 25,
      include: {
        seats: {
          orderBy: { seat: "asc" },
          select: { bet: true, user: { select: { username: true } } },
        },
      },
    }),
  ]);

  const wagered = stats?.wagered ?? 0;
  const paidOut = stats?.paidOut ?? 0;

  return {
    config,
    stats: {
      handsPlayed: stats?.handsPlayed ?? 0,
      wagered,
      paidOut,
      houseNet: wagered - paidOut,
    },
    tables: tables.map((table) => ({
      code: table.code,
      mode: table.mode,
      phase: table.phase as CasinoPhaseValue,
      handNumber: table.handNumber,
      seatCount: table.seatCount,
      maxSeats: table.maxSeats,
      open: table.matchKey !== null,
      players: table.seats.map((seat) => ({
        username: seat.user.username,
        bet: seat.bet,
      })),
      updatedAt: table.updatedAt.toISOString(),
    })),
    cardBacks: CARD_BACKS.map(({ id, label, description }) => ({
      id,
      label,
      description,
    })),
  };
}

/** Remet les compteurs de la maison à zéro (nouveau cycle de mesure). */
export async function resetCasinoStats(): Promise<void> {
  await prisma.casinoStats.upsert({
    where: { id: "global" },
    create: { id: "global" },
    update: { handsPlayed: 0, wagered: 0, paidOut: 0 },
  });
}
