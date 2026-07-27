"use client";

import Link from "next/link";
import { useUniverse } from "./UniverseProvider";

/**
 * Retour au HUB multi-univers (la page de choix d'anime), affiché à côté du logo
 * de l'univers dans l'en-tête. Sans lui, on ne peut ressortir d'un anime qu'en
 * éditant l'URL — le logo, lui, ramène à la landing de l'univers courant.
 *
 * ⚠️ `next/link` NU, jamais `UniverseLink` : le hub n'appartient à aucun univers.
 * Un préfixage renverrait sur `/jjk` — c'est-à-dire exactement là d'où l'on vient.
 * (`/` est réécrit vers `/universes` par le middleware, l'URL reste donc propre.)
 */
export function HubLink({ className = "" }: { className?: string }) {
  const { name } = useUniverse();

  return (
    <Link
      href="/"
      aria-label={`Quitter ${name} — voir tous les univers`}
      title="Tous les univers"
      className={`group grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-white/50 transition-colors hover:border-domain/50 hover:bg-domain/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-domain-light ${className}`}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[18px] w-[18px] transition-transform duration-300 group-hover:-translate-y-0.5"
      >
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5" />
        <path d="M9.5 21v-6h5v6" />
      </svg>
    </Link>
  );
}
