import type { Character } from "@/data/roster/characters";
import { dailyIndexes } from "@/lib/rotation";
import { STARTER_CHOICES } from "./types";

/**
 * Starters du jour — module PUR.
 *
 * Trois personnages proposés, identiques pour tous les joueurs, renouvelés à
 * minuit Europe/Paris. Le joueur en prend UN : son escouade démarre à 1 sur 3.
 *
 * On réutilise `dailyIndexes` (lib/rotation), la primitive qui sert déjà au
 * personnage mystère de JJKdle et à l'étal exotic de la boutique : rotation
 * déterministe, anti-répétition garantie, et surtout AUCUN état persisté — il
 * n'y a rien à stocker ni à purger pour savoir quels étaient les starters d'un
 * jour donné.
 */

/** Sel de rotation, distinct de ceux de JJKdle et de la boutique. */
export const STARTER_SALT = "tower-starter";

/**
 * Vivier des starters : le roster ENTIER, sans filtre de puissance.
 *
 * Le tirage est volontairement aléatoire sur tout le roster : un jour on part
 * avec des seconds couteaux, un autre avec une tête d'affiche. L'ancien filtre
 * par `battleValue` (18 → 40) ne servait que des personnages de tier 4 / 4−.
 *
 * Le tri par `id` n'est pas cosmétique : `dailyIndexes` indexe une POSITION.
 * Un vivier dont l'ordre changerait d'un rendu à l'autre servirait des starters
 * différents au même joueur le même jour.
 */
export function starterPool(roster: readonly Character[]): Character[] {
  return roster.slice().sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Les starters du jour `dateKey` ("YYYY-MM-DD").
 *
 * Renvoie moins de `STARTER_CHOICES` entrées si le roster est trop petit —
 * l'appelant décide alors s'il peut lancer une partie.
 */
export function dailyStarters(
  dateKey: string,
  roster: readonly Character[],
): Character[] {
  const pool = starterPool(roster);
  if (pool.length === 0) return [];

  return dailyIndexes(dateKey, pool.length, STARTER_SALT, STARTER_CHOICES).map(
    (index) => pool[index],
  );
}

/**
 * Le personnage choisi est-il bien un starter du jour ?
 *
 * Garde serveur : le client envoie un id, et rien n'empêcherait d'y glisser
 * celui d'un personnage qui n'est pas proposé aujourd'hui.
 */
export function isDailyStarter(
  dateKey: string,
  roster: readonly Character[],
  characterId: string,
): boolean {
  return dailyStarters(dateKey, roster).some((c) => c.id === characterId);
}
