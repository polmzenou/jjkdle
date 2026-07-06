import type { Character } from "@/data/roster/characters";
import { prisma } from "@/lib/prisma";
import { todayKey } from "@/lib/games/jjkdle/daily";
import { recentDateKeys } from "@/lib/date";

/**
 * Agrégations serveur pour l'onglet « Analytics JJKdle », calculées sur la table
 * `JjkdleResult` (parties quotidiennes des utilisateurs CONNECTÉS ; les parties
 * anonymes ne sont pas loggées → à signaler dans l'UI).
 */

/** Barre de l'histogramme de distribution des essais (parties résolues). */
export interface AttemptBucket {
  attempts: number;
  count: number;
}

/** Personnage et son taux de réussite sur la fenêtre analysée. */
export interface CharacterMiss {
  characterId: string;
  characterName: string;
  attempts: number; // nb de parties (résolues ou non) sur ce perso
  solved: number;
  successRate: number; // 0..1
}

export interface JjkdleAnalytics {
  date: string;
  /** Total de parties (lignes) enregistrées pour ce jour. */
  totalToday: number;
  solvedToday: number;
  /** Taux de réussite du jour (0..1) ; null si aucune partie. */
  successRate: number | null;
  /** Taux d'abandon du jour (0..1) ; null si aucune partie. */
  abandonRate: number | null;
  /** Distribution du nombre d'essais parmi les parties résolues du jour. */
  distribution: AttemptBucket[];
  /** Perso le plus « raté » sur les 30 derniers jours (pire taux de réussite). */
  hardestCharacter: CharacterMiss | null;
  /** Première date pour laquelle des données existent (ou null si vide). */
  dataSince: string | null;
}

/** Fenêtre glissante de N jours (bornée à la 1re date connue). */
const WINDOW_DAYS = 30;

export async function getJjkdleAnalytics(
  roster: Character[],
  date: string = todayKey(),
): Promise<JjkdleAnalytics> {
  const nameById = new Map(roster.map((c) => [c.id, c.name]));
  const windowStart = recentDateKeys(WINDOW_DAYS)[0];

  const [todayRows, windowRows, earliest] = await Promise.all([
    prisma.jjkdleResult.findMany({
      where: { date },
      select: { attempts: true, solved: true },
    }),
    prisma.jjkdleResult.findMany({
      where: { date: { gte: windowStart } },
      select: { targetId: true, solved: true },
    }),
    prisma.jjkdleResult.findFirst({
      orderBy: { date: "asc" },
      select: { date: true },
    }),
  ]);

  const totalToday = todayRows.length;
  const solvedToday = todayRows.filter((r) => r.solved).length;

  // Distribution des essais (résolues uniquement).
  const dist = new Map<number, number>();
  for (const r of todayRows) {
    if (r.solved) dist.set(r.attempts, (dist.get(r.attempts) ?? 0) + 1);
  }
  const distribution: AttemptBucket[] = [...dist.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([attempts, count]) => ({ attempts, count }));

  // Perso le plus raté sur la fenêtre (pire taux de réussite ; départage par
  // volume de parties pour éviter les faux positifs à 1 partie).
  const perChar = new Map<string, { total: number; solved: number }>();
  for (const r of windowRows) {
    const acc = perChar.get(r.targetId) ?? { total: 0, solved: 0 };
    acc.total += 1;
    if (r.solved) acc.solved += 1;
    perChar.set(r.targetId, acc);
  }
  let hardestCharacter: CharacterMiss | null = null;
  for (const [characterId, acc] of perChar) {
    const successRate = acc.total === 0 ? 1 : acc.solved / acc.total;
    if (
      hardestCharacter === null ||
      successRate < hardestCharacter.successRate ||
      (successRate === hardestCharacter.successRate &&
        acc.total > hardestCharacter.attempts)
    ) {
      hardestCharacter = {
        characterId,
        characterName: nameById.get(characterId) ?? characterId,
        attempts: acc.total,
        solved: acc.solved,
        successRate,
      };
    }
  }

  return {
    date,
    totalToday,
    solvedToday,
    successRate: totalToday === 0 ? null : solvedToday / totalToday,
    abandonRate: totalToday === 0 ? null : (totalToday - solvedToday) / totalToday,
    distribution,
    hardestCharacter,
    dataSince: earliest?.date ?? null,
  };
}
