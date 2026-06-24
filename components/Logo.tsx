import Link from "next/link";

interface LogoProps {
  /** Classes de taille pour l'image (hauteur, etc.). Défaut : en-tête de jeu. */
  className?: string;
  /** Ajoute un halo néon sous le logo (utile sur la landing). */
  glow?: boolean;
}

/**
 * Logo de la marque "JJK Arcade". Toujours cliquable → ramène à la landing (/).
 * Utilisable côté serveur ou client (pas de hook).
 */
export function Logo({ className = "h-9 w-auto", glow = false }: LogoProps) {
  return (
    <Link
      href="/"
      aria-label="Retour à l'accueil — JJK Arcade"
      className="inline-block shrink-0 rounded transition-transform duration-300 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-domain-light"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="JJK Arcade"
        className={`${className} object-contain${
          glow ? " drop-shadow-[0_0_22px_rgba(124,58,237,0.55)]" : ""
        }`}
      />
    </Link>
  );
}
