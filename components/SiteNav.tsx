"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { Logo } from "@/components/Logo";
import { VipBadge } from "@/components/VipBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { logoutAction } from "@/lib/auth/actions";
import {
  refreshRosterImagesFromApiAction,
  clearImageCacheAction,
} from "@/app/admin/actions";

const LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/games", label: "Jeux" },
];

export type NavUser = {
  username: string;
  isAdmin: boolean;
  isVip: boolean;
  /** ADMIN ou VIP : accès aux boutons « OUAIS » / « Vider le cache ». */
  canSyncImages: boolean;
  /** Image de l'avatar choisi (personnage du roster), ou null = initiales. */
  avatarImage: string | null;
  /** Niveau du compte (pastille sur l'avatar). */
  level: number;
};

/**
 * Barre de navigation globale du site.
 *
 * Montée dans le layout racine, mais elle s'efface sur les pages de jeu
 * (`/games/<id>`) et l'admin, qui possèdent déjà leur propre en-tête (logo +
 * retour). Sticky + backdrop blur pour rester lisible par-dessus le contenu.
 *
 * `user` est résolu côté serveur (layout) et passé en prop.
 */
export function SiteNav({
  user,
  cachedImageCount = 0,
}: {
  user: NavUser | null;
  cachedImageCount?: number;
}) {
  const pathname = usePathname();

  if (pathname.startsWith("/games/") || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-void-900/70 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-6">
        <Logo className="h-9 w-auto sm:h-10" />

        <div className="flex items-center gap-1 sm:gap-2">
          {LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 ${
                  active
                    ? "bg-white/[0.06] text-white"
                    : "text-white/55 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {user ? (
            <UserMenu user={user} cachedImageCount={cachedImageCount} />
          ) : (
            <Link
              href="/login"
              className="ml-1 inline-flex items-center rounded-full bg-domain px-4 py-1.5 text-sm font-bold text-white shadow-glow transition-transform hover:scale-105"
            >
              Connexion
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

/** Pseudo + (lien admin) + bouton de déconnexion. */
function UserMenu({
  user,
  cachedImageCount,
}: {
  user: NavUser;
  cachedImageCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const logout = () => {
    startTransition(async () => {
      await logoutAction();
      router.refresh();
    });
  };

  // Bouton « Vider le cache » : efface les images récupérées via « OUAIS ».
  const clearCache = () => {
    if (!window.confirm("Vider le cache d'images récupérées via « OUAIS » ?")) {
      return;
    }
    startTransition(async () => {
      const res = await clearImageCacheAction();
      if (!res.ok) {
        window.alert(res.error ?? "Échec.");
        return;
      }
      router.refresh();
    });
  };

  // Bouton « OUAIS » : récupère une image depuis l'API pour tous les persos.
  const syncImages = () => {
    if (
      !window.confirm(
        "Récupérer une image depuis l'API pour les personnages FÉMININS (Genre = Femme) ? Les images actuelles seront remplacées.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await refreshRosterImagesFromApiAction();
      if (!res.ok) {
        window.alert(res.error ?? "Échec de la récupération.");
        return;
      }
      window.alert(
        `Images mises à jour : ${res.builderUpdated + res.draftUpdated}/${res.total}\nIntrouvables : ${res.notFound}\nÉchecs API (rate-limit/réseau) : ${res.failed}`,
      );
      router.refresh();
    });
  };

  return (
    <div className="ml-1 flex items-center gap-2">
      {user.canSyncImages && (
        <button
          type="button"
          onClick={syncImages}
          disabled={pending}
          className="rounded-full bg-domain px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow-glow transition-transform enabled:hover:scale-105 disabled:opacity-40"
        >
          {pending ? "…" : "OUAIS"}
        </button>
      )}
      {user.canSyncImages && cachedImageCount > 0 && (
        <button
          type="button"
          onClick={clearCache}
          disabled={pending}
          title={`${cachedImageCount} image(s) en cache`}
          className="rounded-full border border-cursed/40 bg-cursed/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-cursed-light transition-colors enabled:hover:bg-cursed/20 disabled:opacity-40"
        >
          Vider le cache ({cachedImageCount})
        </button>
      )}
      {user.isAdmin && (
        <Link
          href="/admin"
          className="rounded-full border border-domain/40 bg-domain/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-domain-light transition-colors hover:bg-domain/20"
        >
          Admin
        </Link>
      )}
      <Link
        href="/account"
        aria-label="Mon compte"
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-1 pr-3 text-sm font-semibold text-white/80 transition-colors hover:border-white/25 hover:text-white"
      >
        <UserAvatar
          username={user.username}
          image={user.avatarImage}
          level={user.level}
          size={28}
        />
        <span className="hidden max-w-[8rem] truncate sm:inline">
          {user.username}
        </span>
        {user.isVip && <VipBadge />}
      </Link>
      <button
        type="button"
        onClick={logout}
        disabled={pending}
        className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1.5 text-sm font-medium text-white/70 transition-colors hover:text-white disabled:opacity-40"
      >
        {pending ? "…" : "Déconnexion"}
      </button>
    </div>
  );
}
