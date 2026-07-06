import { Prisma, type Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getWeekBounds } from "@/lib/date";
import {
  USER_DECOR_SELECT,
  type AdminScore,
  type LeaderboardScope,
  type UserScore,
} from "@/lib/leaderboard/store";
import type { HLCharacter, HLTurnView } from "./types";

/**
 * Persistance « JJK Higher/Lower » (Neon Postgres via Prisma).
 *
 * Deux responsabilités :
 *  1. État de partie EN COURS (`HigherLowerSession`) : autorité serveur anti-triche.
 *     La vraie `cursedEnergy` du perso de droite vit ici et n'est jamais exposée
 *     au client avant réponse.
 *  2. Scores terminés (`HigherLowerScore`, append) : leaderboard best-par-joueur,
 *     récap profil, administration.
 */

const GAME_ID = "higher-lower";

/** Cookie httpOnly portant le runId de la partie en cours (source = DB). */
export const HL_COOKIE = "hl_run";

const SESSION_SELECT = {
  id: true,
  userId: true,
  score: true,
  leftId: true,
  leftCursedEnergy: true,
  rightId: true,
  rightCursedEnergy: true,
  usedIds: true,
} as const;

// ──────────────────────────────────────────────────────────────────────────
// Piochage (pur, aléatoire) — anti-répétition & anti-égalité
// ──────────────────────────────────────────────────────────────────────────

function randOf<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Choisit le perso de DROITE face à `left` :
 *  - jamais le même perso que la gauche (ni le perso à éviter — droite précédente) ;
 *  - valeur strictement différente si possible (évite l'ambiguïté d'égalité) ;
 *  - privilégie un perso pas encore apparu (`usedIds`) pour varier.
 * Renvoie null si le pool est épuisé (aucun candidat).
 */
function pickRight(
  pool: HLCharacter[],
  left: HLCharacter,
  usedIds: string[],
): HLCharacter | null {
  const others = pool.filter((c) => c.id !== left.id);
  if (others.length === 0) return null;
  const strict = others.filter((c) => c.cursedEnergy !== left.cursedEnergy);
  const base = strict.length > 0 ? strict : others; // évite l'égalité si possible
  const fresh = base.filter((c) => !usedIds.includes(c.id));
  const pickFrom = fresh.length > 0 ? fresh : base;
  return randOf(pickFrom);
}

// ──────────────────────────────────────────────────────────────────────────
// Session de partie (anti-triche)
// ──────────────────────────────────────────────────────────────────────────

type SessionRow = {
  id: string;
  userId: string | null;
  score: number;
  leftId: string;
  leftCursedEnergy: number;
  rightId: string;
  rightCursedEnergy: number;
  usedIds: string[];
};

/**
 * Construit la vue client d'un tour à partir d'une session + du pool courant
 * (nom/image lus dans le pool ; la valeur de droite est MASQUÉE). Renvoie null
 * si l'un des persos a disparu du pool (ex. supprimé en /admin en cours de partie).
 */
export function buildTurnView(
  session: SessionRow,
  pool: HLCharacter[],
): HLTurnView | null {
  const byId = new Map(pool.map((c) => [c.id, c]));
  const left = byId.get(session.leftId);
  const right = byId.get(session.rightId);
  if (!left || !right) return null;
  return {
    score: session.score,
    left: {
      id: left.id,
      name: left.name,
      ...(left.image ? { image: left.image } : {}),
      cursedEnergy: session.leftCursedEnergy,
    },
    right: {
      id: right.id,
      name: right.name,
      ...(right.image ? { image: right.image } : {}),
      // cursedEnergy volontairement OMISE (anti-triche).
    },
  };
}

