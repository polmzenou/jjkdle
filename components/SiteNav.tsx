"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";

const LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/games", label: "Jeux" },
];

/**
 * Barre de navigation globale du site.
 *
 * Montée dans le layout racine, mais elle s'efface sur les pages de jeu
 * (`/games/<id>`) et l'admin, qui possèdent déjà leur propre en-tête (logo +
 * retour). Sticky + backdrop blur pour rester lisible par-dessus le contenu.
 */
export function SiteNav() {
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

          <Link
            href="/games"
            className="ml-1 hidden items-center rounded-full bg-domain px-4 py-1.5 text-sm font-bold text-white shadow-glow transition-transform hover:scale-105 sm:inline-flex"
          >
            Jouer
          </Link>
        </div>
      </nav>
    </header>
  );
}
