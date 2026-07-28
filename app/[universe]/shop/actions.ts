"use server";

import { getCurrentUser } from "@/lib/auth/session";
import {
  getCurrentUniverse,
  revalidateUniversePath,
} from "@/lib/universes/current";
import { buyBooster, buyExoticCard } from "@/lib/cards/shop-store";
import type { CardView } from "@/lib/cards/types";

/**
 * Server actions de la BOUTIQUE.
 *
 * Elles ne font que l'authentification, la résolution de l'univers courant et la
 * revalidation : toute la logique d'achat (prix, étal du jour, débit atomique,
 * remboursement) vit dans `lib/cards/shop-store.ts`, qui ne fait confiance à
 * aucune valeur venue du client.
 */

export type ShopActionResult = { ok: boolean; error?: string };

/** Revalide les trois pages où un achat se voit (solde, deck, profil public). */
async function revalidateAfterPurchase(username: string): Promise<void> {
  await revalidateUniversePath("/shop");
  await revalidateUniversePath("/account/deck");
  await revalidateUniversePath(`/u/${encodeURIComponent(username)}`);
}

/**
 * Achète un booster. Renvoie son id pour que la boutique enchaîne sur
 * l'animation d'ouverture (`openBoosterAction`) — mais le booster existe déjà
 * en base, donc quitter la page avant l'ouverture ne le perd pas.
 */
export async function buyBoosterAction(
  kind: string,
): Promise<ShopActionResult & { boosterId?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Connecte-toi pour acheter un booster." };

  const universe = await getCurrentUniverse();
  const res = await buyBooster(user.id, universe.id, kind);
  if (!res.ok) return { ok: false, ...(res.error ? { error: res.error } : {}) };

  await revalidateAfterPurchase(user.username);
  return { ok: true, ...(res.boosterId ? { boosterId: res.boosterId } : {}) };
}

/** Achète une carte exotic de l'étal du jour. */
export async function buyExoticCardAction(
  characterId: string,
): Promise<ShopActionResult & { card?: CardView }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Connecte-toi pour acheter une carte." };

  const universe = await getCurrentUniverse();
  const res = await buyExoticCard(user.id, universe.id, characterId);
  if (!res.ok) return { ok: false, ...(res.error ? { error: res.error } : {}) };

  await revalidateAfterPurchase(user.username);
  return { ok: true, ...(res.card ? { card: res.card } : {}) };
}
