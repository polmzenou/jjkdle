import { prisma } from "@/lib/prisma";

/**
 * Journalisation ANALYTIQUE des parties JJKdle quotidiennes (table `JjkdleResult`).
 *
 * Distinct du classement (`JjkdleScore`, qui ne garde que les victoires) : on
 * enregistre ici chaque partie daily d'un utilisateur CONNECTÉ avec le perso du
 * jour (`targetId`) et un flag `solved`, pour calculer côté admin le taux de
 * réussite, le taux d'abandon et le personnage le plus raté.
 *
 * Cycle de vie (une ligne par couple utilisateur/date, clé unique userId+date) :
 *   - 1er essai : upsert `solved=false`, `attempts=1` ;
 *   - essais suivants : mise à jour de `attempts` (solved inchangé) ;
 *   - victoire : `solved=true` + `attempts` final.
 *
 * Best-effort : les appelants (Server Actions de jeu) encapsulent ces écritures
 * dans un try/catch silencieux pour ne jamais casser le gameplay.
 */

/**
 * Enregistre/rafraîchit une tentative en cours (ne passe jamais `solved` à true).
 * À appeler à chaque proposition d'une partie daily d'un utilisateur connecté.
 */
export async function recordJjkdleAttempt(
  userId: string,
  date: string,
  targetId: string,
  attempts: number,
): Promise<void> {
  await prisma.jjkdleResult.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, targetId, attempts, solved: false },
    update: { attempts, targetId },
  });
}

/**
 * Marque la partie du jour comme résolue (`solved=true`) avec le nombre d'essais
 * final. À appeler à la victoire.
 */
export async function markJjkdleSolved(
  userId: string,
  date: string,
  targetId: string,
  attempts: number,
): Promise<void> {
  await prisma.jjkdleResult.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, targetId, attempts, solved: true },
    update: { attempts, targetId, solved: true },
  });
}