/** Démarre une partie : pioche la 1re paire, crée la row, renvoie runId + vue. */
export async function createSession(
  userId: string | null,
  pool: HLCharacter[],
): Promise<{ runId: string; view: HLTurnView } | null> {
  if (pool.length < 2) return null;
  const left = randOf(pool);
  const right = pickRight(pool, left, [left.id]);
  if (!right) return null;

  const row = await prisma.higherLowerSession.create({
    data: {
      userId,
      score: 0,
      leftId: left.id,
      leftCursedEnergy: left.cursedEnergy,
      rightId: right.id,
      rightCursedEnergy: right.cursedEnergy,
      usedIds: [left.id, right.id],
    },
  });

  const view = buildTurnView(row, pool);
  if (!view) return null;
  return { runId: row.id, view };
}

/** Charge une session par runId (ou null). */
export async function getSession(runId: string): Promise<SessionRow | null> {
  return prisma.higherLowerSession.findUnique({
    where: { id: runId },
    select: SESSION_SELECT,
  });
}

/**
 * « Consomme » la session : la supprime ET renvoie sa dernière valeur, de façon
 * ATOMIQUE. Sert à la fin de partie pour garantir une SEULE attribution d'XP même
 * en cas de double appel (le 2e `delete` échoue → null → no-op). Renvoie null si
 * la session n'existe déjà plus.
 */
export async function consumeSession(runId: string): Promise<SessionRow | null> {
  try {
    return await prisma.higherLowerSession.delete({
      where: { id: runId },
      select: SESSION_SELECT,
    });
  } catch {
    return null; // déjà consommée / inexistante
  }
}

/**
 * Avance la partie après une BONNE réponse : la carte de droite devient la
 * gauche (révélée) et un nouveau perso apparaît à droite. Incrémente le score.
 * Renvoie la vue du tour suivant, ou null si le pool est épuisé (fin de partie).
 */
export async function advanceSession(
  session: SessionRow,
  pool: HLCharacter[],
): Promise<HLTurnView | null> {
  const byId = new Map(pool.map((c) => [c.id, c]));
  // La nouvelle gauche = l'ancienne droite (avec sa vraie valeur mémorisée).
  const newLeft: HLCharacter = {
    id: session.rightId,
    name: byId.get(session.rightId)?.name ?? "",
    ...(byId.get(session.rightId)?.image
      ? { image: byId.get(session.rightId)!.image! }
      : {}),
    cursedEnergy: session.rightCursedEnergy,
  };
  const next = pickRight(pool, newLeft, session.usedIds);
  if (!next) {
    // Pool épuisé : la bonne réponse compte quand même (on incrémente le score
    // pour que `end` le persiste), puis la partie s'arrête faute de perso à droite.
    await prisma.higherLowerSession.update({
      where: { id: session.id },
      data: { score: { increment: 1 } },
    });
    return null;
  }

  const updated = await prisma.higherLowerSession.update({
    where: { id: session.id },
    data: {
      score: { increment: 1 },
      leftId: newLeft.id,
      leftCursedEnergy: newLeft.cursedEnergy,
      rightId: next.id,
      rightCursedEnergy: next.cursedEnergy,
      usedIds: { set: [...session.usedIds, next.id] },
    },
    select: SESSION_SELECT,
  });

  return buildTurnView(updated, pool);
}

/** Supprime une session (idempotent : no-op si déjà absente). */
export async function deleteSession(runId: string): Promise<void> {
  await prisma.higherLowerSession.deleteMany({ where: { id: runId } });
}

// ──────────────────────────────────────────────────────────────────────────
// Scores terminés (append) — persistance & récap
// ──────────────────────────────────────────────────────────────────────────

