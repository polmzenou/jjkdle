import { prisma } from "@/lib/prisma";
// Le débit atomique vivait ici en privé ; il est parti dans lib/coins.ts quand
// le casino a eu besoin de la même règle (une seule implémentation du débit).
import { creditCoins as refundCoins, debitCoins } from "@/lib/coins";
import { getRoster } from "@/lib/content/queries";
import { msUntilMidnight, todayKey } from "@/lib/games/jjkdle/daily";
import type { Character } from "@/data/roster/characters";
import {
  BOOSTERS,
  BOOSTER_KINDS,
  isBoosterKind,
  type BoosterKind,
} from "./boosters";
import { rarityOfTier } from "./rarity";
import {
  BOOSTER_PRICES,
  EXOTIC_CARD_PRICE,
  boosterPrice,
  pickDailyExotics,
} from "./shop";
import { createBooster, getOwnedCharacterIds, grantCard, toCardView } from "./store";
import type { CardView, ShopExoticOffer, ShopWindow } from "./types";

/**
 * Couche d'accès de la BOUTIQUE. Module server-only (importe Prisma).
 *
 * Aucune table dédiée : un achat de booster écrit un `UserBooster` (exactement
 * comme un drop de fin de partie, avec `source = "shop"`), un achat de carte
 * écrit un `UserCard`. L'étal exotic n'est pas stocké non plus — il est
 * recalculé depuis la date, ce qui permet à chaque écriture de REVÉRIFIER que la
 * carte demandée est bien en vente aujourd'hui.
 */

/** Ce que renvoie un achat : le message d'erreur est destiné au joueur. */
export type PurchaseResult = { ok: boolean; error?: string };

// ──────────────────────────────────────────────────────────────────────────
// Lecture
// ──────────────────────────────────────────────────────────────────────────

/** Une ligne de teasing par booster, pour que le prix se justifie en rayon. */
const BOOSTER_PERKS: Record<BoosterKind, string> = {
  simple: "Taux de base, sans garantie.",
  bronze: "Une carte UNCOMMON minimum garantie.",
  silver: "Taux boostés sur les 3 cartes.",
  gold: "4 cartes, dont une EPIC ou LEGENDARY garantie.",
};

/** Les personnages EXOTIC (tier `s`) de l'univers, tels qu'ils sont en base. */
async function exoticPool(universeId: string): Promise<Character[]> {
  const roster = await getRoster(universeId);
  return roster.filter((c) => rarityOfTier(c.tier) === "exotic");
}

/**
 * L'étal exotic du jour. C'est la SEULE définition de « ce qui est en vente » :
 * la page et les achats l'appellent tous les deux, donc un client ne peut pas
 * acheter une carte qui n'y figure pas (ni la carte d'hier, ni une exotic hors
 * rotation).
 */
export async function getDailyExotics(
  universeId: string,
  dateKey: string = todayKey(),
): Promise<CardView[]> {
  const pool = await exoticPool(universeId);
  return pickDailyExotics(dateKey, pool).map(toCardView);
}

/** Tout le contenu de la page boutique, pour un joueur donné. */
export async function getShopWindow(
  userId: string,
  universeId: string,
): Promise<ShopWindow> {
  const dateKey = todayKey();
  const [user, exotics, owned] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { coins: true } }),
    getDailyExotics(universeId, dateKey),
    getOwnedCharacterIds(userId, universeId),
  ]);

  const offers: ShopExoticOffer[] = exotics.map((card) => ({
    ...card,
    price: EXOTIC_CARD_PRICE,
    owned: owned.has(card.characterId),
  }));

  return {
    coins: user?.coins ?? 0,
    boosters: BOOSTER_KINDS.map((kind) => {
      const def = BOOSTERS[kind];
      return {
        kind,
        label: def.label,
        accent: def.accent,
        cardCount: def.cardCount,
        price: BOOSTER_PRICES[kind],
        perk: BOOSTER_PERKS[kind],
      };
    }),
    exotics: offers,
    dateKey,
    msUntilRotation: msUntilMidnight(),
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Achats
// ──────────────────────────────────────────────────────────────────────────

/**
 * Achète un booster. Il est créé NON OUVERT, comme un drop : si le joueur ferme
 * l'onglet avant l'animation, son booster l'attend dans « Mon deck » — un achat
 * n'est jamais perdu.
 *
 * En cas d'échec de création (base indisponible), le débit est remboursé : on ne
 * prend pas l'argent sans livrer.
 */
export async function buyBooster(
  userId: string,
  universeId: string,
  kind: string,
): Promise<PurchaseResult & { boosterId?: string }> {
  if (!isBoosterKind(kind)) return { ok: false, error: "Booster inconnu." };

  const price = boosterPrice(kind);
  if (price <= 0) return { ok: false, error: "Ce booster n'est pas en vente." };

  if (!(await debitCoins(userId, price))) {
    return { ok: false, error: "Tu n'as pas assez de coins." };
  }

  try {
    const booster = await createBooster(userId, universeId, kind, "shop");
    return { ok: true, boosterId: booster.id };
  } catch {
    await refundCoins(userId, price);
    return { ok: false, error: "Achat impossible pour le moment. Rien n'a été débité." };
  }
}

/**
 * Achète une carte exotic de l'étal du jour.
 *
 * Trois vérifications, toutes REFAITES ici (le client n'est cru sur rien) :
 * la carte est bien à l'étal AUJOURD'HUI, elle n'est pas déjà possédée, et le
 * solde couvre le prix. `grantCard` étant idempotent, un double clic ne peut pas
 * facturer deux fois : le second achat voit `created: false` et est remboursé.
 */
export async function buyExoticCard(
  userId: string,
  universeId: string,
  characterId: string,
): Promise<PurchaseResult & { card?: CardView }> {
  if (typeof characterId !== "string" || !characterId) {
    return { ok: false, error: "Carte inconnue." };
  }

  const offer = (await getDailyExotics(universeId)).find(
    (card) => card.characterId === characterId,
  );
  if (!offer) {
    return { ok: false, error: "Cette carte n'est plus en vente aujourd'hui." };
  }

  const owned = await getOwnedCharacterIds(userId, universeId);
  if (owned.has(characterId)) {
    return { ok: false, error: "Tu possèdes déjà cette carte." };
  }

  if (!(await debitCoins(userId, EXOTIC_CARD_PRICE))) {
    return { ok: false, error: "Tu n'as pas assez de coins." };
  }

  const { created } = await grantCard(userId, characterId);
  if (!created) {
    // Course : la carte est arrivée en collection entre la lecture et l'écriture.
    await refundCoins(userId, EXOTIC_CARD_PRICE);
    return { ok: false, error: "Tu possèdes déjà cette carte." };
  }

  return { ok: true, card: offer };
}
