import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Agrégat des stats d'un utilisateur, construit en UNE passe groupée à partir
 * des tables de scores existantes (`Score`, `JujutsuDraftScore`, `JjkdleScore`)
 * et des champs de streak cachés sur `User`.
 *
 * Socle commun aux badges (lib/badges) et au calcul d'XP (lib/progress/xp) :
 * une seule lecture DB alimente les deux à chaque fin de partie.
 */
export interface UserStatsContext {
  role: Role;
  /** Meilleur score builder (Score, gameId="builder"), 0 si jamais joué. */
  builderBest: number;
  /** Meilleur score ranking/Pyramid (Score, gameId="ranking"), 0 si jamais joué. */
  rankingBest: number;
  /** Ennemis vaincus en Jujutsu Draft (0 si jamais joué). */
  draftKills: number;
  /** Draft remporté (les 6 boss vaincus). */
  draftVictory: boolean;
  /** Streak JJKdle courant (jours consécutifs). */
  jjkdleStreak: number;
  /** Meilleur streak JJKdle atteint. */
  jjkdleBestStreak: number;
  /**
   * Plus petit nombre d'essais JJKdle jamais réalisé (tous jours confondus).
   * 0 = jamais résolu. `=== 1` ⇒ perso du jour trouvé du premier coup (titres
   * IDLE_MASTER / cadre IDLE_LEGEND).
   */
  jjkdleBestAttempts: number;
  /** Nombre de jeux distincts où l'utilisateur a au moins un score. */
  gamesPlayed: number;
  /** A déjà enregistré une partie sur Build the Perfect Sorcerer. */
  playedBuilder: boolean;
  /** A déjà enregistré une partie sur JJK Pyramid. */
  playedRanking: boolean;
  /** A déjà enregistré une partie sur Jujutsu Draft. */
  playedDraft: boolean;
  /** A déjà enregistré une partie sur JJKdle. */
  playedJjkdle: boolean;
}

/** Construit le contexte de stats d'un utilisateur (une passe groupée). */
export async function buildUserStatsContext(
  userId: string,
): Promise<UserStatsContext> {
  const [user, scores, draft, jjkdleAgg] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, jjkdleStreak: true, jjkdleBestStreak: true },
    }),
    prisma.score.findMany({
      where: { userId },
      select: { gameId: true, best: true },
    }),
    prisma.jujutsuDraftScore.findUnique({
      where: { userId },
      select: { enemiesKilled: true, outcome: true },
    }),
    // _count = nb de jours joués ; _min.attempts = meilleure perf (essais).
    prisma.jjkdleScore.aggregate({
      where: { userId },
      _count: { _all: true },
      _min: { attempts: true },
    }),
  ]);

  const bestByGame = new Map(scores.map((s) => [s.gameId, s.best]));
  const jjkdleCount = jjkdleAgg._count._all;

  // Jeux distincts joués : ids présents dans Score + draft + jjkdle.
  const played = new Set<string>(bestByGame.keys());
  if (draft) played.add("jujutsu-draft");
  if (jjkdleCount > 0) played.add("jjkdle");

  return {
    role: user?.role ?? "PLAYER",
    builderBest: bestByGame.get("builder") ?? 0,
    rankingBest: bestByGame.get("ranking") ?? 0,
    draftKills: draft?.enemiesKilled ?? 0,
    draftVictory: draft?.outcome === "VICTORY",
    jjkdleStreak: user?.jjkdleStreak ?? 0,
    jjkdleBestStreak: user?.jjkdleBestStreak ?? 0,
    jjkdleBestAttempts: jjkdleAgg._min.attempts ?? 0,
    gamesPlayed: played.size,
    playedBuilder: played.has("builder"),
    playedRanking: played.has("ranking"),
    playedDraft: played.has("jujutsu-draft"),
    playedJjkdle: played.has("jjkdle"),
  };
}
