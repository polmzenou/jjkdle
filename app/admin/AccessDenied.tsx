import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Garde d'accès de l'administration, partagée par toutes ses pages.
 *
 * `requireAdmin()` renvoie soit l'utilisateur ADMIN, soit l'écran à rendre — la
 * page n'a donc qu'un seul `if` à écrire. Le rôle ADMIN est GLOBAL (il ne dépend
 * d'aucun univers) : il ouvre l'admin de tous les univers.
 */

/** Bloc d'accès refusé (non connecté ou rôle insuffisant). */
export function AccessDenied({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="font-display text-2xl font-bold text-white">{title}</h1>
      <p className="mt-3 text-sm text-white/55">{children}</p>
    </main>
  );
}

/** Écran de refus adapté à la raison (pas connecté / pas admin). */
export function accessDeniedFor(
  user: { username: string } | null,
): React.ReactElement {
  if (!user) {
    return (
      <AccessDenied title="Connexion requise">
        Cette section est réservée aux administrateurs.{" "}
        <Link
          href="/login"
          className="font-semibold text-domain-light hover:underline"
        >
          Se connecter
        </Link>
        .
      </AccessDenied>
    );
  }
  return (
    <AccessDenied title="Accès refusé">
      Ton compte (<span className="text-white/80">{user.username}</span>) n
      &apos;a pas le rôle administrateur.
    </AccessDenied>
  );
}

/**
 * Exige le rôle ADMIN. Renvoie `{ user }` si c'est bon, `{ denied }` sinon —
 * l'appelant rend `denied` tel quel.
 */
export async function requireAdmin(): Promise<
  | { user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>; denied: null }
  | { user: null; denied: React.ReactElement }
> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return { user: null, denied: accessDeniedFor(user) };
  }
  return { user, denied: null };
}
