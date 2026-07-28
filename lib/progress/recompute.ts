import { prisma } from "@/lib/prisma";
import { xpToLevel } from "./xp";
import { coinsForExp } from "./exp-rewards";
import { evaluateBadges } from "@/lib/badges/evaluate";
import { getCurrentUniverse } from "@/lib/universes/current";
import { BOOSTER_DROP_CHANCE, type BoosterKind } from "@/lib/cards/boosters";
import { rollBoosterKind } from "@/lib/cards/roll";
import { createBooster, getDeckMultipliers } from "@/lib/cards/store";
import { NO_DECK_BONUS } from "@/lib/cards/deck";

/**
 * Progression ACCUMULATIVE : `User.totalXp` est la source de vérité unique. Il
 * grandit de l'EXP gagnée à chaque partie (`awardExp`) et n'est jamais recalculé
 * depuis les meilleurs scores. Le niveau en dérive via `xpToLevel` (courbe dans
 * xp.ts). Les badges restent dérivés des scores/streaks (evaluateBadges).
 */

export interface ProgressResult {
  newBadges: string[];
  level: number;
  totalXp: number;
}

/** Booster tombé en fin de partie, à afficher sur l'écran de fin. */
export interface DroppedBooster {
  id: string;
  kind: BoosterKind;
}

/**
 * Univers de la requête courante, ou `null` hors contexte HTTP (scripts de
 * seed, tests). Sans univers : ni bonus de deck ni drop de booster, on retombe
 * exactement sur le comportement d'avant les cartes.
 */
async function currentUniverseOrNull(): Promise<{ id: string } | null> {
  try {
    return await getCurrentUniverse();
  } catch {
    return null;
  }
}

/**
 * Ajoute `gainedExp` au total du joueur, crédite les coins correspondants,
 * recalcule le niveau et débloque les badges nouvellement mérités. À appeler en
 * fin de partie avec le montant du barème (`lib/progress/exp-rewards`). Un gain
 * ≤ 0 n'ajoute rien mais réévalue quand même les badges.
 *
 * C'est le point d'entrée UNIQUE de tous les jeux : les coins étant dérivés de
 * l'EXP (`coinsForExp`), et le loot des cartes étant branché ici, aucun jeu n'a
 * à s'occuper ni de la monnaie ni des boosters.
 *
 * Deux effets liés aux cartes :
 *  - le DECK équipé de l'univers applique ses multiplicateurs d'XP et de coins ;
 *  - une partie sur deux fait tomber un booster (`BOOSTER_DROP_CHANCE`), créé
 *    NON OUVERT en base — il survit donc à la fermeture de l'écran de fin.
 *
 * `gameId` n'est que la traçabilité de l'origine du booster ; il ne change rien
 * au tirage. Chaque appelant garantit déjà l'appel unique par partie (session
 * consommée, `updateMany` gardé, `firstToday`…), donc un seul drop par partie.
 */
export async function awardExp(
  userId: string,
  gainedExp: number,
  gameId?: string,
): Promise<
  ProgressResult & {
    gained: number;
    gainedCoins: number;
    droppedBooster: DroppedBooster | null;
  }
> {
  const universe = await currentUniverseOrNull();

  // Bonus de deck : appliqué à l'XP, puis une SECONDE fois aux coins (qui en
  // dérivent). C'est voulu — c'est ce qui rend un deck de haute rareté désirable.
  const bonus = universe
    ? await getDeckMultipliers(userId, universe.id)
    : NO_DECK_BONUS;

  const base = Math.max(0, Math.round(gainedExp));
  const gained = Math.round(base * bonus.xp);
  const gainedCoins = Math.round(coinsForExp(gained) * bonus.coin);

  const user = await prisma.user.update({
    where: { id: userId },
    data:
      gained > 0
        ? { totalXp: { increment: gained }, coins: { increment: gainedCoins } }
        : {},
    select: { totalXp: true },
  });

  const totalXp = Math.max(0, user.totalXp);
  const { level } = xpToLevel(totalXp);

  await prisma.user.update({
    where: { id: userId },
    data: { level },
  });

  // Le drop ne dépend PAS du score : une partie perdue loote comme une gagnée.
  let droppedBooster: DroppedBooster | null = null;
  if (universe && Math.random() < BOOSTER_DROP_CHANCE) {
    droppedBooster = await createBooster(
      userId,
      universe.id,
      rollBoosterKind(),
      gameId ?? "unknown",
    );
  }

  const newBadges = await evaluateBadges(userId);
  return { newBadges, level, totalXp, gained, gainedCoins, droppedBooster };
}

/**
 * Recalcule niveau + badges à partir du `totalXp` COURANT, sans le modifier.
 * Non destructif : sert aux actions admin qui ont déjà fixé `totalXp` (bonus,
 * niveau cible).
 */
export async function refreshLevelAndBadges(
  userId: string,
): Promise<ProgressResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totalXp: true },
  });
  const totalXp = Math.max(0, user?.totalXp ?? 0);
  const { level } = xpToLevel(totalXp);

  await prisma.user.update({
    where: { id: userId },
    data: { level },
  });

  const newBadges = await evaluateBadges(userId);
  return { newBadges, level, totalXp };
}
