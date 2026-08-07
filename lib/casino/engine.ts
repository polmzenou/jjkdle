import "server-only";
import { creditCoins } from "@/lib/coins";
import { prisma } from "@/lib/prisma";
import { isPusherConfigured, triggerCasino } from "@/lib/pusher/server";
import { getCasinoConfig } from "./config";
import { CASINO_EVENTS, type TableStatePayload } from "./events";
import { nextPhase } from "./machine";
import { seatWagered } from "./payout";
import { serializeTable, toMachineState } from "./state";
import { findTableByCode, releaseSeat, type TableWithSeats } from "./store";
import { STUCK_MS } from "./rules";
import type { CasinoPhaseValue, CasinoTableView, Transition } from "./types";

/**
 * MOTEUR de la table : applique les transitions et diffuse l'état.
 *
 * ── Pourquoi ce fichier est construit comme ça ────────────────────────────
 * Vercel n'offre ni tâche de fond ni cron ici : une fonction serverless meurt
 * avec sa réponse, donc PERSONNE côté serveur ne peut « attendre 20 secondes
 * puis distribuer ». Ce sont les clients connectés qui réclament l'avancement
 * (`tickTable`), mais un client n'est jamais cru : c'est le serveur qui vérifie
 * que l'échéance est bien passée, et un seul appelant peut l'emporter.
 *
 * Le verrou tient en une seule instruction SQL, sans transaction interactive ni
 * réglage d'isolation — ce qui est indispensable derrière le pooler de Neon.
 */

/** Ce que les actions renvoient au client. */
export type TickResult = CasinoTableView | null;

// ──────────────────────────────────────────────────────────────────────────
// Sérialisation + diffusion
// ──────────────────────────────────────────────────────────────────────────

/** Snapshot d'une table pour un spectateur donné (solde inclus). */
export async function viewFor(
  table: TableWithSeats,
  viewerId: string | null,
): Promise<CasinoTableView> {
  const [config, user] = await Promise.all([
    getCasinoConfig(),
    viewerId
      ? prisma.user.findUnique({
          where: { id: viewerId },
          select: { coins: true },
        })
      : Promise.resolve(null),
  ]);
  return serializeTable(table, viewerId, {
    cardBack: config.cardBack,
    yourCoins: user?.coins ?? 0,
  });
}

/**
 * Diffuse le snapshot à toute la table.
 *
 * ⚠️ Le snapshot diffusé est celui d'un spectateur ANONYME (`viewerId = null`) :
 * il part sur un canal partagé, donc il ne doit contenir le solde de personne.
 * Chaque client réconcilie ensuite son propre `isYou`/`yourCoins` avec le
 * snapshot que ses propres actions lui renvoient.
 *
 * Silencieux si Pusher n'est pas configuré : le solo n'en a pas besoin, et le
 * multi est refusé en amont (cf. actions.ts).
 */
