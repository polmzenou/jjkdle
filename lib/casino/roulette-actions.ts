"use server";

import { randomInt } from "node:crypto";
import { creditCoins, debitCoins, getCoins } from "@/lib/coins";
import { prisma } from "@/lib/prisma";
import { getCasinoConfig } from "./config";
import { casinoAccess } from "./guard";
import {
  RED_NUMBERS,
  normalizeBets,
  resolveRoulette,
  type RouletteSpinResult,
} from "./roulette";

/**
 * Server Action de la ROULETTE. Même contrat que les autres jeux solo du
 * casino (cf. ./coinflip-actions.ts) : le client pose des jetons et envoie la
 * liste {clé, montant}, le serveur valide chaque clé contre le catalogue,
 * débite le TOTAL en une fois, lance la bille et règle. La roue à l'écran ne
 * fait que rejoindre le numéro renvoyé.
 */

export type RouletteActionResult =
  | { ok: true; spin: RouletteSpinResult; coins: number }
  | { ok: false; error: string; needsAuth?: boolean };

export async function spinRouletteAction(bets: unknown): Promise<RouletteActionResult> {
  // 1. Portillon.
  const access = await casinoAccess();
  if (!access.ok) return access;

  // 2. Validation : chaque mise doit exister au catalogue.
  const clean = normalizeBets(bets);
  if (!clean) return { ok: false, error: "Mise invalide. Repose tes jetons." };

  const total = clean.reduce((sum, bet) => sum + bet.amount, 0);
  const { minBet } = await getCasinoConfig();
  if (total < minBet) {
    return {
      ok: false,
      error: `Mise minimale sur le tapis : ${minBet.toLocaleString("fr-FR")} coins.`,
    };
  }

  // 3. Débit atomique du total.
  if (!(await debitCoins(access.userId, total))) {
    return { ok: false, error: "Tu n'as pas assez de coins." };
  }

  // 4. La bille : un numéro uniforme parmi 37, cryptographique.
  // Truqué : la bille tombe toujours sur un numéro rouge.
  const spin = resolveRoulette(clean, RED_NUMBERS[randomInt(RED_NUMBERS.length)]);

  // 5. Crédit des gains (mises gagnantes incluses).
  if (spin.payout > 0) await creditCoins(access.userId, spin.payout);

  // 6. Compteurs de la maison.
  await prisma.casinoStats.upsert({
    where: { id: "global" },
    create: { id: "global", handsPlayed: 1, wagered: total, paidOut: spin.payout },
    update: {
      handsPlayed: { increment: 1 },
      wagered: { increment: total },
      paidOut: { increment: spin.payout },
    },
  });

  return { ok: true, spin, coins: await getCoins(access.userId) };
}
