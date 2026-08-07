import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * PORTEMONNAIE — point de passage unique de tout mouvement de coins.
 *
 * `User.coins` est GLOBAL (ni par univers, ni par jeu). Il se gagne en fin de
 * partie (`awardExp`, lib/progress/recompute.ts), à l'ouverture d'un booster et
 * à la revente d'une carte (lib/cards/store.ts), et au casino ; il se dépense à
 * la boutique (lib/cards/shop-store.ts) et en mise au casino (lib/casino/).
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
  if (!Number.isFinite(amount) || amount <= 0) return false;
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
  await prisma.user.update({
    where: { id: userId },
    data: { coins: { increment: Math.round(amount) } },
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