export async function broadcast(table: TableWithSeats): Promise<void> {
  if (!isPusherConfigured()) return;
  if (table.mode === "SOLO") return; // personne d'autre à prévenir
  const payload: TableStatePayload = { table: await viewFor(table, null) };
  try {
    await triggerCasino(table.code, CASINO_EVENTS.tableState, payload);
  } catch {
    // Une diffusion ratée ne doit jamais faire échouer le coup qui vient d'être
    // joué : l'état est déjà en base, et les clients le rattraperont au tick
    // suivant ou à leur prochaine action.
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Application d'une transition
// ──────────────────────────────────────────────────────────────────────────

/**
 * Écrit une transition calculée par la machine : table, sièges, paiements,
 * évictions. La transition est PURE et déjà calculée — ici on ne décide plus
 * rien, on persiste.
 */
export async function applyTransition(
  table: TableWithSeats,
  next: Transition,
): Promise<void> {
  const now = Date.now();

  // ── 1. Paiements, AVANT le reste. ──
  // Deux couches d'idempotence protègent le règlement : le verrou de tick (un
  // seul appelant arrive ici) et `settledHandNumber` (ci-dessous). La seconde
  // est ce qui rend le REJEU d'une transition sûr après un crash.
  //
  // La réclamation porte sur TOUT siège ayant joué la main, pas seulement sur
  // ceux à créditer : un siège perdant n'a aucun paiement, mais sa mise compte
  // dans les stats de la maison. Le réclamer aussi rend ces stats idempotentes,
  // sinon un rejeu recompterait sa mise (et le `paidOut` finissait par dépasser
  // le `wagered`, ce qui est arithmétiquement impossible dans un vrai casino).
  const paidByseat = new Map(next.credits.map((c) => [c.seatId, c]));
  let wagered = 0;
  let paidOut = 0;
  let handsSettled = 0;

  if (next.phase === "SETTLED") {
    for (const seat of next.seats) {
      if (seat.lastResult === null || seat.hands.length === 0) continue;

      const claimed = await prisma.casinoSeat.updateMany({
        where: { id: seat.id, settledHandNumber: { not: next.handNumber } },
        data: { settledHandNumber: next.handNumber },
      });
      if (claimed.count !== 1) continue; // déjà réglé : rejeu, on passe

      const credit = paidByseat.get(seat.id);
      if (credit && credit.amount > 0) {
        await creditCoins(credit.userId, credit.amount);
        paidOut += credit.amount;
      }
      wagered += seatWagered(seat);
      handsSettled += seat.hands.length;
    }
  }

  // ── 2. Stats de la maison (agrégats, pas un registre). ──
  if (wagered > 0 || paidOut > 0) {
    await prisma.casinoStats.upsert({
      where: { id: "global" },
      create: { id: "global", handsPlayed: handsSettled, wagered, paidOut },
      update: {
        handsPlayed: { increment: handsSettled },
        wagered: { increment: wagered },
        paidOut: { increment: paidOut },
      },
    });
  }

  // ── 3. Sièges (mains, mises, compteurs). ──
  for (const seat of next.seats) {
    await prisma.casinoSeat.updateMany({
      where: { id: seat.id },
      data: {
        hands: seat.hands as never,
        activeHand: seat.activeHand,
        bet: seat.bet,
        missedRounds: seat.missedRounds,
        lastResult: (seat.lastResult ?? undefined) as never,
      },
    });
  }

  // ── 4. Évictions (départs, AFK). ──
  for (const seatId of next.evict) {
    const seat = await prisma.casinoSeat.findUnique({
      where: { id: seatId },
      select: { tableId: true, userId: true },
    });
    if (seat) await releaseSeat(seat.tableId, seat.userId);
  }

  // ── 5. La table elle-même. Pose la nouvelle échéance, qui rouvre le verrou. ──
  await prisma.casinoTable.updateMany({
    where: { id: table.id },
    data: {
      phase: next.phase as never,
      handNumber: next.handNumber,
      activeSeat: next.activeSeat,
      dealerCards: next.dealerCards as never,
      shoe: next.shoe as never,
      phaseDeadline:
        next.deadlineMs === null ? null : new Date(now + next.deadlineMs),
      version: { increment: 1 },
      lastActivityAt: new Date(now),
    },
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Le tick
// ──────────────────────────────────────────────────────────────────────────

/**
 * Fait avancer la table d'EXACTEMENT une étape, si son échéance est passée.
 *
 * Le verrou (« claim ») est la pièce porteuse de tout le multijoueur :
 *
 *   UPDATE ... WHERE id = ? AND version = ? AND phase = ? AND phaseDeadline <= now
 *   SET version = version + 1, phaseDeadline = NULL
 *
 * Trois prédicats, un seul gagnant :
 *  - `version` : personne n'a muté la table depuis ma lecture ;
 *  - `phase`   : la phase n'a pas déjà changé ;
 *  - `phaseDeadline <= now` : c'est le SERVEUR qui juge de l'échéance, donc un
 *    client dont l'horloge avance ne peut pas distribuer en avance.
 *
 * `phaseDeadline` passe à NULL dans la MÊME instruction : c'est ça, le verrou.
 * Si cinq clients tickent en même temps, Postgres verrouille la ligne, les
 * perdants réévaluent leur `WHERE` contre la ligne committée — `version` a
 * changé ET `NULL <= now` est faux — et ne matchent plus rien.
 */
export async function tickTable(
  code: string,
  viewerId: string | null,
): Promise<TickResult> {
  const table = await findTableByCode(code);
  if (!table) return null;

  const now = new Date();
  const claimed = await claim(table, now);
  // Course perdue (ou échéance pas encore atteinte) : on ne fait rien et on
  // renvoie l'état tel qu'il est. Ce n'est pas une erreur — c'est le cas normal
  // pour 4 clients sur 5.
  if (!claimed) return viewFor(table, viewerId);

  const next = nextPhase(toMachineState(table), now.getTime());
  await applyTransition(table, next);

  const fresh = await findTableByCode(code);
  if (!fresh) return null;
  await broadcast(fresh);
  return viewFor(fresh, viewerId);
}

/**
 * Tente de prendre le verrou. Deux voies :
 *
 *  a) VOIE NORMALE — l'échéance est passée.
 *
 *  b) REPRISE APRÈS CRASH — la table a `phaseDeadline = NULL` alors qu'elle
 *     devrait tourner : un tick a pris le verrou puis est mort avant d'écrire
 *     (timeout de fonction, redéploiement). Sans cette voie, la table resterait
 *     figée pour toujours. Rejouer est SÛR parce que la transition est une
 *     fonction pure de l'état persisté : elle retire les mêmes cartes du même
 *     sabot, et les paiements sont gardés par `settledHandNumber`.
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

  // Voie (b). Une table SOLO en BETTING/PLAYER_TURNS n'a légitimement aucune
  // échéance (elle attend le joueur) : elle n'est pas bloquée, elle patiente.
  if (table.phaseDeadline !== null) return false;
  if (waitsForPlayer(table)) return false;

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

/** La table attend-elle légitimement une décision du joueur (sans horloge) ? */
function waitsForPlayer(table: TableWithSeats): boolean {
  if (table.mode !== "SOLO") return false;
  const phase = table.phase as CasinoPhaseValue;
  return phase === "BETTING" || phase === "PLAYER_TURNS" || phase === "SETTLED";
}

/**
 * Force l'avancement immédiat d'une table, sans attendre son échéance.
 *
 * Utilisé quand un ÉVÉNEMENT rend l'attente inutile : tout le monde a misé,
 * ou le dernier joueur vient de jouer son coup. On n'exige alors pas
 * `phaseDeadline <= now`, mais on garde la garde de `version` — donc toujours un
 * seul gagnant.
 */
export async function advanceNow(
  code: string,
  viewerId: string | null,
): Promise<TickResult> {
  const table = await findTableByCode(code);
  if (!table) return null;

  const claimed = await prisma.casinoTable.updateMany({
    where: { id: table.id, version: table.version, phase: table.phase },
    data: { version: { increment: 1 }, phaseDeadline: null },
  });
  if (claimed.count !== 1) return viewFor(table, viewerId);

  const next = nextPhase(toMachineState(table), Date.now());
  await applyTransition(table, next);

  const fresh = await findTableByCode(code);
  if (!fresh) return null;
  await broadcast(fresh);
  return viewFor(fresh, viewerId);
}
