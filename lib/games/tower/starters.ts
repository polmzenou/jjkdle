import type { Character } from "@/data/roster/characters";
import { battleValueOf } from "@/lib/games/battle/battleValues";
import { dailyIndexes } from "@/lib/rotation";
import {
  STARTER_CHOICES,
  STARTER_MAX_VALUE,
  STARTER_MIN_VALUE,
} from "./types";

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
 * Vivier des starters : les personnages faibles à moyens, jamais les têtes
 * d'affiche.
 *
 * Le filtre porte sur `battleValue` et NON sur `tier`, volontairement : le
 * roster JJK est aujourd'hui tieré en pyramide inversée (21 personnages en
 * tier 1 pour un seul en tier 4), donc `tier` n'est pas une échelle de
 * puissance fiable, alors que `battleValue` couvre proprement 2 → 100. Après le
 * re-tierage du roster, on pourra doubler le filtre par `tier` pour la
 * lisibilité — pas avant.
 *
 * Le tri par `id` n'est pas cosmétique : `dailyIndexes` indexe une POSITION.
 * Un vivier dont l'ordre changerait d'un rendu à l'autre servirait des starters
 * différents au même joueur le même jour.
 */
export function starterPool(roster: readonly Character[]): Character[] {
  return roster
    .filter((c) => {
      const value = battleValueOf(c);
      return value >= STARTER_MIN_VALUE && value <= STARTER_MAX_VALUE;
    })
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Les starters du jour `dateKey` ("YYYY-MM-DD").
 *
 * Renvoie moins de `STARTER_CHOICES` entrées si le vivier est trop petit —
 * l'appelant décide alors s'il peut lancer une partie ; ici on ne complète
 * jamais avec un personnage hors bornes, ce qui reviendrait à offrir Gojo au
 * premier étage sur un roster mal rempli.
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
 * celui de Sukuna. C'est la seule chose qui rend la borne de `starterPool`
 * réellement contraignante.
 */
export function isDailyStarter(
  dateKey: string,
  roster: readonly Character[],
  characterId: string,
): boolean {
  return dailyStarters(dateKey, roster).some((c) => c.id === characterId);
}
