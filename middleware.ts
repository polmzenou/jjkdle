import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_UNIVERSE_COOKIE,
  ADMIN_UNIVERSE_PARAM,
  adminUniverseCookieOptions,
  isAdminPath,
} from "@/lib/universes/admin-scope";
import { HUB_ROUTE } from "@/lib/universes/hub";
import {
  isUniverseFreePath,
  splitUniversePath,
  universePath,
} from "@/lib/universes/routing";
import {
  DEFAULT_UNIVERSE_SLUG,
  getUniverseBySlug,
  resolveUniverse,
} from "@/lib/universes/registry";

/**
 * Résolution de l'UNIVERS COURANT + routage du HUB.
 *
 * Un seul domaine sert tous les animes : l'univers vient du PREMIER SEGMENT du
 * chemin (`/jjk/games`). Les PAGES ne sont PAS réécrites — le segment existe pour
 * de vrai dans l'arborescence (`app/[universe]/…`).
 *
 * C'est un choix structurant, pas un détail : une réécriture `/jjk/games` →
 * `/games` produirait le même arbre de segments pour tous les univers, si bien
 * qu'une navigation client de `/jjk/games` vers `/csm/games` ne re-rendrait aucun
 * layout — l'anime changerait dans l'URL mais pas la palette, ni le logo, ni la
 * nav. Seules les API restent réécrites (`/jjk/api/x` → `/api/x`) : un Route
 * Handler ne dépend d'aucun layout, la question ne se pose pas.
 *
 * Le slug résolu est posé dans le header `x-universe`, seul point de lecture côté
 * serveur (`getCurrentUniverse()` dans lib/universes/current.ts).
 *
 * Ce module tourne sur l'Edge runtime : il n'importe QUE du code pur (registre,
 * routing et hub n'ont aucune dépendance Prisma).
 */

/** Cookie mémorisant le dernier univers visité (repli des chemins non préfixés). */
const LAST_UNIVERSE_COOKIE = "universe";

const isKnownSlug = (slug: string) => Boolean(getUniverseBySlug(slug));

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const headers = new Headers(request.headers);
  // Un client ne doit pouvoir ni choisir son univers ni se déclarer sur le hub :
  // on écrase toujours les valeurs entrantes (headers réservés au serveur).
  headers.delete("x-universe");
  headers.delete("x-hub");
  headers.delete("x-casino");

  // ── 1. Administration : hors univers, sa cible vient d'un cookie ──────────
  // `?universe=<slug>` a la priorité et devient la nouvelle cible mémorisée :
  // c'est ce qui donne une URL propre à « l'admin de CSM » (partageable, mise en
  // favori) sans dupliquer une seule vue d'admin par univers.
  if (isAdminPath(pathname)) {
    const picked = request.cookies.get(ADMIN_UNIVERSE_COOKIE)?.value;
    const asked = request.nextUrl.searchParams.get(ADMIN_UNIVERSE_PARAM);
    const requested = asked && isKnownSlug(asked) ? asked : null;
    headers.set(
      "x-universe",
      requested ?? (picked && isKnownSlug(picked) ? picked : fallbackSlug(request)),
    );
    const response = NextResponse.next({ request: { headers } });
    if (requested && requested !== picked) {
      response.cookies.set(
        ADMIN_UNIVERSE_COOKIE,
        requested,
        adminUniverseCookieOptions(),
      );
    }
    return response;
  }

  // ── 2. Hub : la racine et /universes ne dépendent d'aucun univers ─────────
  if (pathname === "/" || pathname === HUB_ROUTE) {
    headers.set("x-hub", "1");
    // La racine affiche le hub sans exposer /universes dans l'URL (réécriture).
    headers.set("x-universe", fallbackSlug(request));
    return pathname === "/"
      ? NextResponse.rewrite(new URL(HUB_ROUTE, request.url), {
          request: { headers },
        })
      : NextResponse.next({ request: { headers } });
  }

  // ── 3. Chemin préfixé par un univers ─────────────────────────────────────
  const split = splitUniversePath(pathname, isKnownSlug);
  if (split) {
    headers.set("x-universe", split.slug);
    // Les PAGES gardent leur URL : `app/[universe]/…` les sert telles quelles.
    // Seules les API sont réécrites, l'arborescence `app/api/` étant commune.
    const isApi = split.rest.startsWith("/api/");
    const response = isApi
      ? NextResponse.rewrite(
          apiTarget(split.rest, request),
          { request: { headers } },
        )
      : NextResponse.next({ request: { headers } });
    // Mémorise l'univers : sert de repli aux chemins non préfixés (ci-dessous).
    // Uniquement sur une NAVIGATION : un appel d'API n'exprime pas une visite.
    // L'admin, par exemple, appelle l'API de l'univers qu'il administre — ce qui
    // ne doit pas déplacer l'univers de repli du site public dans son navigateur.
    if (!isApi) {
      response.cookies.set(LAST_UNIVERSE_COOKIE, split.slug, {
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return response;
  }

  // ── 4. Chemins hors univers (auth, casino, og, robots…) : rien à préfixer ──
  if (isUniverseFreePath(pathname)) {
    headers.set("x-universe", fallbackSlug(request));
    // Le casino a sa PROPRE palette (feutre + or), comme le hub a la sienne :
    // le layout racine a besoin de le savoir dès le premier paint, sans quoi le
    // fond serait peint aux couleurs du dernier anime visité.
    if (pathname === "/casino" || pathname.startsWith("/casino/")) {
      headers.set("x-casino", "1");
    }
    return NextResponse.next({ request: { headers } });
  }

  // ── 5. Chemin sans préfixe : RATTRAPAGE ──────────────────────────────────
  // Un lien interne qui a oublié le préfixe ne doit pas basculer en silence sur
  // l'univers par défaut : on redirige vers sa forme préfixée, d'après le dernier
  // univers visité. Les appels d'API ne sont JAMAIS redirigés (une redirection
  // casserait un POST) : ils sont résolus sur place.
  const slug = fallbackSlug(request);
  if (pathname.startsWith("/api/")) {
    headers.set("x-universe", slug);
    return NextResponse.next({ request: { headers } });
  }

  const redirectUrl = new URL(universePath(pathname, slug), request.url);
  redirectUrl.search = request.nextUrl.search;
  return NextResponse.redirect(redirectUrl, 307);
}

/** URL de la route API dépréfixée, query comprise (`/jjk/api/x` → `/api/x`). */
function apiTarget(rest: string, request: NextRequest): URL {
  const target = new URL(rest, request.url);
  target.search = request.nextUrl.search;
  return target;
}

/**
 * Univers de repli quand le chemin n'en désigne aucun : dernier univers visité,
 * sinon l'univers du domaine (utile si un jour un sous-domaine est branché),
 * sinon `DEFAULT_UNIVERSE`.
 */
function fallbackSlug(request: NextRequest): string {
  const remembered = request.cookies.get(LAST_UNIVERSE_COOKIE)?.value;
  if (remembered && isKnownSlug(remembered)) return remembered;
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  return resolveUniverse(host).slug ?? DEFAULT_UNIVERSE_SLUG;
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
