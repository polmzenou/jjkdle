"use server";

import { randomInt } from "node:crypto";
import { creditCoins, debitCoins, getCoins } from "@/lib/coins";
import { prisma } from "@/lib/prisma";
import { getCasinoConfig } from "./config";
import { COIN_SIDES, isCoinSide, resolveFlip, type CoinSide, type CoinflipResult } from "./coinflip";
import { casinoAccess } from "./guard";

/**
 * Server Action du PILE OU FACE. Une seule action : tout le jeu tient dedans.
 *
 * Le serveur est autoritaire de bout en bout, comme à la table de blackjack : le
 * client envoie une mise et un camp, il ne décide de rien. Il ne reçoit le
 * résultat qu'une fois la pièce tombée ET le solde à jour — l'animation de la
 * pièce qui tourne est du décor joué pendant l'attente, jamais un tirage local
 * que le serveur viendrait confirmer.
 *
 * Pas de `revalidatePath` : l'action renvoie le solde à jour et le composant
 * client s'en sert directement. Revalider referait tout l'arbre RSC à chaque
 * lancer, sur un jeu où l'on enchaîne les manches en quelques secondes (même
 * raisonnement que dans ./actions.ts).
 */

export type CoinflipActionResult =
  | { ok: true; flip: CoinflipResult; coins: number }
  | { ok: false; error: string; needsAuth?: boolean };

/**
 * Lance la pièce.
 *
 * L'ORDRE des opérations est ce qui rend le lancer sûr côté coins :
 *
 *   1. portillon      (session + casino ouvert)
 *   2. validation     (entier, au-dessus du minimum de la maison)
 *   3. débit ATOMIQUE (c'est la base qui arbitre le solde, jamais une lecture)
 *   4. tirage         (après le débit : une pièce ne tombe que sur une mise encaissée)
 *   5. crédit du gain (mise incluse, cf. la convention de ./coinflip)
 *   6. compteurs      (agrégats de la maison, partagés avec le blackjack)
 *
 * Tirer avant de débiter laisserait un lancer perdant sans mise si le solde ne
 * suivait pas — autrement dit un jeu où l'on ne peut que gagner. Et lire le
 * solde pour décider, plutôt que de laisser le `WHERE` de `debitCoins`
 * l'arbitrer, ouvrirait la fenêtre classique : deux lancers concurrents misant
 * deux fois les mêmes coins.
 */
export async function flipCoinAction(
  amount: number,
  side: CoinSide,
): Promise<CoinflipActionResult> {
  // 1. Portillon.
  const access = await casinoAccess();
  if (!access.ok) return access;

  // 2. Validation. Le camp reçu du client est revalidé : `"PILE" as CoinSide`
  //    côté appelant ne prouve rien une fois la requête sérialisée.
  if (!isCoinSide(side)) {
    return { ok: false, error: "Choisis pile ou face." };
  }
  const { minBet } = await getCasinoConfig();
  const bet = Math.round(Number(amount));
  if (!Number.isFinite(bet) || bet < minBet) {
    return {
      ok: false,
      error: `Mise minimale : ${minBet.toLocaleString("fr-FR")} coins.`,
    };
  }

  // 3. Débit.
  if (!(await debitCoins(access.userId, bet))) {
    return { ok: false, error: "Tu n'as pas assez de coins." };
  }

  // 4. Tirage. `randomInt` (node:crypto) et non `Math.random` : le mélange des
  //    sabots peut se contenter d'un PRNG, une pièce qui décide seule d'une mise
  //    non. Le tirage est équilibré à la source — l'avantage de la maison est
  //    ailleurs, dans le multiplicateur (cf. COINFLIP_MULTIPLIER).
  const landed = COIN_SIDES[randomInt(COIN_SIDES.length)]!;
  const flip = resolveFlip(bet, side, landed);

  // 5. Crédit du gain (mise incluse).
  if (flip.payout > 0) await creditCoins(access.userId, flip.payout);

  // 6. Compteurs de la maison. Les MÊMES que le blackjack : la marge affichée en
  //    admin est celle du casino entier, pas d'une table. Un lancer y compte pour
  //    une « main » jouée.
  await prisma.casinoStats.upsert({
    where: { id: "global" },
    create: { id: "global", handsPlayed: 1, wagered: bet, paidOut: flip.payout },
    update: {
      handsPlayed: { increment: 1 },
      wagered: { increment: bet },
      paidOut: { increment: flip.payout },
    },
  });

  return { ok: true, flip, coins: await getCoins(access.userId) };
}
