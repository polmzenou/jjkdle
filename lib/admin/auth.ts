import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Authentification de la vue admin (/admin).
 * Protection : un mot de passe stocké en variable d'environnement `ADMIN_PASSWORD`
 * + un cookie httpOnly contenant un token dérivé (jamais le mot de passe en clair).
 * Si `ADMIN_PASSWORD` n'est pas défini, l'admin est totalement désactivé.
 */

const COOKIE = "jjk_admin";
const ONE_WEEK = 60 * 60 * 24 * 7;

function token(secret: string): string {
  return createHash("sha256").update(`${secret}::jjk-admin-v1`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** L'admin est-il activé (mot de passe configuré) ? */
export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

/** Vérifie un mot de passe en clair contre `ADMIN_PASSWORD`. */
export function checkPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(token(password), token(expected));
}

/** L'utilisateur courant est-il authentifié (cookie valide) ? */
export async function isAdminAuthed(): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  return safeEqual(value, token(expected));
}

/** Pose le cookie de session admin (à appeler depuis une Server Action). */
export async function setAdminCookie(): Promise<void> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return;
  (await cookies()).set(COOKIE, token(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_WEEK,
  });
}

/** Supprime le cookie de session admin. */
export async function clearAdminCookie(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
