import "server-only";
import { randomInt } from "node:crypto";
import { creditCoins } from "@/lib/coins";
import { prisma } from "@/lib/prisma";
import { isPusherConfigured, triggerCasino } from "@/lib/pusher/server";
import { CASINO_EVENTS, type TableSyncPayload } from "./events";
import { RED_NUMBERS, resolveRoulette } from "./roulette";
import {
  ROULETTE_AFK_MAX,
  ROULETTE_BETTING_MS,
  ROULETTE_HISTORY_MAX,
  ROULETTE_RECAP_MS,
  ROULETTE_SPIN_MS,
  readSeatBets,
  readWheelState,
  sumBets,
  type RouletteSeatResult,
  type RouletteTableView,
  type WheelState,
} from "./roulette-table";
import { STUCK_MS } from "./rules";
import { findTableByCode, releaseSeat, type TableWithSeats } from "./store";

/**
 * MOTEUR de la roulette à plusieurs. Même architecture que celui du blackjack
 * (cf. ./engine.ts) : pas de cron sur Vercel, ce sont les clients qui
 * réclament l'avancement à l'échéance, et un verrou en UNE instruction SQL
 * (`phaseDeadline` passe à NULL) ne laisse passer qu'un seul tick.
 *
 * Le cycle d'un tour :
 *
 *   BETTING ──échéance (ou tout le monde « prêt »)──▶ SETTLED ──échéance──▶ BETTING
 *            tirage + paiements                       récap      tour + 1
 *
 * Personne n'a posé de jeton à l'échéance ? La bille ne part pas : la fenêtre
 * de mise est simplement relancée (et l'AFK compté).
 *
 * ── Mises posées pendant le règlement ─────────────────────────────────────
 * Les jetons arrivent en continu, le règlement peut donc croiser une mise.
 * Chaque siège est réglé par COMPARE-AND-SWAP sur sa révision (`activeHand`) :
 * si une mise s'est glissée entre la lecture et l'écriture, on relit le siège et
 * on règle la version fraîche. Et une mise arrivée APRÈS le règlement échoue sur
 * `settledHandNumber` — son débit est alors rendu (cf. roulette-table-actions).
 */

const GAME = "roulette";

/** Marge sous la limite de 10 ko d'un message Pusher. */
const PUSHER_MAX_BYTES = 9_000;

// ──────────────────────────────────────────────────────────────────────────
// Sérialisation + diffusion
// ──────────────────────────────────────────────────────────────────────────

export function serializeRouletteTable(
  table: TableWithSeats,
  viewerId: string | null,
  yourCoins: number,
): RouletteTableView {
  const phase = table.phase === "SETTLED" ? "SETTLED" : "BETTING";
  const wheel = readWheelState(table.dealerCards);
  // Le numéro n'est publié qu'une fois le tour réglé : pendant la fraction de
  // seconde où un tick l'a tiré sans avoir encore payé, il reste en base.
  const drawnNotSettled = phase === "BETTING" && wheel.round === table.handNumber;
  return {
    code: table.code,
    phase,
    round: table.handNumber,
    version: table.version,
    phaseDeadlineMs: table.phaseDeadline ? table.phaseDeadline.getTime() : null,
    serverNowMs: Date.now(),
    minBet: table.minBet,
    maxSeats: table.maxSeats,
    pocket: phase === "SETTLED" && wheel.round === table.handNumber ? wheel.pocket : null,
    history: drawnNotSettled ? wheel.history.slice(1) : wheel.history,
    seats: table.seats.map((seat) => {
      const current = seat.betHandNumber === table.handNumber;
      const { bets, ready } = current ? readSeatBets(seat.hands) : { bets: {}, ready: false };
      return {
        seat: seat.seat,
        userId: seat.userId,
        username: seat.user.username,
        level: seat.user.level,
        bets,
        total: current ? seat.bet : 0,
        ready,
        lastResult: (seat.lastResult as RouletteSeatResult | null) ?? null,
        leaving: seat.leaving,
        isYou: viewerId !== null && seat.userId === viewerId,
      };
    }),
    yourCoins,
  };
}

export async function rouletteViewFor(
  table: TableWithSeats,
  viewerId: string | null,
): Promise<RouletteTableView> {
  const user = viewerId
    ? await prisma.user.findUnique({ where: { id: viewerId }, select: { coins: true } })
    : null;
  return serializeRouletteTable(table, viewerId, user?.coins ?? 0);
}

/**
 * Diffuse le snapshot ANONYME (canal partagé : le solde de personne). Trop
 * lourd pour un message Pusher ? On envoie un simple « relis la table » et
 * chaque client va chercher sa vue.
 */
