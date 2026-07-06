import type { Character } from "@/data/roster/characters";
import { getForcedTarget } from "@/lib/config/app-config";
import { eligibleRoster, pickDailyTarget, todayKey } from "./daily";

/**
 * Résolution SERVEUR de la cible du jour, avec prise en compte de l'override
 * admin (`jjkdle.forcedTarget`). Le module pur `daily.ts` reste sans dépendance
 * serveur (testable) ; cette couche y ajoute la lecture de config.
 *
 * Si un `forcedTarget` est défini ET correspond à un perso ÉLIGIBLE (complet),
 * il prime sur le tirage déterministe — pour tests uniquement. Sinon on retombe
 * sur `pickDailyTarget` (tirage déterministe partagé par tous les joueurs).
 */
export async function resolveDailyTarget(
  roster: Character[],
  dateKey: string = todayKey(),
): Promise<Character | null> {
  const eligible = eligibleRoster(roster);
  const forcedId = await getForcedTarget();
  if (forcedId) {
    const forced = eligible.find((c) => c.id === forcedId);
    if (forced) return forced;
  }
  return pickDailyTarget(dateKey, eligible);
}
