"use server";

import { revalidatePath } from "next/cache";
import { getRoster } from "@/lib/content/queries";
import { getAdminUser, getCurrentUser } from "@/lib/auth/session";
import {
  eligibleRoster,
  pickRandomTarget,
  todayKey,
} from "@/lib/games/jjkdle/daily";
import { resolveDailyTarget } from "@/lib/games/jjkdle/daily-server";
import { compareGuess } from "@/lib/games/jjkdle/scoring";
import { isStateFresh } from "@/lib/games/jjkdle/game";
import { saveJjkdleScore } from "@/lib/games/jjkdle/leaderboard";
import {
  recordJjkdleAttempt,
  markJjkdleSolved,
} from "@/lib/games/jjkdle/result";
import { updateJjkdleStreak } from "@/lib/progress/streak";
import { awardExp, refreshLevelAndBadges } from "@/lib/progress/recompute";
import { jjkdleExp } from "@/lib/progress/exp-rewards";
import type { ExpResult } from "@/lib/leaderboard/actions";
import {
  readState,
  writeState,
  type JjkdleState,
} from "@/lib/games/jjkdle/state";
import { VIP_MAX_REPLAYS, type GuessResult } from "@/lib/games/jjkdle/types";

/**
 * Server Actions JJKdle — résolution AUTORITATIVE côté serveur.
 * Le client envoie un id de perso ; on calcule les indices et on ne renvoie
 * JAMAIS la cible tant que la partie n'est pas gagnée.
 */

/** Propose un personnage et renvoie les indices colorés. */
export async function guessAction(characterId: string): Promise<GuessResult> {
  const [roster, user] = await Promise.all([getRoster(), getCurrentUser()]);
  const map = Object.fromEntries(roster.map((c) => [c.id, c]));

  const guess = map[characterId];
  if (!guess) return { ok: false, error: "Personnage inconnu." };

  // Cible du jour résolue (avec override admin éventuel) : sert à valider la
  // fraîcheur de l'état ET à créer une nouvelle partie daily.
  const dailyTarget = await resolveDailyTarget(roster);

  // Résolution de l'état : on repart à zéro si la partie daily a expiré.
  let state = await readState();
  if (state && !isStateFresh(state, roster, dailyTarget?.id)) state = null;

  if (!state) {
    if (!dailyTarget) {
      return {
        ok: false,
        error: "Pas assez de personnages configurés pour JJKdle.",
      };
    }
    state = {
      mode: "daily",
      date: todayKey(),
      targetId: dailyTarget.id,
      guesses: [],
      status: "playing",
    } satisfies JjkdleState;
  }

  if (state.status === "won") {
    return { ok: false, error: "Partie déjà résolue pour aujourd'hui." };
  }
  if (state.guesses.includes(characterId)) {
    return { ok: false, error: "Personnage déjà proposé." };
  }

  const target = map[state.targetId];
  if (!target) {
    // Cible supprimée du roster entre-temps → on réinitialise proprement.
    return { ok: false, error: "Partie invalide, recharge la page." };
  }

  const row = compareGuess(guess, target);
  state.guesses.push(characterId);
  if (characterId === state.targetId) state.status = "won";

  await writeState(state);

  // Journalisation analytique (parties daily d'un utilisateur connecté). Best-
  // effort : ne doit jamais casser le gameplay si l'écriture échoue.
  if (user && state.mode === "daily") {
    try {
      if (state.status === "won") {
        await markJjkdleSolved(
          user.id,
          state.date,
          state.targetId,
          state.guesses.length,
        );
      } else {
        await recordJjkdleAttempt(
          user.id,
          state.date,
          state.targetId,
          state.guesses.length,
        );
      }
    } catch {
      // silencieux : stat non bloquante
    }
  }

  return {
    ok: true,
    row,
    status: state.status,
    attempts: state.guesses.length,
    revealed:
      state.status === "won"
        ? {
            id: target.id,
            name: target.name,
            title: target.title,
            ...(target.image ? { image: target.image } : {}),
          }
        : null,
  };
}

/**
 * Mode admin illimité : démarre une nouvelle partie avec une cible ALÉATOIRE
 * (hors contrainte quotidienne). Réservé aux administrateurs.
 */
export async function newAdminGameAction(): Promise<{ ok: boolean; error?: string }> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  const roster = await getRoster();
  const target = pickRandomTarget(eligibleRoster(roster));
  if (!target) {
    return { ok: false, error: "Pas assez de personnages configurés." };
  }
  // `date` = aujourd'hui : la partie admin est éphémère (expire à minuit) →
  // le lendemain, l'admin retrouve le perso quotidien commun à tous.
  await writeState({
    mode: "admin",
    date: todayKey(),
    targetId: target.id,
    guesses: [],
    status: "playing",
  });
  return { ok: true };
}