/** Enregistre le résultat d'une partie (une ligne par partie). */
export async function saveHigherLowerScore(
  userId: string,
  score: number,
  xpEarned: number,
): Promise<void> {
  await prisma.higherLowerScore.create({
    data: { userId, score, xpEarned },
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Leaderboard (best-par-joueur)
// ──────────────────────────────────────────────────────────────────────────

export interface HigherLowerLeaderboardEntry {
  id: string;
  pseudo: string;
  score: number;
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
}

type BestRow = { id: string; userId: string; score: number; createdAt: Date };

/**
 * Top N par MEILLEUR score de chaque joueur. Comme la table est en append (une
 * ligne par partie), on prend `DISTINCT ON ("userId")` la meilleure partie de
 * chaque joueur (départage : createdAt asc = premier à atteindre ce score), puis
 * on classe ces bests entre eux (score desc, createdAt asc). Deux temps, à la
 * façon de `topJjkdleWeeklyEntries` : agrégation SQL puis hydratation du décor.
 */
export async function topHigherLowerEntries(
  limit = 20,
  scope: LeaderboardScope = "all-time",
): Promise<HigherLowerLeaderboardEntry[]> {
  const bestPerUser = await prisma.$queryRaw<BestRow[]>(
    scope === "weekly"
      ? Prisma.sql`
          SELECT DISTINCT ON ("userId") "id", "userId", "score", "createdAt"
          FROM "HigherLowerScore"
          WHERE "createdAt" >= ${getWeekBounds().start}
          ORDER BY "userId", "score" DESC, "createdAt" ASC`
      : Prisma.sql`
          SELECT DISTINCT ON ("userId") "id", "userId", "score", "createdAt"
          FROM "HigherLowerScore"
          ORDER BY "userId", "score" DESC, "createdAt" ASC`,
  );

  const ranked = bestPerUser
    .sort(
      (a, b) =>
        b.score - a.score || a.createdAt.getTime() - b.createdAt.getTime(),
    )
    .slice(0, limit);
  if (ranked.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: ranked.map((r) => r.userId) } },
    select: { id: true, ...USER_DECOR_SELECT },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  return ranked.map((r) => {
    const u = userById.get(r.userId);
    return {
      id: r.id,
      pseudo: u?.username ?? "—",
      score: r.score,
      role: u?.role ?? "PLAYER",
      avatarImage: u?.avatarCharacter?.image ?? null,
      level: u?.level ?? 1,
      titleKey: u?.equippedTitleKey ?? null,
      frameKey: u?.equippedFrameKey ?? null,
    };
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Récap personnel (vue /account & profil public)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Meilleur score Higher/Lower du joueur au format `UserScore`, avec son rang
 * dans le classement global (best-par-joueur). Renvoie null s'il n'a jamais
 * terminé de partie (⇒ le bloc profil n'est pas affiché).
 */
export async function getUserHigherLowerScore(
  userId: string,
): Promise<UserScore | null> {
  // Bests de tous les joueurs (un max par userId).
  const grouped = await prisma.higherLowerScore.groupBy({
    by: ["userId"],
    _max: { score: true, createdAt: true },
  });

  const mine = grouped.find((g) => g.userId === userId);
  if (!mine || mine._max.score == null) return null;
  const myBest = mine._max.score;

  const totalPlayers = grouped.length;
  const better = grouped.filter((g) => (g._max.score ?? 0) > myBest).length;

  return {
    gameId: GAME_ID,
    best: myBest,
    rank: better + 1,
    totalPlayers,
    updatedAt: (mine._max.createdAt ?? new Date()).toISOString(),
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Administration (vue /admin) — grant/revoke cohérent avec les autres jeux
// ──────────────────────────────────────────────────────────────────────────

/** Tous les scores Higher/Lower au format `AdminScore` (récents d'abord). */
export async function listAllHigherLowerScores(): Promise<AdminScore[]> {
  const rows = await prisma.higherLowerScore.findMany({
    orderBy: [{ score: "desc" }, { createdAt: "asc" }],
    include: { user: { select: { username: true, role: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    pseudo: r.user.username,
    game: GAME_ID,
    score: r.score,
    date: r.createdAt.toISOString(),
    role: r.user.role,
  }));
}

/** Met à jour le score d'une entrée. */
export async function adminUpdateHigherLowerScore(
  id: string,
  score: number,
): Promise<void> {
  await prisma.higherLowerScore.update({ where: { id }, data: { score } });
}

/** Supprime (révoque) une entrée du leaderboard Higher/Lower. */
export async function adminDeleteHigherLowerScore(id: string): Promise<void> {
  await prisma.higherLowerScore.delete({ where: { id } });
}
