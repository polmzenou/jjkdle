"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { creditCoins, debitCoins } from "@/lib/coins";
import { prisma } from "@/lib/prisma";
import { isPusherConfigured } from "@/lib/pusher/server";
import { casinoAccess, NOT_AUTHED_ERROR } from "./guard";
import { normalizeBets } from "./roulette";
import {
  broadcastRoulette,
  rouletteViewFor,
  spinNow,
  tickRoulette,
} from "./roulette-engine";
import {
  ROULETTE_BETTING_MS,
  ROULETTE_MAX_SEATS,
  type RouletteTableView,
  type SeatBets,
} from "./roulette-table";
import { seatOf } from "./state";
import { claimPublicSeat, findTableByCode, releaseSeat } from "./store";

/**
 * Server Actions de la ROULETTE À PLUSIEURS.
 *
 * Les jetons ne vivent pas que dans le navigateur : pour que les autres joueurs
 * les voient, chaque modification du tapis est envoyée au serveur (regroupée
 * par le client, quelques centaines de ms). Le client envoie l'ÉTAT COMPLET de
 * ses jetons, le serveur en débite — ou en rend — la DIFFÉRENCE avec ce qui
 * était déjà posé. L'ordre des écritures garantit qu'aucun coin n'apparaît :
 *
 *   hausse  : débit d'abord, écriture ensuite (rendu si l'écriture échoue) ;
 *   baisse  : écriture d'abord, crédit ensuite.
 */

export type RouletteTableResult =
  | { ok: true; code?: string; table?: RouletteTableView }
  | { ok: false; error: string; needsAuth?: boolean; table?: RouletteTableView };

const GAME = "roulette";
const GONE = "Cette table n'existe plus.";

/** Matchmaking : assied le joueur au tapis ouvert, ou en ouvre un. */
export async function joinRouletteTableAction(): Promise<RouletteTableResult> {
  const access = await casinoAccess();
  if (!access.ok) return access;
  if (!isPusherConfigured()) {
    return { ok: false, error: "Le multijoueur du casino n'est pas configuré sur ce serveur." };
  }

  const table = await claimPublicSeat(access.userId, {
    game: GAME,
    maxSeats: ROULETTE_MAX_SEATS,
    firstDeadlineMs: ROULETTE_BETTING_MS,
  });
  if (!table) return { ok: false, error: "Aucune table libre pour le moment. Réessaie." };

  // Revenu avant d'avoir été évincé : il reste.
  const seat = seatOf(table, access.userId);
  if (seat?.leaving) {
    await prisma.casinoSeat.updateMany({ where: { id: seat.id }, data: { leaving: false } });
  }

  const fresh = (await findTableByCode(table.code, GAME)) ?? table;
  await broadcastRoulette(fresh);
  return { ok: true, code: fresh.code, table: await rouletteViewFor(fresh, access.userId) };
}

/** Snapshot (rechargement, message `table-sync`, fin d'animation). */
export async function getRouletteTableAction(code: string): Promise<RouletteTableResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: NOT_AUTHED_ERROR, needsAuth: true };
  const table = await findTableByCode(code, GAME);
  if (!table) return { ok: false, error: GONE };
  return { ok: true, code: table.code, table: await rouletteViewFor(table, user.id) };
}

/** Réclame l'avancement à l'échéance (le serveur la revérifie). */
export async function tickRouletteAction(code: string): Promise<RouletteTableResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: NOT_AUTHED_ERROR, needsAuth: true };
  const view = await tickRoulette(code, user.id);
  return view ? { ok: true, code, table: view } : { ok: false, error: GONE };
}

/**
 * Remplace les jetons du joueur pour le tour `round`.
 *
 * `ready` : « je ne pose plus rien ». Quand tous les joueurs assis le sont et
 * qu'au moins un jeton est sur le tapis, la bille part sans attendre le chrono.
 */
