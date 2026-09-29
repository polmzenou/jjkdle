"use server";

import { getCurrentUser } from "@/lib/auth/session";
import {
  getCurrentUniverse,
  revalidateUniversePath,
} from "@/lib/universes/current";
import { buyBooster, buyExoticCard } from "@/lib/cards/shop-store";
import type { CardView } from "@/lib/cards/types";
import { spinRoulette } from "@/lib/roulette/store";
import type { SpinOutcome } from "@/lib/roulette/types";

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

/**
 * Un tour de la roulette de l'univers courant. `paid` = le joueur accepte de
 * payer 100 coins parce que son tour gratuit n'est pas rechargé. Le lot est
 * tiré ET livré côté serveur ; le client ne fait qu'animer la roue jusqu'à
 * `outcome.slotIndex`.
 */
export async function spinRouletteAction(
  paid: boolean,
): Promise<ShopActionResult & { outcome?: SpinOutcome }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Connecte-toi pour tourner la roue." };

  const universe = await getCurrentUniverse();
  const res = await spinRoulette(user.id, universe.id, paid === true);
  if (!res.ok) return { ok: false, error: res.error };

  await revalidateAfterPurchase(user.username);
  return { ok: true, outcome: res.outcome };
}
