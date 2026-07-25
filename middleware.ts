import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_UNIVERSE_COOKIE,
  isAdminPath,
} from "@/lib/universes/admin-scope";
import { getUniverseBySlug, resolveUniverse } from "@/lib/universes/registry";

/**
 * Résolution de l'UNIVERS COURANT par hostname (étape 4).
 *
 * Chaque anime a son domaine (jjk-arcade.com, csm-arcade.com…) mais tourne sur
 * UN SEUL codebase : le middleware lit le `Host` de la requête, le résout via le
 * registre `lib/universes/` et pose le slug dans un header `x-universe` que
 * `getCurrentUniverse()` lit côté serveur (lib/universes/current.ts).
 *
 * `resolveUniverse` ne renvoie JAMAIS undefined : un hostname inconnu (dev
 * local, preview Vercel, domaine mal configuré) retombe sur `DEFAULT_UNIVERSE`.
 * Le site répond donc toujours, jamais d'erreur de résolution.
 *
 * Ce module tourne sur l'Edge runtime : il n'importe QUE du code pur (le
 * registre n'a aucune dépendance Prisma).
 */
export function middleware(request: NextRequest) {
  // `x-forwarded-host` est posé par le proxy Vercel ; `host` sert en local.
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  let slug = resolveUniverse(host).slug;

  // Espace d'administration : l'univers CIBLÉ peut différer du domaine servi
  // (cf. lib/universes/admin-scope.ts). Un slug inconnu du registre est ignoré.
  if (isAdminPath(request.nextUrl.pathname)) {
    const picked = request.cookies.get(ADMIN_UNIVERSE_COOKIE)?.value;
    if (picked && getUniverseBySlug(picked)) slug = picked;
  }

  const headers = new Headers(request.headers);
  headers.set("x-universe", slug);
  // Un client ne doit pas pouvoir CHOISIR son univers : on écrase toujours la
  // valeur entrante (le header est réservé à la résolution serveur).
  return NextResponse.next({ request: { headers } });
}

export const config = {
  /**
   * Exclut ce qui n'a pas besoin de l'univers : assets Next, fichiers statiques
   * (images, polices, logos…) et le favicon. Tout le reste — pages, Server
   * Actions et Route Handlers — passe par ici, car tous peuvent lire le roster.
   */
  matcher: [
    "/((?!_next/static|_next/image|assets/|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf)$).*)",
  ],
};