export async function broadcastRoulette(table: TableWithSeats): Promise<void> {
  if (!isPusherConfigured()) return;
  const view = serializeRouletteTable(table, null, 0);
  const body = JSON.stringify({ table: view });
  try {
    if (body.length <= PUSHER_MAX_BYTES) {
      await triggerCasino(table.code, CASINO_EVENTS.tableState, { table: view });
    } else {
      const sync: TableSyncPayload = { version: table.version };
      await triggerCasino(table.code, CASINO_EVENTS.tableSync, sync);
    }
  } catch {
    // L'état est en base ; les clients le rattraperont au prochain tick.
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Le tick
// ──────────────────────────────────────────────────────────────────────────

/** Avance la table d'une étape si son échéance est passée. */
export async function tickRoulette(
  code: string,
  viewerId: string | null,
): Promise<RouletteTableView | null> {
  const table = await findTableByCode(code, GAME);
  if (!table) return null;
  if (!(await claim(table, new Date()))) return rouletteViewFor(table, viewerId);
  return advanceAndPublish(table, viewerId);
}

/**
 * Lance la bille sans attendre l'échéance : tous les joueurs assis sont
 * « prêts ». Garde de `version` + phase : toujours un seul gagnant.
 */
export async function spinNow(
  code: string,
  viewerId: string | null,
): Promise<RouletteTableView | null> {
  const table = await findTableByCode(code, GAME);
  if (!table) return null;
  const claimed = await prisma.casinoTable.updateMany({
    where: {
      id: table.id,
      version: table.version,
      phase: "BETTING",
      phaseDeadline: { not: null },
    },
    data: { version: { increment: 1 }, phaseDeadline: null },
  });
  if (claimed.count !== 1) return rouletteViewFor(table, viewerId);
  return advanceAndPublish(table, viewerId);
}

async function advanceAndPublish(
  table: TableWithSeats,
  viewerId: string | null,
): Promise<RouletteTableView | null> {
  if (table.phase === "SETTLED") {
    await nextRound(table);
  } else {
    const anyBet = table.seats.some(
      (seat) => seat.betHandNumber === table.handNumber && seat.bet > 0,
    );
    if (anyBet) await settleRound(table);
    else await reopenBetting(table);
  }

  const fresh = await findTableByCode(table.code, GAME);
  if (!fresh) return null;
  await broadcastRoulette(fresh);
  return rouletteViewFor(fresh, viewerId);
}

/**
 * Verrou : voie normale (échéance passée) ou reprise après crash (verrou pris
 * puis tick mort avant d'écrire). Rejouer est sûr : le numéro tiré est
 * persisté AVANT tout paiement, et chaque siège est gardé par
 * `settledHandNumber`.
 */
async function claim(table: TableWithSeats, now: Date): Promise<boolean> {
  const normal = await prisma.casinoTable.updateMany({
    where: {
      id: table.id,
      version: table.version,
      phase: table.phase,
      phaseDeadline: { lte: now },
    },
    data: { version: { increment: 1 }, phaseDeadline: null },
  });
  if (normal.count === 1) return true;

  if (table.phaseDeadline !== null) return false;
  const stuckSince = new Date(now.getTime() - STUCK_MS);
  if (table.updatedAt > stuckSince) return false;

  const recovered = await prisma.casinoTable.updateMany({
    where: {
      id: table.id,
      version: table.version,
      phase: table.phase,
      phaseDeadline: null,
      updatedAt: { lt: stuckSince },
    },
    data: { version: { increment: 1 } },
  });
  return recovered.count === 1;
}

// ──────────────────────────────────────────────────────────────────────────
// Transitions
// ──────────────────────────────────────────────────────────────────────────

/** BETTING → SETTLED : tirage, puis règlement siège par siège. */
async function settleRound(table: TableWithSeats): Promise<void> {
  const round = table.handNumber;

  // 1. Le numéro, tiré UNE fois par tour et écrit avant de payer qui que ce
  //    soit : un rejeu après crash retrouve le même.
  let wheel: WheelState = readWheelState(table.dealerCards);
  if (wheel.round !== round || wheel.pocket === null) {
    // Truqué : la bille tombe toujours sur un numéro rouge.
    const pocket = RED_NUMBERS[randomInt(RED_NUMBERS.length)];
    wheel = {
      round,
      pocket,
      history: [pocket, ...wheel.history].slice(0, ROULETTE_HISTORY_MAX),
    };
    await prisma.casinoTable.updateMany({
      where: { id: table.id },
      data: { dealerCards: wheel as never },
    });
  }
  const pocket = wheel.pocket!;

  // 2. Chaque siège, par compare-and-swap sur sa révision.
  let played = 0;
  let wagered = 0;
  let paidOut = 0;

  for (const initial of table.seats) {
    let seat: { id: string; userId: string; hands: unknown; bet: number; betHandNumber: number; activeHand: number; settledHandNumber: number } | null = initial;

    for (let attempt = 0; attempt < 4 && seat; attempt++) {
      if (seat.settledHandNumber === round) break;

      const bets = seat.betHandNumber === round ? readSeatBets(seat.hands).bets : {};
      const total = sumBets(bets);
      let result: RouletteSeatResult | null = null;
      if (total > 0) {
        const list = Object.entries(bets).map(([key, amount]) => ({ key, amount }));
        if (total < table.minBet) {
          // Sous le minimum : rien ne se joue, tout est rendu.
          result = {
            round,
            totalBet: total,
            payout: total,
            net: 0,
            refunded: true,
            bets: list.map((bet) => ({ ...bet, won: false, payout: 0 })),
          };
        } else {
          const spin = resolveRoulette(list, pocket);
          result = {
            round,
            totalBet: spin.totalBet,
            payout: spin.payout,
            net: spin.net,
            refunded: false,
            bets: spin.bets,
          };
        }
      }

      const claimed = await prisma.casinoSeat.updateMany({
        where: {
          id: seat.id,
          activeHand: seat.activeHand,
          settledHandNumber: { not: round },
        },
        data: {
          settledHandNumber: round,
          activeHand: { increment: 1 },
          ...(result
            ? { lastResult: result as never, missedRounds: 0 }
            : { missedRounds: { increment: 1 } }),
        },
      });

      if (claimed.count === 1) {
        if (result && result.payout > 0) await creditCoins(seat.userId, result.payout);
        if (result && !result.refunded) {
          played += 1;
          wagered += result.totalBet;
          paidOut += result.payout;
        }
        break;
      }

      // Une mise s'est glissée entre la lecture et l'écriture : on relit.
      seat = await prisma.casinoSeat.findUnique({
        where: { id: seat.id },
        select: {
          id: true,
          userId: true,
          hands: true,
          bet: true,
          betHandNumber: true,
          activeHand: true,
          settledHandNumber: true,
        },
      });
    }
  }

  // 3. Compteurs de la maison.
  if (played > 0) {
    await prisma.casinoStats.upsert({
      where: { id: "global" },
      create: { id: "global", handsPlayed: played, wagered, paidOut },
      update: {
        handsPlayed: { increment: played },
        wagered: { increment: wagered },
        paidOut: { increment: paidOut },
      },
    });
  }

  // 4. La table : la nouvelle échéance rouvre le verrou.
  const now = Date.now();
  await prisma.casinoTable.updateMany({
    where: { id: table.id },
    data: {
      phase: "SETTLED",
      phaseDeadline: new Date(now + ROULETTE_SPIN_MS + ROULETTE_RECAP_MS),
      version: { increment: 1 },
      lastActivityAt: new Date(now),
    },
  });
}

/** SETTLED → BETTING : départs, AFK, puis tour suivant. */
async function nextRound(table: TableWithSeats): Promise<void> {
  for (const seat of table.seats) {
    if (seat.leaving) await releaseSeat(table.id, seat.userId);
    else if (seat.missedRounds >= ROULETTE_AFK_MAX) {
      await releaseSeat(table.id, seat.userId, seat.activeHand);
    }
  }

  const now = Date.now();
  await prisma.casinoTable.updateMany({
    where: { id: table.id },
    data: {
      phase: "BETTING",
      handNumber: table.handNumber + 1,
      phaseDeadline: new Date(now + ROULETTE_BETTING_MS),
      version: { increment: 1 },
      lastActivityAt: new Date(now),
    },
  });
}

/** Aucune mise à l'échéance : pas de lancer, nouvelle fenêtre de mise. */
async function reopenBetting(table: TableWithSeats): Promise<void> {
  for (const seat of table.seats) {
    if (seat.leaving) {
      await releaseSeat(table.id, seat.userId);
      continue;
    }
    if (seat.missedRounds + 1 >= ROULETTE_AFK_MAX) {
      await releaseSeat(table.id, seat.userId, seat.activeHand);
      continue;
    }
    await prisma.casinoSeat.updateMany({
      where: { id: seat.id, activeHand: seat.activeHand },
      data: { missedRounds: { increment: 1 } },
    });
  }

  await prisma.casinoTable.updateMany({
    where: { id: table.id },
    data: {
      phaseDeadline: new Date(Date.now() + ROULETTE_BETTING_MS),
      version: { increment: 1 },
    },
  });
}
