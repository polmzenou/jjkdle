"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { debitCoins } from "@/lib/coins";
import { prisma } from "@/lib/prisma";
import { isPusherConfigured } from "@/lib/pusher/server";
import { casinoAccess, NOT_AUTHED_ERROR } from "./guard";
import {
  advanceNow,
  applyTransition,
  broadcast,
  tickTable,
  viewFor,
} from "./engine";
import { applyMove, everyoneHasBet } from "./machine";
import { canDouble } from "./hand";
import { seatOf, toMachineState } from "./state";
import {
  claimPublicSeat,
  createSoloTable,
  findTableByCode,
  findTableForUser,
  releaseSeat,
} from "./store";
import type { CasinoTableView, Move } from "./types";

/**
 * Server Actions du casino.
 *
 * Deux règles qui traversent tout le fichier :
 *
 * 1. **`expectedVersion`** — le client renvoie la `version` de la table qu'il a
 *    effectivement affichée, et l'action exige qu'elle corresponde. C'est
 *    l'anti-double-soumission générique : un HIT double-cliqué ne peut pas tirer
 *    deux cartes, parce que le second clic porte une version déjà périmée.
 *
 * 2. **Aucun `revalidatePath`** — la table est un composant client alimenté par
 *    Pusher et par le snapshot que chaque action renvoie. Revalider referait
 *    tout l'arbre RSC à chaque carte tirée. Le solde de la nav est tenu à jour
 *    par `yourCoins` dans le snapshot.
 */

export type CasinoResult =
  | { ok: true; code?: string; table?: CasinoTableView }
  | { ok: false; error: string; needsAuth?: boolean };

const NOT_AUTHED: CasinoResult = {
  ok: false,
  error: NOT_AUTHED_ERROR,
  needsAuth: true,
};

/**
 * Vérifie session + casino ouvert. La règle elle-même vit dans ./guard, partagée
 * avec les autres jeux ; il ne reste ici que la mise à la forme `CasinoResult`.
 */
async function guard(): Promise<
  { ok: true; userId: string } | { ok: false; result: CasinoResult }
> {
  const access = await casinoAccess();
  return access.ok
    ? { ok: true, userId: access.userId }
    : { ok: false, result: access };
}

// ──────────────────────────────────────────────────────────────────────────
// Entrée en table
// ──────────────────────────────────────────────────────────────────────────

/** Ouvre une table solo (ou renvoie celle où le joueur est déjà assis). */
export async function startSoloTableAction(): Promise<CasinoResult> {
  const auth = await guard();
  if (!auth.ok) return auth.result;

  const existing = await findTableForUser(auth.userId);
  if (existing) {
    return { ok: true, code: existing.code, table: await viewFor(existing, auth.userId) };
  }

  const table = await createSoloTable(auth.userId);
  return { ok: true, code: table.code, table: await viewFor(table, auth.userId) };
}

/** Matchmaking : assied le joueur à une table publique (5 places max). */
export async function joinPublicTableAction(): Promise<CasinoResult> {
  const auth = await guard();
  if (!auth.ok) return auth.result;

  // Le multi repose entièrement sur Pusher : sans lui, les autres joueurs ne
  // verraient jamais un coup se jouer. On le dit franchement plutôt que de
  // livrer une table qui a l'air figée (même forme qu'en « Qui est-ce ? »).
  if (!isPusherConfigured()) {
    return {
      ok: false,
      error: "Le multijoueur du casino n'est pas configuré sur ce serveur.",
    };
  }

  const table = await claimPublicSeat(auth.userId);
  if (!table) {
    return { ok: false, error: "Aucune table libre pour le moment. Réessaie." };
  }
  await broadcast(table);
  return { ok: true, code: table.code, table: await viewFor(table, auth.userId) };
}

/** Snapshot d'une table (rechargement, reconnexion). */
export async function getTableAction(code: string): Promise<CasinoResult> {
  const user = await getCurrentUser();
  if (!user) return NOT_AUTHED;
  const table = await findTableByCode(code);
  if (!table) return { ok: false, error: "Cette table n'existe plus." };
  return { ok: true, code: table.code, table: await viewFor(table, user.id) };
}

// ──────────────────────────────────────────────────────────────────────────
// Mise
// ──────────────────────────────────────────────────────────────────────────

/**
 * Place une mise pour la manche en cours.
 *
 * L'ORDRE des opérations est ce qui rend la mise sûre côté coins :
 *
 *   1. verrou de phase   (on est bien en BETTING, sur CETTE manche)
 *   2. réservation       (`betHandNumber` : une seule mise par manche et par siège)
 *   3. débit             (atomique, `coins >= montant`)
 *   4. compensation      (si le débit échoue, on relâche la réservation)
 *
 * Débiter avant de réserver permettrait de payer deux fois sur un double clic ;
 * réserver sans compenser bloquerait un joueur insolvable pour toute la manche.
 * Le pire cas ici est une réservation de quelques microsecondes rendue aussitôt
 * — jamais un débit sans mise.
 */
