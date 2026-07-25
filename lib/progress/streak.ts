import { prisma } from "@/lib/prisma";
import { getCurrentUniverse } from "@/lib/universes/current";
import { todayKey } from "@/lib/games/jjkdle/daily";

/**
 * Streak quotidien JJKdle, PAR UNIVERS (étape 2c : stocké sur
 * `UserUniverseProfile`, plus sur `User`). Le "jour" est défini dans le fuseau
 * de référence Europe/Paris via `todayKey()` (même définition que le perso du
 * jour), ce qui garantit que streak et daily partagent la même frontière de minuit.
 */

const DAY_MS = 86_400_000;

/**
 * Met à jour le streak après la complétion du daily du jour. À n'appeler QUE
 * lorsque l'entrée du jour vient d'être enregistrée. Idempotent : un second
 * appel le même jour est un no-op (lastPlayedAt déjà = aujourd'hui).
 *
 * Note DST : "hier" = maintenant − 24 h reformaté en Europe/Paris. Robuste sauf
 * pendant l'heure de bascule (impact nul côté joueur).
 */
export async function updateJjkdleStreak(
  userId: string,
): Promise<{ streak: number; best: number; firstToday: boolean }> {
  const today = todayKey();
  const yesterday = todayKey(new Date(Date.now() - DAY_MS));
  const { id: universeId } = await getCurrentUniverse();

  return prisma.$transaction(async (tx) => {
    const profile = await tx.userUniverseProfile.findUnique({
      where: { userId_universeId: { userId, universeId } },
      select: {
        jjkdleStreak: true,
        jjkdleBestStreak: true,
        jjkdleLastPlayedAt: true,
      },
    });
    const cur = profile ?? {
      jjkdleStreak: 0,
      jjkdleBestStreak: 0,
      jjkdleLastPlayedAt: null as string | null,
    };

    // Déjà compté aujourd'hui → no-op. `firstToday: false` sert de garde à
    // l'octroi d'EXP (une re-soumission du même daily ne doit rien rapporter).
    if (cur.jjkdleLastPlayedAt === today) {
      return {
        streak: cur.jjkdleStreak,
        best: cur.jjkdleBestStreak,
        firstToday: false,
      };
    }

    const streak = cur.jjkdleLastPlayedAt === yesterday ? cur.jjkdleStreak + 1 : 1;
    const best = Math.max(cur.jjkdleBestStreak, streak);

    await tx.userUniverseProfile.upsert({
      where: { userId_universeId: { userId, universeId } },
      create: {
        userId,
        universeId,
        jjkdleStreak: streak,
        jjkdleBestStreak: best,
        jjkdleLastPlayedAt: today,
      },
      update: {
        jjkdleStreak: streak,
        jjkdleBestStreak: best,
        jjkdleLastPlayedAt: today,
      },
    });
    return { streak, best, firstToday: true };
  });
}
