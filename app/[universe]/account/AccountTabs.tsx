"use client";

import { UniverseLink } from "@/components/universe/UniverseLink";
import { useUniversePathname } from "@/components/universe/UniverseProvider";

/**
 * Barre d'onglets de l'espace « Mon compte ».
 *
 * Chaque onglet est une ROUTE, pas un état local : `/account` reste la page
 * profil (longue, empilée) et `/account/deck` / `/account/customize` sont ses
 * sœurs. Aucune refonte de la page existante n'est nécessaire, et chaque onglet
 * garde son URL partageable et son propre chargement serveur.
 */

const TABS = [
  { href: "/account", label: "👤 Profil" },
  { href: "/account/deck", label: "🃏 Deck" },
  { href: "/account/customize", label: "🎛️ Personnaliser" },
] as const;

export function AccountTabs() {
  const pathname = useUniversePathname();

  return (
    <nav
      aria-label="Sections du compte"
      className="mb-8 flex flex-wrap gap-2 border-b border-white/10 pb-3"
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <UniverseLink
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
              active
                ? "border-domain/60 bg-domain/15 text-domain-light"
                : "border-white/10 bg-void-800/60 text-white/60 hover:border-white/25 hover:text-white"
            }`}
          >
            {tab.label}
          </UniverseLink>
        );
      })}
    </nav>
  );
}
