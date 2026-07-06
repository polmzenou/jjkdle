import type { Character } from "@/data/roster/characters";
import { prisma } from "@/lib/prisma";
import { isComplete } from "@/lib/games/jjkdle/attributes";
import { eligibleRoster, pickDailyTarget, todayKey } from "@/lib/games/jjkdle/daily";
import { resolveDailyTarget } from "@/lib/games/jjkdle/daily-server";
import { getForcedTarget } from "@/lib/config/app-config";
import { recentDateKeys } from "@/lib/date";

/**
 * Agrégations serveur pour l'onglet « Vue d'ensemble » de l'admin.
 * Tout est calculé côté serveur (Server Component) et jamais exposé à un client
 * non-admin. On réutilise les helpers purs existants (isComplete, pickDailyTarget)
 * plutôt que de dupliquer la logique.
 */

const DAY_MS = 86_400_000;

export interface RoleCounts {
  PLAYER: number;
  VIP: number;
  ADMIN: number;
}

export interface SignupPoint {
  /** Clé "YYYY-MM-DD". */
  date: string;
  /** Inscriptions ce jour-là. */
  count: number;
  /** Total cumulé jusqu'à ce jour (inclus) sur la fenêtre. */
  cumulative: number;
}

/** Un jeu et son nombre de parties enregistrées (null = pas de table de score). */
export interface GamePlayCount {
  gameId: string;
  label: string;
  /** Nombre d'enregistrements de score, ou null si le jeu n'en persiste pas. */
  count: number | null;
}

export interface DailyWordEntry {
  date: string;
  characterId: string | null;
  characterName: string | null;
}

export interface OverviewStats {
  players: {
    total: number;
    new7d: number;
    new30d: number;
    /** Série d'inscriptions sur 30 jours (ancien → récent). */
    signups: SignupPoint[];
  };
  gamesPlayed: GamePlayCount[];
  roles: RoleCounts;
  content: {
    total: number;
    incomplete: number;
    missingImage: number;
  };
  dailyWord: {
    /** Cible effective d'aujourd'hui (override admin pris en compte). */
    today: DailyWordEntry;
    /** Historique déterministe des 7 derniers jours (ancien → récent). */
    history: DailyWordEntry[];
    /** Vrai si un override `jjkdle.forcedTarget` est actif aujourd'hui. */
    forcedActive: boolean;
  };
}

/** Répartition des rôles via `groupBy`. */
async function roleCounts(): Promise<RoleCounts> {
  const rows = await prisma.user.groupBy({
    by: ["role"],
    _count: { _all: true },
  });
  const out: RoleCounts = { PLAYER: 0, VIP: 0, ADMIN: 0 };
  for (const r of rows) out[r.role] = r._count._all;
  return out;
}

/** Total, nouveaux (7j/30j) + série d'inscriptions par jour sur 30 jours. */
async function playerStats(): Promise<OverviewStats["players"]> {
  const now = Date.now();
  const since30 = new Date(now - 30 * DAY_MS);
  const since7 = new Date(now - 7 * DAY_MS);

  const [total, recent] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      where: { createdAt: { gte: since30 } },
      select: { createdAt: true },
    }),
  ]);

  // Bucketing par jour (clé Europe/Paris, cohérente avec le reste de l'app).
  const perDay = new Map<string, number>();
  let new7d = 0;
  for (const u of recent) {
    const key = todayKey(u.createdAt);
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
    if (u.createdAt >= since7) new7d += 1;
  }

  const keys = recentDateKeys(30);
  let cumulative = 0;
  const signups: SignupPoint[] = keys.map((date) => {
    const count = perDay.get(date) ?? 0;
    cumulative += count;
    return { date, count, cumulative };
  });

  return { total, new7d, new30d: recent.length, signups };
}

/**
 * Nombre de parties/scores enregistrés par jeu. On s'adapte aux modèles réels :
 * `battle` n'a AUCUNE table de score (état éphémère dans Lobby.gameState) → count
 * null (affiché « pas de données » plutôt qu'un faux 0).
 */
async function gamesPlayed(): Promise<GamePlayCount[]> {
  const [scoreByGame, draft, jjkdle, higherLower, guessWho] = await Promise.all([
    prisma.score.groupBy({ by: ["gameId"], _count: { _all: true } }),
    prisma.jujutsuDraftScore.count(),
    prisma.jjkdleScore.count(),
    prisma.higherLowerScore.count(),
    prisma.guessWhoScore.count(),
  ]);
  const byGame = new Map(scoreByGame.map((r) => [r.gameId, r._count._all]));

  return [
    { gameId: "builder", label: "Builder", count: byGame.get("builder") ?? 0 },
    { gameId: "ranking", label: "JJK Pyramid", count: byGame.get("ranking") ?? 0 },
    { gameId: "jujutsu-draft", label: "Jujutsu Draft", count: draft },
    { gameId: "jjkdle", label: "JJKdle", count: jjkdle },
    { gameId: "higher-lower", label: "Higher/Lower", count: higherLower },
    { gameId: "guesswho", label: "Qui est-ce ?", count: guessWho },
    { gameId: "battle", label: "Random Battle", count: null },
  ];
}

/** Résumé de complétion du roster (persos incomplets / sans image). */
function contentHealth(roster: Character[]): OverviewStats["content"] {
  let incomplete = 0;
  let missingImage = 0;
  for (const c of roster) {
    if (!isComplete(c)) incomplete += 1;
    if (!c.image) missingImage += 1;
  }
  return { total: roster.length, incomplete, missingImage };
}

/** Cible du jour + historique 7 jours (tirage déterministe pour le passé). */
async function dailyWord(roster: Character[]): Promise<OverviewStats["dailyWord"]> {
  const eligible = eligibleRoster(roster);
  const byId = new Map(eligible.map((c) => [c.id, c]));
  const toEntry = (date: string, c: Character | null): DailyWordEntry => ({
    date,
    characterId: c?.id ?? null,
    characterName: c?.name ?? null,
  });

  const [forcedId, todayTarget] = await Promise.all([
    getForcedTarget(),
    resolveDailyTarget(roster),
  ]);

  const keys = recentDateKeys(7);
  const todayK = todayKey();
  const history = keys.map((date) =>
    toEntry(date, pickDailyTarget(date, eligible) ?? null),
  );

  return {
    today: toEntry(todayK, todayTarget),
    history,
    forcedActive: Boolean(forcedId && byId.has(forcedId)),
  };
}

/** Point d'entrée : toutes les stats de la Vue d'ensemble. */
export async function getOverviewStats(roster: Character[]): Promise<OverviewStats> {
  const [players, gp, roles, dw] = await Promise.all([
    playerStats(),
    gamesPlayed(),
    roleCounts(),
    dailyWord(roster),
  ]);
  return {
    players,
    gamesPlayed: gp,
    roles,
    content: contentHealth(roster),
    dailyWord: dw,
  };
}
