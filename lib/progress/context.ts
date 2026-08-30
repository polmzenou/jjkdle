import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUniverse } from "@/lib/universes/current";

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
  /** Victoires « Qui est-ce ? ». */
  guessWhoWins: number;
  /** Défaites « Qui est-ce ? ». */
  guessWhoLosses: number;
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
  /** A déjà joué une partie « Qui est-ce ? ». */
  playedGuessWho: boolean;
  /** Étage le plus haut atteint dans « The Culling Tower » (0 si jamais joué). */
  towerBestFloor: number;
  /** La tour a déjà été franchie au moins une fois. */
  towerCleared: boolean;
  /**
   * Plus petit n° d'essai auquel la tour a été bouclée. 0 = jamais bouclée.
   * `=== 1` ⇒ franchie du premier coup (badge TOWER_FIRST_TRY) — l'exploit,
   * puisque les essais sont illimités.
   */
  towerBestAttempt: number;
  /** A déjà terminé une ascension. */
  playedTower: boolean;
}

/**
 * Construit le contexte de stats d'un utilisateur (une passe groupée).
 *
 * PORTÉE = un univers. Les scores/résultats sont filtrés par `universeId`
 * (défaut = univers courant) : les cosmétiques et badges étant PAR univers, un
 * badge/titre JJK se débloque à partir du jeu JJK. L'XP/le niveau restent
 * GLOBAUX et ne passent PAS par ce contexte (cf. lib/progress/recompute).
 */
export async function buildUserStatsContext(
  userId: string,
  universeId?: string,
): Promise<UserStatsContext> {
  const uid = universeId ?? (await getCurrentUniverse()).id;
  const [user, profile, scores, draft, jjkdleAgg, guessWhoAgg, tower] =
    await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    }),
    // Streak PAR univers (déplacé de User vers UserUniverseProfile, étape 2c).
    prisma.userUniverseProfile.findUnique({
      where: { userId_universeId: { userId, universeId: uid } },
      select: { jjkdleStreak: true, jjkdleBestStreak: true },
    }),
    prisma.score.findMany({
      where: { userId, universeId: uid },
      select: { gameId: true, best: true },
    }),
    prisma.jujutsuDraftScore.findUnique({
      where: { userId_universeId: { userId, universeId: uid } },
      select: { enemiesKilled: true, outcome: true },
    }),
    // _count = nb de jours joués ; _min.attempts = meilleure perf (essais).
    prisma.jjkdleScore.aggregate({
      where: { userId, universeId: uid },
      _count: { _all: true },
      _min: { attempts: true },
    }),
    // Victoires/défaites « Qui est-ce ? » (une ligne par partie et par joueur).
    prisma.guessWhoScore.groupBy({
      by: ["won"],
      where: { userId, universeId: uid },
      _count: { _all: true },
    }),
    // Une ligne par ascension terminée (essais compris).
    prisma.towerScore.findMany({
      where: { userId, universeId: uid },
      select: { floor: true, cleared: true, attempt: true },
    }),
  ]);

  const bestByGame = new Map(scores.map((s) => [s.gameId, s.best]));
  const jjkdleCount = jjkdleAgg._count._all;
  const guessWhoWins =
    guessWhoAgg.find((r) => r.won)?._count._all ?? 0;
  const guessWhoLosses =
    guessWhoAgg.find((r) => !r.won)?._count._all ?? 0;

  // Jeux distincts joués : ids présents dans Score + draft + jjkdle + guesswho.
  const played = new Set<string>(bestByGame.keys());
  if (draft) played.add("jujutsu-draft");
  if (jjkdleCount > 0) played.add("jjkdle");
  if (guessWhoWins + guessWhoLosses > 0) played.add("guesswho");
  if (tower.length > 0) played.add("tower");

  const towerClears = tower.filter((t) => t.cleared);

  return {
    role: user?.role ?? "PLAYER",
    builderBest: bestByGame.get("builder") ?? 0,
    rankingBest: bestByGame.get("ranking") ?? 0,
    draftKills: draft?.enemiesKilled ?? 0,
    draftVictory: draft?.outcome === "VICTORY",
    jjkdleStreak: profile?.jjkdleStreak ?? 0,
    jjkdleBestStreak: profile?.jjkdleBestStreak ?? 0,
    jjkdleBestAttempts: jjkdleAgg._min.attempts ?? 0,
    guessWhoWins,
    guessWhoLosses,
    gamesPlayed: played.size,
    playedBuilder: played.has("builder"),
    playedRanking: played.has("ranking"),
    playedDraft: played.has("jujutsu-draft"),
    playedJjkdle: played.has("jjkdle"),
    playedGuessWho: played.has("guesswho"),
    towerBestFloor: tower.reduce((max, t) => Math.max(max, t.floor), 0),
    towerCleared: towerClears.length > 0,
    towerBestAttempt: towerClears.reduce(
      (min, t) => (min === 0 ? t.attempt : Math.min(min, t.attempt)),
      0,
    ),
    playedTower: played.has("tower"),
  };
}
