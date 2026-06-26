import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

/**
 * Accès admin aux comptes utilisateurs (onglet « Utilisateurs » du dashboard).
 * La règle métier « un admin ne peut pas être rétrogradé » est appliquée dans
 * la server action (app/admin/actions.ts), pas ici.
 */

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: Role;
  /** Date d'inscription (ISO). */
  createdAt: string;
}

/** Liste tous les comptes (admins d'abord, puis par ancienneté). */
export async function listUsers(): Promise<AdminUser[]> {
  const rows = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }], // "ADMIN" < "PLAYER"
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
  return rows.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }));
}

/** Rôle courant d'un utilisateur (ou null s'il n'existe pas). */
export async function getUserRole(id: string): Promise<Role | null> {
  const u = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });
  return u?.role ?? null;
}

/** Change le rôle d'un utilisateur. */
export async function setUserRole(id: string, role: Role): Promise<void> {
  await prisma.user.update({ where: { id }, data: { role } });
}

/** Supprime un compte (cascade : sessions + scores via le schéma). */
export async function deleteUser(id: string): Promise<void> {
  await prisma.user.delete({ where: { id } });
}
