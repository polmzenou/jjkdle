"use client";

import { useUniverse } from "@/components/universe/UniverseProvider";
import { UniverseLink } from "@/components/universe/UniverseLink";

interface LogoProps {
  /** Classes de taille pour l'image (hauteur, etc.). Défaut : en-tête de jeu. */
  className?: string;
  /** Ajoute un halo néon sous le logo (utile sur la landing). */
  glow?: boolean;
}

/**
 * Logo de la marque de l'UNIVERS COURANT. Toujours cliquable → ramène à la
 * landing (/). Nom et image viennent du contexte d'univers (monté par le layout
 * racine) : chaque anime affiche son propre logo, sans aucune prop à passer.
 */
export function Logo({ className = "h-9 w-auto", glow = false }: LogoProps) {
  const { name, logo } = useUniverse();

  return (
    <UniverseLink
      href="/"
      aria-label={`Retour à l'accueil — ${name}`}
      className="inline-block shrink-0 rounded transition-transform duration-300 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-domain-light"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo.src}
        alt={logo.alt}
        className={`${className} object-contain${
          glow ? " drop-shadow-[0_0_22px_rgb(var(--color-domain)/0.55)]" : ""
        }`}
      />
    </UniverseLink>
  );
}