/**
 * Octroi AUTOMATIQUE de l'XP JJKdle à la victoire du jour, SANS enregistrement
 * au classement. Appelé à l'ouverture du panneau de victoire pour un
 * utilisateur connecté (partie quotidienne uniquement, pas les bonus admin/VIP).
 *
 * AUTORITATIF : les essais sont relus depuis l'état serveur (cookie). Le streak
 * est mis à jour ici (il matérialise « avoir résolu le daily », indépendamment
 * du classement) ; son garde `firstToday` évite tout double octroi (reload).
 */
export async function awardJjkdleExpAction(): Promise<ExpResult & { streak?: number }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsAuth: true };

  const state = await readState();
  if (!state || state.mode !== "daily" || state.status !== "won") {
    return { ok: false };
  }

  const roster = await getRoster();
  const dailyTarget = await resolveDailyTarget(roster);
  if (!isStateFresh(state, roster, dailyTarget?.id)) return { ok: false };

  // Streak AVANT l'octroi : il sert au multiplicateur ×(streak+1) et au badge
  // JJKDLE_STREAK_7. `firstToday: false` (déjà compté aujourd'hui) ⇒ 0 XP.
  const { streak, firstToday } = await updateJjkdleStreak(user.id);
  const { gained, newBadges } = await awardExp(
    user.id,
    firstToday ? jjkdleExp(state.guesses.length, streak) : 0,
  );
  return { ok: true, gainedExp: gained, newBadges, streak };
}

/**
 * Enregistre au leaderboard du jour le score de la partie quotidienne gagnée
 * (classement uniquement — l'XP et le streak sont gérés par
 * `awardJjkdleExpAction` à la victoire). AUTORITATIF : le nombre d'essais est
 * relu depuis l'état serveur (cookie). Réservé aux utilisateurs connectés ; ne
 * compte que la partie quotidienne résolue (pas les parties bonus admin/VIP).
 */
export async function submitJjkdleScoreAction(): Promise<{
  ok: boolean;
  error?: string;
  needsAuth?: boolean;
  newBadges?: string[];
}> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      needsAuth: true,
      error: "Connecte-toi pour enregistrer ton score.",
    };
  }

  const state = await readState();
  if (!state || state.mode !== "daily" || state.status !== "won") {
    return { ok: false, error: "Aucune victoire quotidienne à enregistrer." };
  }

  const roster = await getRoster();
  const dailyTarget = await resolveDailyTarget(roster);
  if (!isStateFresh(state, roster, dailyTarget?.id)) {
    return { ok: false, error: "Partie expirée, recharge la page." };
  }

  try {
    await saveJjkdleScore(user.id, state.date, state.guesses.length);
    // Filet analytique : marque le résultat comme résolu si le joueur s'est
    // connecté APRÈS avoir gagné (les guess anonymes n'ont pas été loggés).
    try {
      await markJjkdleSolved(
        user.id,
        state.date,
        state.targetId,
        state.guesses.length,
      );
    } catch {
      // stat non bloquante
    }
    // Le score du jour peut débloquer un badge (ex. IDLE_MASTER au 1er essai).
    const { newBadges } = await refreshLevelAndBadges(user.id);
    revalidatePath("/games/jjkdle");
    return { ok: true, newBadges };
  } catch (e) {
    return { ok: false, error: `Échec d'enregistrement : ${(e as Error).message}` };
  }
}

/**
 * Mode VIP : démarre une partie bonus (cible aléatoire), PLAFONNÉE à
 * VIP_MAX_REPLAYS par jour. Réservé aux rôles VIP (et ADMIN, qui n'est pas
 * limité de toute façon). Le compteur vit dans le cookie et se réinitialise
 * chaque jour (limite « souple » : suffisante pour l'usage prévu).
 */
export async function newVipGameAction(): Promise<{
  ok: boolean;
  error?: string;
  remaining?: number;
}> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "VIP" && user.role !== "ADMIN")) {
    return { ok: false, error: "Réservé aux membres VIP." };
  }

  const roster = await getRoster();
  const target = pickRandomTarget(eligibleRoster(roster));
  if (!target) {
    return { ok: false, error: "Pas assez de personnages configurés." };
  }

  // Compte les parties VIP déjà jouées aujourd'hui.
  const state = await readState();
  const used =
    state && state.mode === "vip" && state.date === todayKey()
      ? state.replays ?? 0
      : 0;
  if (used >= VIP_MAX_REPLAYS) {
    return {
      ok: false,
      error: `Limite de ${VIP_MAX_REPLAYS} parties bonus atteinte pour aujourd'hui.`,
    };
  }

  const replays = used + 1;
  await writeState({
    mode: "vip",
    date: todayKey(),
    targetId: target.id,
    guesses: [],
    status: "playing",
    replays,
  });
  return { ok: true, remaining: VIP_MAX_REPLAYS - replays };
}
