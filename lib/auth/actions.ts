"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "./password";
import { createSession, destroySession } from "./session";
import { isAdminEmail } from "./admin-emails";

export type AuthResult = { ok: boolean; error?: string };

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,24}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

/** Inscription : crée le compte (rôle selon ADMIN_EMAILS) puis ouvre la session. */
export async function registerAction(input: {
  username: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  const username = String(input.username ?? "").trim();
  const email = String(input.email ?? "").trim().toLowerCase();
  const password = String(input.password ?? "");

  if (!USERNAME_RE.test(username)) {
    return {
      ok: false,
      error:
        "Pseudo invalide (3 à 24 caractères : lettres, chiffres, tirets, underscores).",
    };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Email invalide." };
  }
  if (password.length < MIN_PASSWORD) {
    return {
      ok: false,
      error: `Mot de passe trop court (${MIN_PASSWORD} caractères minimum).`,
    };
  }

  // Conflit pseudo / email déjà pris.
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true, username: true },
  });
  if (existing) {
    return {
      ok: false,
      error:
        existing.email === email
          ? "Un compte existe déjà avec cet email."
          : "Ce pseudo est déjà pris.",
    };
  }

  const passwordHash = await hashPassword(password);
  const role = isAdminEmail(email) ? "ADMIN" : "PLAYER";

  try {
    const user = await prisma.user.create({
      data: { username, email, passwordHash, role },
    });
    await createSession(user.id);
  } catch (e) {
    // Garde-fou en cas de course sur la contrainte d'unicité.
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return { ok: false, error: "Pseudo ou email déjà utilisé." };
    }
    return { ok: false, error: "Échec de l'inscription. Réessaie." };
  }

  return { ok: true };
}

/** Connexion par email OU pseudo + mot de passe. */
export async function loginAction(input: {
  identifier: string;
  password: string;
}): Promise<AuthResult> {
  const identifier = String(input.identifier ?? "").trim();
  const password = String(input.password ?? "");

  if (!identifier || !password) {
    return { ok: false, error: "Identifiant et mot de passe requis." };
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier.toLowerCase() }, { username: identifier }],
    },
  });

  // Message générique : ne révèle pas si le compte existe.
  const INVALID = { ok: false, error: "Identifiants incorrects." } as const;
  if (!user) return INVALID;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return INVALID;

  // Promotion ADMIN si l'email a été ajouté à ADMIN_EMAILS après l'inscription.
  if (user.role !== "ADMIN" && isAdminEmail(user.email)) {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "ADMIN" },
    });
  }

  await createSession(user.id);
  return { ok: true };
}

/** Déconnexion. */
export async function logoutAction(): Promise<void> {
  await destroySession();
}
