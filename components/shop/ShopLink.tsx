"use client";

import { UniverseLink } from "@/components/universe/UniverseLink";

/**
 * Accès à la BOUTIQUE depuis la barre de nav, collé au portemonnaie : les coins
 * et l'endroit où les dépenser se lisent d'un seul coup d'œil.
 *
 * Comme partout dans le projet, l'icône est un SVG écrit à la main (aucune
 * librairie d'icônes n'est embarquée, cf. CoinIcon / HubLink).
 */

/** Caddie de supermarché, dimensionné par `className`. */
export function CartIcon({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Anse + panier */}
      <path d="M2.5 3.5h2.2l2.1 10.2a1.6 1.6 0 0 0 1.6 1.3h8.1a1.6 1.6 0 0 0 1.6-1.25l1.4-6.25H5.6" />
      {/* Roues */}
      <circle cx="9.5" cy="19.5" r="1.4" />
      <circle cx="17" cy="19.5" r="1.4" />
    </svg>
  );
}

export function ShopLink() {
  return (
    <UniverseLink
      href="/shop"
      aria-label="Boutique"
      title="Boutique"
      className="flex items-center rounded-full border border-amber-400/30 bg-amber-400/10 p-2 text-amber-300 transition-colors hover:border-amber-300/60 hover:bg-amber-400/20"
    >
      <CartIcon />
    </UniverseLink>
  );
}
