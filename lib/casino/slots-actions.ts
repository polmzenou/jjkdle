"use server";

import { randomInt } from "node:crypto";
import { creditCoins, debitCoins, getCoins } from "@/lib/coins";
import { prisma } from "@/lib/prisma";
import { getCasinoConfig } from "./config";
import { casinoAccess } from "./guard";
import { REEL_STRIPS, resolveSpin, type SlotSpinResult } from "./slots";

/**
 * Server Action de la MACHINE À SOUS. Même contrat que le pile ou face
 * (cf. ./coinflip-actions.ts) : le client envoie une mise, le serveur tire les
 * arrêts des rouleaux, règle, et renvoie le résultat avec le solde à jour. Les
 * rouleaux qui défilent à l'écran ne font que rejoindre les arrêts renvoyés.
 */

export type SlotsActionResult =
  | { ok: true; spin: SlotSpinResult; coins: number }
  | { ok: false; error: string; needsAuth?: boolean };

export async function spinSlotsAction(amount: number): Promise<SlotsActionResult> {
  // 1. Portillon.
  const access = await casinoAccess();
  if (!access.ok) return access;

  // 2. Validation.
  const { minBet } = await getCasinoConfig();
  const bet = Math.round(Number(amount));
  if (!Number.isFinite(bet) || bet < minBet) {
    return {
      ok: false,
      error: `Mise minimale : ${minBet.toLocaleString("fr-FR")} coins.`,
    };
  }

  // 3. Débit atomique (c'est la base qui arbitre le solde).
  if (!(await debitCoins(access.userId, bet))) {
    return { ok: false, error: "Tu n'as pas assez de coins." };
  }

  // 4. Tirage : un arrêt uniforme par rouleau, cryptographique. L'avantage de la
  //    maison est dans la composition des bandes et la table de gains
  //    (cf. SLOTS_RTP), jamais dans un tirage biaisé.
  const stops = REEL_STRIPS.map((strip) => randomInt(strip.length));
  const spin = resolveSpin(bet, stops);

  // 5. Crédit du gain (mise incluse).
  if (spin.payout > 0) await creditCoins(access.userId, spin.payout);

  // 6. Compteurs de la maison, partagés avec les autres jeux.
  await prisma.casinoStats.upsert({
    where: { id: "global" },
    create: { id: "global", handsPlayed: 1, wagered: bet, paidOut: spin.payout },
    update: {
      handsPlayed: { increment: 1 },
      wagered: { increment: bet },
      paidOut: { increment: spin.payout },
    },
  });

  return { ok: true, spin, coins: await getCoins(access.userId) };
}
