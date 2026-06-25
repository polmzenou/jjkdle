/**
 * Bootstrap des administrateurs.
 *
 * Les emails listés dans la variable d'environnement `ADMIN_EMAILS`
 * (séparés par des virgules) reçoivent automatiquement le rôle ADMIN à
 * l'inscription, et sont promus à la connexion s'ils ne l'ont pas encore.
 */

/** Liste normalisée (minuscules, sans espaces) des emails admin. */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Cet email doit-il avoir le rôle ADMIN ? */
export function isAdminEmail(email: string): boolean {
  return adminEmails().includes(email.trim().toLowerCase());
}
