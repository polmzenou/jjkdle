"use server";

import { getRoster } from "@/lib/content/queries";
import { getAdminUser, getCurrentUser } from "@/lib/auth/session";
import {
  eligibleRoster,
  pickDailyTarget,
  pickRandomTarget,
  todayKey,
} from "@/lib/games/jjkdle/daily";
import { compareGuess } from "@/lib/games/jjkdle/scoring";
import { isStateFresh } from "@/lib/games/jjkdle/game";
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
  const roster = await getRoster();
  const map = Object.fromEntries(roster.map((c) => [c.id, c]));

  const guess = map[characterId];
  if (!guess) return { ok: false, error: "Personnage inconnu." };

  // Résolution de l'état : on repart à zéro si la partie daily a expiré.
  let state = await readState();
  if (state && !isStateFresh(state, roster)) state = null;

  if (!state) {
    const target = pickDailyTarget(todayKey(), eligibleRoster(roster));
    if (!target) {
      return {
        ok: false,
        error: "Pas assez de personnages configurés pour JJKdle.",
      };
    }
    state = {
      mode: "daily",
      date: todayKey(),
      targetId: target.id,
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
