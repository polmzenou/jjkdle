import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Accès en lecture/écriture aux comptes utilisateurs pour la vue /admin.
 * Module server-only (client Prisma) : à n'utiliser que côté serveur.
 */

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: Role;
  /** Date de création (ISO). */
  createdAt: string;
  /** Nombre de scores enregistrés par l'utilisateur. */
  scoreCount: number;
}

/** Tous les comptes, du plus récent au plus ancien. */
export async function listUsers(): Promise<AdminUser[]> {
  const rows = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { scores: true } } },
  });
  return rows.map((u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    scoreCount: u._count.scores,
  }));
}

/** Change le rôle d'un utilisateur. */
export async function adminSetUserRole(id: string, role: Role): Promise<void> {
  await prisma.user.update({ where: { id }, data: { role } });
}

/** Supprime un utilisateur (cascade : sessions + scores). */
export async function adminDeleteUser(id: string): Promise<void> {
  await prisma.user.delete({ where: { id } });
}
