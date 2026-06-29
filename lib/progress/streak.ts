import { prisma } from "@/lib/prisma";
import { todayKey } from "@/lib/games/jjkdle/daily";

/**
 * Streak quotidien JJKdle. Le "jour" est défini dans le fuseau de référence
 * Europe/Paris via `todayKey()` (même définition que le perso du jour), ce qui
 * garantit que streak et daily partagent la même frontière de minuit.
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
): Promise<{ streak: number; best: number }> {
  const today = todayKey();
  const yesterday = todayKey(new Date(Date.now() - DAY_MS));

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        jjkdleStreak: true,
        jjkdleBestStreak: true,
        jjkdleLastPlayedAt: true,
      },
    });
    if (!user) return { streak: 0, best: 0 };

    // Déjà compté aujourd'hui → no-op.
    if (user.jjkdleLastPlayedAt === today) {
      return { streak: user.jjkdleStreak, best: user.jjkdleBestStreak };
    }

    const streak = user.jjkdleLastPlayedAt === yesterday ? user.jjkdleStreak + 1 : 1;
    const best = Math.max(user.jjkdleBestStreak, streak);

    await tx.user.update({
      where: { id: userId },
      data: {
        jjkdleStreak: streak,
        jjkdleBestStreak: best,
        jjkdleLastPlayedAt: today,
      },
    });
    return { streak, best };
  });
}
