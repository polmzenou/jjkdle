import { dailyIndexes } from "@/lib/rotation";
import type { BoosterKind } from "./boosters";

/**
 * BOUTIQUE : barème des prix et rotation de l'étal exotic. Module PUR (aucune
 * I/O, aucun import Prisma) — donc importable côté client comme côté serveur.
 *
 * Rien n'est stocké en base : l'étal du jour est RECALCULÉ à chaque lecture par
 * `pickDailyExotics`, exactement comme le personnage mystère de JJKdle. Tous les
 * joueurs voient donc la même offre, et le serveur peut revérifier une tentative
 * d'achat sans avoir à faire confiance au client (cf. `lib/cards/shop-store.ts`).
 */

/**
 * Prix d'un booster, par rareté d'enveloppe. C'est LE curseur d'économie de la
 * boutique : à comparer aux gains de fin de partie (`lib/progress/exp-rewards`)
 * et à la valeur de revente d'une carte (`CARD_RARITY_STYLES.sellValue`).
 */
export const BOOSTER_PRICES: Record<BoosterKind, number> = {
  simple: 1_000,
  bronze: 4_000,
  silver: 8_000,
  gold: 13_000,
};

/**
 * Prix d'une carte EXOTIC achetée directement. Volontairement supérieur au
 * booster doré : ici il n'y a aucun hasard, on paie la certitude.
 */
export const EXOTIC_CARD_PRICE = 20_000;

/** Nombre de cartes exotic proposées chaque jour. */
export const DAILY_EXOTIC_COUNT = 3;

/**
 * Sel de la rotation de l'étal. Distinct de celui du daily JJKdle pour que les
 * deux rotations ne soient pas en phase.
 */
const EXOTIC_SALT = "shop-exotic";

/** Prix d'un booster (0 si la clé est inconnue → l'achat sera refusé). */
export function boosterPrice(kind: BoosterKind): number {
  return BOOSTER_PRICES[kind] ?? 0;
}

/**
 * Les cartes exotic en vente le jour `dateKey`.
 *
 * Le pool est TRIÉ PAR ID avant tirage : sans cet ordre stable, un simple
 * changement de tri en amont (ou l'ajout d'un personnage) rebattrait l'étal.
 * Même précaution que `eligibleRoster` pour la cible du jour.
 *
 * Les `count` cartes sont distinctes entre elles ET ne reviennent qu'une fois le
 * pool entièrement écoulé (cf. `dailyIndexes`). Un pool plus petit que `count`
 * est servi en entier plutôt que complété par des doublons.
 */
export function pickDailyExotics<T extends { id: string }>(
  dateKey: string,
  pool: T[],
  count: number = DAILY_EXOTIC_COUNT,
): T[] {
  const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id));
  return dailyIndexes(dateKey, sorted.length, EXOTIC_SALT, count).map(
    (i) => sorted[i]!,
  );
}
