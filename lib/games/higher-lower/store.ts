import { Prisma, type Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUniverse } from "@/lib/universes/current";
import { getWeekBounds } from "@/lib/date";
import {
  userDecor,
  userDecorSelect,
  type AdminScore,
  type LeaderboardScope,
  type UserScore,
} from "@/lib/leaderboard/store";
import { compareHL, type HLCharacter, type HLTurnView } from "./types";

/**
 * Persistance « Higher/Lower » (Neon Postgres via Prisma).
 *
 * Deux responsabilités :
 *  1. État de partie EN COURS (`HigherLowerSession`) : autorité serveur anti-triche.
 *     La vraie valeur du perso de droite vit ici et n'est jamais exposée
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
  leftValue: true,
  leftTiebreak: true,
  rightId: true,
  rightValue: true,
  rightTiebreak: true,
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
 *  - jamais le même perso que la gauche ;
 *  - jamais une paire INDÉPARTAGEABLE : même valeur comparée ET même départage
 *    (`battleValue`) → la question n'aurait pas de bonne réponse, on écarte
 *    purement et simplement ces candidats. Avec un attribut ORDINAL (CSM), deux
 *    « Puissant » restent en revanche une paire valide : c'est `battleValue` qui
 *    tranche ;
 *  - privilégie un perso pas encore apparu (`usedIds`) pour varier.
 *
 * Renvoie null quand il ne reste AUCUN candidat départageable : traité comme un
 * pool épuisé (fin de partie) plutôt que de poser une question impossible.
 */
function pickRight(
  pool: HLCharacter[],
  left: HLCharacter,
  usedIds: string[],
): HLCharacter | null {
  const comparable = pool.filter(
    (c) => c.id !== left.id && compareHL(c, left) !== 0,
  );
  if (comparable.length === 0) return null;
  const fresh = comparable.filter((c) => !usedIds.includes(c.id));
  return randOf(fresh.length > 0 ? fresh : comparable);
}

// ──────────────────────────────────────────────────────────────────────────
// Session de partie (anti-triche)
// ──────────────────────────────────────────────────────────────────────────

type SessionRow = {
  id: string;
  userId: string | null;
  score: number;
  leftId: string;
  leftValue: number;
  leftTiebreak: number;
  rightId: string;
  rightValue: number;
  rightTiebreak: number;
  usedIds: string[];
};

/**
 * Libellé d'affichage d'une valeur comparée (« 87 », « Puissant »), déduit du
 * pool : valeur ↔ libellé est une bijection (nombre affiché tel quel en NUMERIC,
 * rang ↔ option en ORDINAL). Repli sur le nombre brut si la valeur a disparu du
 * pool (attribut réédité en /admin pendant la partie).
 */
function labelFor(pool: HLCharacter[], value: number): string {
  return pool.find((c) => c.value === value)?.valueLabel ?? String(value);
}

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
      value: session.leftValue,
      // Départage de la carte GAUCHE : déjà révélée, donc rien à cacher — c'est
      // ce qui permet d'expliquer un ex æquo au moment de la révélation.
      tiebreak: session.leftTiebreak,
      valueLabel: labelFor(pool, session.leftValue),
    },
    right: {
      id: right.id,
      name: right.name,
      ...(right.image ? { image: right.image } : {}),
      // value / tiebreak volontairement OMIS (anti-triche).
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

  const { id: universeId } = await getCurrentUniverse();
  const row = await prisma.higherLowerSession.create({
    data: {
      userId,
      score: 0,
      leftId: left.id,
      leftValue: left.value,
      leftTiebreak: left.tiebreak,
      rightId: right.id,
      rightValue: right.value,
      rightTiebreak: right.tiebreak,
      usedIds: [left.id, right.id],
      universeId,
    },
  });

  const view = buildTurnView(row, pool);
  if (!view) return null;
  return { runId: row.id, view };
}

/**
 * Charge une session par runId, DANS L'UNIVERS COURANT (ou null).
 *
 * Le `runId` est un cuid détenu par le client : le filtre `universeId` garantit
 * qu'une partie démarrée sur un univers ne peut pas être poursuivie depuis un
 * autre (le pool y serait différent). Sinon, comportement de session expirée.
 */
export async function getSession(runId: string): Promise<SessionRow | null> {
  const { id: universeId } = await getCurrentUniverse();
  return prisma.higherLowerSession.findFirst({
    where: { id: runId, universeId },
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
  const previousRight = byId.get(session.rightId);
  const newLeft: HLCharacter = {
    id: session.rightId,
    name: previousRight?.name ?? "",
    ...(previousRight?.image ? { image: previousRight.image } : {}),
    value: session.rightValue,
    tiebreak: session.rightTiebreak,
    valueLabel: labelFor(pool, session.rightValue),
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
      leftValue: newLeft.value,
      leftTiebreak: newLeft.tiebreak,
      rightId: next.id,
      rightValue: next.value,
      rightTiebreak: next.tiebreak,
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
  const { id: universeId } = await getCurrentUniverse();
  await prisma.higherLowerScore.create({
    data: { userId, score, xpEarned, universeId },
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
  const { id: universeId } = await getCurrentUniverse();
  const bestPerUser = await prisma.$queryRaw<BestRow[]>(
    scope === "weekly"
      ? Prisma.sql`
          SELECT DISTINCT ON ("userId") "id", "userId", "score", "createdAt"
          FROM "HigherLowerScore"
          WHERE "universeId" = ${universeId} AND "createdAt" >= ${getWeekBounds().start}
          ORDER BY "userId", "score" DESC, "createdAt" ASC`
      : Prisma.sql`
          SELECT DISTINCT ON ("userId") "id", "userId", "score", "createdAt"
          FROM "HigherLowerScore"
          WHERE "universeId" = ${universeId}
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
    select: { id: true, ...userDecorSelect(universeId) },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  return ranked.map((r) => {
    const u = userById.get(r.userId);
    const d = u ? userDecor(u) : null;
    return {
      id: r.id,
      pseudo: d?.pseudo ?? "—",
      score: r.score,
      role: d?.role ?? "PLAYER",
      avatarImage: d?.avatarImage ?? null,
      level: d?.level ?? 1,
      titleKey: d?.titleKey ?? null,
      frameKey: d?.frameKey ?? null,
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
  // Bests de tous les joueurs de l'univers (un max par userId).
  const { id: universeId } = await getCurrentUniverse();
  const grouped = await prisma.higherLowerScore.groupBy({
    by: ["userId"],
    where: { universeId },
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

/**
 * Scores Higher/Lower au format `AdminScore`, en ne gardant que la MEILLEURE
 * partie de chaque joueur (cohérent avec le leaderboard joueur `topHigherLowerEntries`).
 * La table étant en append (une ligne par partie), on trie `score desc, createdAt asc`
 * puis on dédoublonne par `userId` : la première ligne rencontrée pour un joueur est
 * son best. L'`id` renvoyé reste celui de la ligne réelle → édition/suppression admin OK.
 */
export async function listAllHigherLowerScores(): Promise<AdminScore[]> {
  const { id: universeId } = await getCurrentUniverse();
  const rows = await prisma.higherLowerScore.findMany({
    where: { universeId },
    orderBy: [{ score: "desc" }, { createdAt: "asc" }],
    include: { user: { select: { username: true, role: true } } },
  });

  const seen = new Set<string>();
  const best = rows.filter((r) => {
    if (seen.has(r.userId)) return false;
    seen.add(r.userId);
    return true;
  });

  return best.map((r) => ({
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
