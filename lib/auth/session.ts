import { cookies } from "next/headers";
import { cache } from "react";
import { randomBytes } from "node:crypto";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Sessions d'authentification : un token aléatoire est stocké côté DB
 * (table Session) et déposé dans un cookie httpOnly. À chaque requête,
 * `getCurrentUser()` résout l'utilisateur à partir du cookie.
 */

const COOKIE = "jjk_session";
const TTL_DAYS = 30;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

export type SessionUser = {
  id: string;
  username: string;
  email: string;
  role: Role;
};

/** Crée une session pour `userId` et pose le cookie. */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TTL_MS);
  await prisma.session.create({ data: { token, userId, expiresAt } });

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/**
 * Utilisateur courant (ou null). Mémoïsé par requête via `cache()` pour éviter
 * de requêter la DB plusieurs fois dans un même rendu (layout + page).
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;

  const { id, username, email, role } = session.user;
  return { id, username, email, role };
});

/** Utilisateur courant s'il est ADMIN, sinon null. */
export async function getAdminUser(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  return user && user.role === "ADMIN" ? user : null;
}

/** Utilisateur courant s'il est ADMIN ou VIP, sinon null (sync d'images). */
export async function getAdminOrVipUser(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  return user && (user.role === "ADMIN" || user.role === "VIP") ? user : null;
}

/** Invalide la session courante (supprime la ligne DB + le cookie). */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  store.delete(COOKIE);
}
