import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * PORTEMONNAIE — point de passage unique de tout mouvement de coins.
 *
 * `User.coins` est GLOBAL (ni par univers, ni par jeu). Il se gagne en fin de
 * partie (`awardExp`, lib/progress/recompute.ts), à l'ouverture d'un booster et
 * à la revente d'une carte (lib/cards/store.ts), et au casino ; il se dépense à
 * la boutique (lib/cards/shop-store.ts) et en mise au casino (lib/casino/).
 * Il circule aussi entre amis (`transferCoins`, envoi direct sans contrepartie).
 *
 * Ces deux fonctions vivaient en privé dans lib/cards/shop-store.ts. Elles en
 * sont sorties quand le casino est arrivé : deux implémentations du débit
 * auraient été deux occasions de se tromper sur la règle qui suit.
 *
 * ⚠️ Il n'y a PAS de registre de transactions. Un débit et son crédit de
 * compensation ne laissent aucune trace : c'est un choix assumé, mais il rend
 * l'ORDRE des opérations critique côté appelant — débiter d'abord, livrer
 * ensuite, et rembourser si la livraison échoue (cf. `buyBooster`).
 */

/**
 * Solde maximal. La colonne est un double : exacte jusqu'à 2^53 ≈ 9e15. On
 * plafonne à 1e15 (un million de milliards) pour garder une marge confortable :
 * au-delà, un crédit est simplement écrêté au lieu de perdre en précision.
 */
export const MAX_COINS = 1_000_000_000_000_000;

/**
 * Débite le compte, ATOMIQUEMENT.
 *
 * La condition `coins >= amount` fait partie du `WHERE` de l'écriture : deux
 * débits concurrents sur le même solde ne peuvent pas passer tous les deux (le
 * second ne matche plus aucune ligne). On ne lit JAMAIS le solde pour décider —
 * c'est la base qui arbitre, sinon la fenêtre entre la lecture et l'écriture
 * laisserait dépenser deux fois les mêmes coins.
 *
 * @returns true si le compte a bien été débité, false si le solde ne suffisait pas.
 */
export async function debitCoins(
  userId: string,
  amount: number,
): Promise<boolean> {
  if (!Number.isSafeInteger(amount) || amount <= 0) return false;
  const res = await prisma.user.updateMany({
    where: { id: userId, coins: { gte: amount } },
    data: { coins: { decrement: amount } },
  });
  return res.count === 1;
}

/**
 * Crédite le compte. Sert aussi bien au gain (paiement d'une main, revente,
 * doublon) qu'au REMBOURSEMENT d'un débit dont la contrepartie n'a pas pu être
 * livrée : on ne prend pas l'argent sans livrer.
 *
 * Aucune garde d'idempotence ici — un crédit est inconditionnel par nature.
 * C'est à l'appelant de ne l'appeler qu'une fois (cf. `settledHandNumber` au
 * casino, `openedAt` pour un booster).
 */
export async function creditCoins(
  userId: string,
  amount: number,
): Promise<void> {
  if (!Number.isFinite(amount) || amount <= 0) return;
  const credit = Math.min(Math.round(amount), MAX_COINS);
  await prisma.user.update({
    where: { id: userId },
    data: { coins: { increment: credit } },
  });
  // Écrêtage au plafond (rare : ne coûte une requête que s'il y a dépassement).
  await prisma.user.updateMany({
    where: { id: userId, coins: { gt: MAX_COINS } },
    data: { coins: MAX_COINS },
  });
}

/**
 * Envoi de coins d'un joueur à un autre (don entre amis, cf.
 * lib/social/coins-transfer.ts), en UNE transaction : débit atomique (même
 * règle que `debitCoins`), crédit écrêté à `MAX_COINS`, et les deux
 * notifications du hub social (`COINS_SENT` / `COINS_RECEIVED`). Si le débit
 * échoue, rien n'est écrit.
 *
 * @returns true si le transfert a eu lieu, false si le solde ne suffisait pas.
 */
export async function transferCoins(
  fromId: string,
  toId: string,
  amount: number,
): Promise<boolean> {
  if (!Number.isSafeInteger(amount) || amount <= 0 || fromId === toId) return false;
  return prisma.$transaction(async (tx) => {
    const debit = await tx.user.updateMany({
      where: { id: fromId, coins: { gte: amount } },
      data: { coins: { decrement: amount } },
    });
    if (debit.count !== 1) return false;
    await tx.user.update({
      where: { id: toId },
      data: { coins: { increment: Math.min(amount, MAX_COINS) } },
    });
    await tx.user.updateMany({
      where: { id: toId, coins: { gt: MAX_COINS } },
      data: { coins: MAX_COINS },
    });
    await tx.notification.createMany({
      data: [
        { userId: fromId, kind: "COINS_SENT", actorId: toId, amount },
        { userId: toId, kind: "COINS_RECEIVED", actorId: fromId, amount },
      ],
    });
    return true;
  });
}

/** Solde courant, 0 si l'utilisateur n'existe pas. */
export async function getCoins(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { coins: true },
  });
  return user?.coins ?? 0;
}
