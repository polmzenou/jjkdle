import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  USER_DECOR_SELECT,
  type AdminScore,
  type UserScore,
} from "@/lib/leaderboard/store";
import { weekDateKeys } from "@/lib/date";
import { todayKey } from "./daily";

/**
 * Leaderboard JJKdle (Neon Postgres via Prisma).
 *
 * Classement QUOTIDIEN : on enregistre le nombre d'essais d'un joueur pour le
 * perso du jour (table `JjkdleScore`, clé unique userId+date). Le classement se
 * lit en filtrant sur la date du jour et se trie par `attempts` croissant
 * (moins d'essais = meilleur). Reset quotidien automatique via le filtre de date.
 */

export interface JjkdleLeaderboardEntry {
  id: string;
  pseudo: string;
  attempts: number;
  /** Rôle du joueur (pour afficher le tag VIP à côté du pseudo). */
  role: Role;
  /** Image de l'avatar choisi (ou null = initiales). */
  avatarImage: string | null;
  /** Niveau du compte. */
  level: number;
  /** Clé du titre équipé (ou null). */
  titleKey: string | null;
  /** Clé du cadre équipé (ou null). */
  frameKey: string | null;
  /** Jours résolus cette semaine (présent seulement pour la portée weekly). */
  daysSolved?: number;
}

/**
 * Enregistre le score du jour d'un utilisateur (upsert). Ne garde que le
 * meilleur (moins d'essais) si une entrée existe déjà pour ce jour — en
 * pratique le joueur ne résout le perso quotidien qu'une fois.
 */
export async function saveJjkdleScore(
  userId: string,
  date: string,
  attempts: number,
): Promise<void> {
  const existing = await prisma.jjkdleScore.findUnique({
    where: { userId_date: { userId, date } },
    select: { attempts: true },
  });
  if (existing && existing.attempts <= attempts) return;

  await prisma.jjkdleScore.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, attempts },
    update: { attempts },
  });
}

/** Top N du jour (essais croissants, départage par ancienneté). */
export async function topJjkdleEntries(
  limit = 8,
  date: string = todayKey(),
): Promise<JjkdleLeaderboardEntry[]> {
  const rows = await prisma.jjkdleScore.findMany({
    where: { date },
    orderBy: [{ attempts: "asc" }, { updatedAt: "asc" }],
    take: limit,
    include: { user: { select: USER_DECOR_SELECT } },
  });

  return rows.map((r) => ({
    id: r.id,
    pseudo: r.user.username,
    attempts: r.attempts,
    role: r.user.role,
    avatarImage: r.user.avatarCharacter?.image ?? null,
    level: r.user.level,
    titleKey: r.user.equippedTitleKey,
    frameKey: r.user.equippedFrameKey,
  }));
}

/**
 * Top N HEBDOMADAIRE : agrège les jours de la semaine courante (lundi→dimanche,
 * Europe/Paris). Classement par jours résolus décroissant, puis total d'essais
 * croissant (plus régulier + plus efficace = meilleur).
 */
export async function topJjkdleWeeklyEntries(
  limit = 8,
): Promise<JjkdleLeaderboardEntry[]> {
  const dates = weekDateKeys();
  const rows = await prisma.jjkdleScore.findMany({
    where: { date: { in: dates } },
    select: { userId: true, attempts: true },
  });

  // Agrégation par joueur : nb de jours résolus + total d'essais.
  const byUser = new Map<string, { days: number; total: number }>();
  for (const r of rows) {
    const acc = byUser.get(r.userId) ?? { days: 0, total: 0 };
    acc.days += 1;
    acc.total += r.attempts;
    byUser.set(r.userId, acc);
  }

  const ranked = [...byUser.entries()]
    .sort((a, b) => b[1].days - a[1].days || a[1].total - b[1].total)
    .slice(0, limit);
  if (ranked.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: ranked.map(([id]) => id) } },
    select: { id: true, ...USER_DECOR_SELECT },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  return ranked.map(([userId, agg]) => {
    const u = userById.get(userId);
    return {
      id: userId,
      pseudo: u?.username ?? "—",
      attempts: agg.total,
      role: u?.role ?? "PLAYER",
      avatarImage: u?.avatarCharacter?.image ?? null,
      level: u?.level ?? 1,
      titleKey: u?.equippedTitleKey ?? null,
      frameKey: u?.equippedFrameKey ?? null,
      daysSolved: agg.days,
    };
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Récap personnel (vue /account) — score du JOUR de l'utilisateur.
// ──────────────────────────────────────────────────────────────────────────

/**
 * Score JJKdle du jour de l'utilisateur au format `UserScore` (rang parmi les
 * joueurs du jour, classés par essais croissants). Renvoie null s'il n'a pas
 * encore résolu le perso du jour.
 */
export async function getUserJjkdleScore(
  userId: string,
  date: string = todayKey(),
): Promise<UserScore | null> {
  const mine = await prisma.jjkdleScore.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (!mine) return null;

  const [better, totalPlayers] = await Promise.all([
    prisma.jjkdleScore.count({
      where: { date, attempts: { lt: mine.attempts } },
    }),
    prisma.jjkdleScore.count({ where: { date } }),
  ]);

  return {
    gameId: "jjkdle",
    best: mine.attempts,
    rank: better + 1,
    totalPlayers,
    updatedAt: mine.updatedAt.toISOString(),
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Administration (vue /admin)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Tous les scores JJKdle au format `AdminScore` mutualisé. `score` = essais ;
 * triés par date décroissante (jour le plus récent d'abord) puis essais
 * croissants. `date` = jour du perso (parseable pour l'affichage).
 */
export async function listAllJjkdleScores(): Promise<AdminScore[]> {
  const rows = await prisma.jjkdleScore.findMany({
    orderBy: [{ date: "desc" }, { attempts: "asc" }, { updatedAt: "asc" }],
    include: { user: { select: { username: true, role: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    pseudo: r.user.username,
    game: "jjkdle",
    score: r.attempts,
    date: r.date,
    role: r.user.role,
  }));
}

/** Met à jour le nombre d'essais d'une entrée. */
export async function adminUpdateJjkdleScore(
  id: string,
  attempts: number,
): Promise<void> {
  await prisma.jjkdleScore.update({ where: { id }, data: { attempts } });
}

/** Supprime une entrée du leaderboard JJKdle. */
export async function adminDeleteJjkdleScore(id: string): Promise<void> {
  await prisma.jjkdleScore.delete({ where: { id } });
}