export async function placeBetAction(
  code: string,
  amount: number,
  expectedVersion: number,
): Promise<CasinoResult> {
  const auth = await guard();
  if (!auth.ok) return auth.result;

  const table = await findTableByCode(code);
  if (!table) return { ok: false, error: "Cette table n'existe plus." };
  const seat = seatOf(table, auth.userId);
  if (!seat) return { ok: false, error: "Tu n'es pas assis à cette table." };

  const bet = Math.round(Number(amount));
  if (!Number.isFinite(bet) || bet < table.minBet) {
    return { ok: false, error: `Mise minimale : ${table.minBet} coins.` };
  }

  // 1. Verrou de phase + version.
  const phaseOk = await prisma.casinoTable.updateMany({
    where: {
      id: table.id,
      phase: "BETTING",
      handNumber: table.handNumber,
      version: expectedVersion,
    },
    data: { version: { increment: 1 }, lastActivityAt: new Date() },
  });
  if (phaseOk.count !== 1) {
    return { ok: false, error: "Les mises sont fermées." };
  }

  // 2. Réservation : une seule mise par siège et par manche.
  const reserved = await prisma.casinoSeat.updateMany({
    where: { id: seat.id, betHandNumber: { not: table.handNumber } },
    data: {
      bet,
      betHandNumber: table.handNumber,
      hands: [] as never,
      activeHand: 0,
      missedRounds: 0,
      lastSeenAt: new Date(),
    },
  });
  if (reserved.count !== 1) {
    return { ok: false, error: "Tu as déjà misé pour cette manche." };
  }

  // 3. Débit.
  if (!(await debitCoins(auth.userId, bet))) {
    // 4. Compensation : la réservation est rendue, rien n'a été prélevé.
    await prisma.casinoSeat.updateMany({
      where: { id: seat.id, betHandNumber: table.handNumber },
      data: { bet: 0, betHandNumber: -1 },
    });
    return { ok: false, error: "Tu n'as pas assez de coins." };
  }

  const fresh = await findTableByCode(code);
  if (!fresh) return { ok: false, error: "Cette table n'existe plus." };

  // Tout le monde a misé : inutile d'attendre la fin du chrono pour distribuer.
  if (everyoneHasBet(toMachineState(fresh))) {
    const view = await advanceNow(code, auth.userId);
    return view
      ? { ok: true, code, table: view }
      : { ok: false, error: "Cette table n'existe plus." };
  }

  await broadcast(fresh);
  return { ok: true, code, table: await viewFor(fresh, auth.userId) };
}

// ──────────────────────────────────────────────────────────────────────────
// Coups
// ──────────────────────────────────────────────────────────────────────────

/**
 * Joue un coup (HIT / STAND / DOUBLE).
 *
 * Le DOUBLE débite la mise supplémentaire AVANT de tirer la carte : si le solde
 * ne suit pas, le coup est refusé et la main reste jouable telle quelle. Tirer
 * d'abord obligerait à annuler une carte déjà sortie du sabot.
 */
export async function playAction(
  code: string,
  move: Move,
  expectedVersion: number,
): Promise<CasinoResult> {
  const auth = await guard();
  if (!auth.ok) return auth.result;
  if (move !== "HIT" && move !== "STAND" && move !== "DOUBLE") {
    return { ok: false, error: "Coup inconnu." };
  }

  const table = await findTableByCode(code);
  if (!table) return { ok: false, error: "Cette table n'existe plus." };
  const seat = seatOf(table, auth.userId);
  if (!seat) return { ok: false, error: "Tu n'es pas assis à cette table." };

  const state = toMachineState(table);
  const seatState = state.seats.find((s) => s.seat === seat.seat);
  if (!seatState) return { ok: false, error: "Siège introuvable." };
  if (state.activeSeat !== seat.seat) {
    return { ok: false, error: "Ce n'est pas ton tour." };
  }

  const hand = seatState.hands[seatState.activeHand];
  if (!hand || hand.status !== "PLAYING") {
    return { ok: false, error: "Cette main est déjà terminée." };
  }
  if (move === "DOUBLE" && !canDouble(hand.cards, hand.doubled)) {
    return { ok: false, error: "Impossible de doubler cette main." };
  }

  // Verrou : la table n'a pas bougé depuis l'affichage du client.
  const locked = await prisma.casinoTable.updateMany({
    where: {
      id: table.id,
      version: expectedVersion,
      phase: "PLAYER_TURNS",
      activeSeat: seat.seat,
    },
    data: { version: { increment: 1 }, lastActivityAt: new Date() },
  });
  if (locked.count !== 1) {
    return { ok: false, error: "Action trop tardive, la table a déjà avancé." };
  }

  // Le DOUBLE coûte une seconde mise, prélevée avant de tirer.
  if (move === "DOUBLE" && !(await debitCoins(auth.userId, hand.bet))) {
    return { ok: false, error: "Tu n'as pas assez de coins pour doubler." };
  }

  const next = applyMove(state, seat.seat, move);
  if (!next) return { ok: false, error: "Coup impossible." };

  await applyTransition(table, next);
  await prisma.casinoSeat.updateMany({
    where: { id: seat.id },
    data: { lastSeenAt: new Date() },
  });

  const fresh = await findTableByCode(code);
  if (!fresh) return { ok: false, error: "Cette table n'existe plus." };
  await broadcast(fresh);
  return { ok: true, code, table: await viewFor(fresh, auth.userId) };
}