export async function setRouletteBetsAction(
  code: string,
  input: unknown,
  round: number,
  ready: boolean,
): Promise<RouletteTableResult> {
  const access = await casinoAccess();
  if (!access.ok) return access;

  const clean = normalizeBets(input, { allowEmpty: true });
  if (!clean || !Number.isSafeInteger(round)) {
    return { ok: false, error: "Mise invalide. Repose tes jetons." };
  }

  const table = await findTableByCode(code, GAME);
  if (!table) return { ok: false, error: GONE };
  const seat = seatOf(table, access.userId);
  if (!seat) return { ok: false, error: "Tu n'es pas assis à cette table." };
  const view = async () => {
    const fresh = await findTableByCode(code, GAME);
    return fresh ? rouletteViewFor(fresh, access.userId) : undefined;
  };

  // 1. Mises ouvertes, sur CE tour, avant l'échéance (jugée par le serveur).
  const open = await prisma.casinoTable.updateMany({
    where: {
      id: table.id,
      phase: "BETTING",
      handNumber: round,
      phaseDeadline: { gt: new Date() },
    },
    data: { version: { increment: 1 }, lastActivityAt: new Date() },
  });
  if (open.count !== 1) {
    return { ok: false, error: "Rien ne va plus : les mises sont fermées.", table: await view() };
  }

  const bets = Object.fromEntries(clean.map((bet) => [bet.key, bet.amount]));
  const total = clean.reduce((sum, bet) => sum + bet.amount, 0);
  const previous = seat.betHandNumber === round ? seat.bet : 0;
  const delta = total - previous;

  // 2. Hausse : on débite AVANT d'écrire.
  if (delta > 0 && !(await debitCoins(access.userId, delta))) {
    return { ok: false, error: "Tu n'as pas assez de coins.", table: await view() };
  }

  // 3. Écriture, conditionnée à la révision lue et au tour non réglé.
  const stored: SeatBets = { bets, ready };
  const written = await prisma.casinoSeat.updateMany({
    where: {
      id: seat.id,
      activeHand: seat.activeHand,
      settledHandNumber: { not: round },
    },
    data: {
      hands: stored as never,
      bet: total,
      betHandNumber: round,
      activeHand: { increment: 1 },
      missedRounds: 0,
      leaving: false,
      lastSeenAt: new Date(),
    },
  });
  if (written.count !== 1) {
    if (delta > 0) await creditCoins(access.userId, delta);
    return { ok: false, error: "Rien ne va plus : la bille est lancée.", table: await view() };
  }

  // 4. Baisse : on rend APRÈS avoir écrit.
  if (delta < 0) await creditCoins(access.userId, -delta);

  const fresh = await findTableByCode(code, GAME);
  if (!fresh) return { ok: false, error: GONE };

  const current = fresh.seats.filter((s) => !s.leaving);
  const allReady =
    current.length > 0 &&
    current.every((s) => s.betHandNumber === round && (s.hands as Partial<SeatBets> | null)?.ready === true);
  const anyBet = fresh.seats.some((s) => s.betHandNumber === round && s.bet > 0);
  if (allReady && anyBet) {
    const spun = await spinNow(code, access.userId);
    return spun ? { ok: true, code, table: spun } : { ok: false, error: GONE };
  }

  await broadcastRoulette(fresh);
  return { ok: true, code, table: await rouletteViewFor(fresh, access.userId) };
}

/**
 * Quitte la table. Des jetons posés sur un tour pas encore joué sont RENDUS
 * (rien n'est engagé tant que la bille n'est pas partie). Si le tour est en
 * train d'être réglé, le joueur part à la fin du tour, gains compris.
 */
export async function leaveRouletteTableAction(code: string): Promise<RouletteTableResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: NOT_AUTHED_ERROR, needsAuth: true };

  const table = await findTableByCode(code, GAME);
  if (!table) return { ok: true, code };
  const seat = seatOf(table, user.id);
  if (!seat) return { ok: true, code };

  const round = table.handNumber;
  const hasLiveBets =
    table.phase === "BETTING" &&
    seat.betHandNumber === round &&
    seat.bet > 0 &&
    seat.settledHandNumber !== round;

  if (hasLiveBets) {
    const cleared = await prisma.casinoSeat.updateMany({
      where: { id: seat.id, activeHand: seat.activeHand, settledHandNumber: { not: round } },
      data: {
        hands: { bets: {}, ready: false } as never,
        bet: 0,
        activeHand: { increment: 1 },
      },
    });
    if (cleared.count === 1) {
      await creditCoins(user.id, seat.bet);
      await releaseSeat(table.id, user.id);
    } else {
      await prisma.casinoSeat.updateMany({ where: { id: seat.id }, data: { leaving: true } });
    }
  } else {
    await releaseSeat(table.id, user.id);
  }

  const fresh = await findTableByCode(code, GAME);
  if (fresh) await broadcastRoulette(fresh);
  return { ok: true, code };
}