// ──────────────────────────────────────────────────────────────────────────
// Horloge et sortie
// ──────────────────────────────────────────────────────────────────────────

/**
 * Réclame l'avancement de la table. Appelée par TOUS les clients connectés à
 * l'expiration du chrono — le serveur revérifie l'échéance et n'en laisse
 * passer qu'un (cf. `tickTable`). Une table SOLO l'appelle aussi pour ses
 * phases d'animation (distribution, croupier).
 */
export async function tickTableAction(code: string): Promise<CasinoResult> {
  const user = await getCurrentUser();
  if (!user) return NOT_AUTHED;
  const view = await tickTable(code, user.id);
  return view
    ? { ok: true, code, table: view }
    : { ok: false, error: "Cette table n'existe plus." };
}

/**
 * « Rejouer » : relance une manche sur une table SOLO.
 *
 * ⚠️ Ne passe PAS par `tickTableAction`, et c'est tout l'objet de cette action.
 * Un tick n'avance la table que si son ÉCHÉANCE est passée — or une table solo
 * en SETTLED n'en a aucune (elle attend justement le joueur). Le tick la
 * trouvait donc toujours « pas mûre » et ne faisait rien : le bouton Rejouer
 * restait sans effet, la table figée sur son récapitulatif.
 *
 * On force donc l'avancement. `advanceNow` ignorant l'échéance, il lui faut un
 * garde-fou strict : sans lui, un joueur pourrait sauter le tour d'un autre à
 * une table publique. D'où les trois conditions ci-dessous — être assis, table
 * solo, phase SETTLED — qui décrivent exactement le cas « la table n'attend que
 * moi ».
 */
export async function relaunchAction(code: string): Promise<CasinoResult> {
  const auth = await guard();
  if (!auth.ok) return auth.result;

  const table = await findTableByCode(code);
  if (!table) return { ok: false, error: "Cette table n'existe plus." };
  if (!seatOf(table, auth.userId)) {
    return { ok: false, error: "Tu n'es pas assis à cette table." };
  }
  if (table.mode !== "SOLO" || table.phase !== "SETTLED") {
    // À une table publique, la manche suivante part au chrono : rien à forcer.
    return { ok: false, error: "La manche suivante démarre toute seule." };
  }

  const view = await advanceNow(code, auth.userId);
  return view
    ? { ok: true, code, table: view }
    : { ok: false, error: "Cette table n'existe plus." };
}

/**
 * Quitte la table.
 *
 * Si le joueur a déjà misé, sa mise est ENGAGÉE : sa main se joue sans lui
 * (STAND d'office au chrono) et ses gains éventuels sont crédités quand même —
 * les coins sont globaux, il les retrouvera à sa prochaine connexion. Rembourser
 * ferait de la fuite une option gratuite dès qu'une main tourne mal.
 */
export async function leaveTableAction(code: string): Promise<CasinoResult> {
  const user = await getCurrentUser();
  if (!user) return NOT_AUTHED;

  const table = await findTableByCode(code);
  if (!table) return { ok: true, code };
  const seat = seatOf(table, user.id);
  if (!seat) return { ok: true, code };

  const engaged = seat.betHandNumber === table.handNumber && seat.bet > 0;
  const midHand = table.phase !== "BETTING" && table.phase !== "SETTLED";

  if (engaged && midHand) {
    // Le siège reste le temps que la main se termine, puis il est évincé par la
    // transition SETTLED → BETTING.
    await prisma.casinoSeat.updateMany({
      where: { id: seat.id },
      data: { leaving: true },
    });
  } else {
    await releaseSeat(table.id, user.id);
  }

  const fresh = await findTableByCode(code);
  if (fresh) await broadcast(fresh);
  return { ok: true, code };
}
