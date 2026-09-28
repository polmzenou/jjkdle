import type { ReactNode } from "react";
import type { BadgeGlyph } from "@/lib/badges/definitions";

/**
 * Pictogrammes gravés au centre des médailles. Grille 24×24, tracés en
 * `currentColor` : la médaille fixe la couleur (celle du badge) et la lueur.
 *
 * Volontairement sobres (quelques chemins chacun) — ils sont rendus jusqu'à
 * 20 px dans la liste admin, un détail fin y deviendrait une tache.
 */
export const BADGE_GLYPH_PATHS: Record<BadgeGlyph, ReactNode> = {
  // Première partie du Builder : une lame dressée, garde et pommeau.
  blade: (
    <>
      <path d="M12 2.5 14 6v9h-4V6z" fill="currentColor" />
      <path d="M7.5 15h9v1.8h-9z" fill="currentColor" />
      <path d="M11 16.8h2v3.2h-2z" fill="currentColor" opacity=".8" />
      <circle cx="12" cy="21" r="1.3" fill="currentColor" />
    </>
  ),
  // Pyramide : trois étages, comme la grille de classement.
  pyramid: (
    <>
      <path d="M12 3 21 20H3z" fill="currentColor" opacity=".35" />
      <path d="M12 3 21 20H3z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8.3 10h7.4M5.6 15h12.8" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  // Draft : deux lames croisées.
  swords: (
    <>
      <path d="m4 4 11.5 11.5M20 4 8.5 15.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="m13.5 17.5 4-4M10.5 17.5l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m17 17 3 3M7 17l-3 3" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  // Énigme du jour : un masque, identité cachée.
  mask: (
    <>
      <path
        d="M3 7c3-1.6 6-1.6 9 0 3-1.6 6-1.6 9 0 0 6-2.6 10-6 10-1.4 0-2.3-1-3-2.4-.7 1.4-1.6 2.4-3 2.4-3.4 0-6-4-6-10z"
        fill="currentColor"
        opacity=".9"
      />
      <path d="M6.2 10.2c1-.9 2.4-.9 3.4 0M14.4 10.2c1-.9 2.4-.9 3.4 0" stroke="#0b0716" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  // Première ascension : la tour et ses meurtrières.
  tower: (
    <>
      <path d="M7 21V8h10v13z" fill="currentColor" opacity=".85" />
      <path d="M6 8V4h2v1.6h2V4h4v1.6h2V4h2v4z" fill="currentColor" />
      <path d="M11 21v-4a1 1 0 0 1 2 0v4M9.2 11h1.2M13.6 11h1.2" stroke="#0b0716" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  // Grade S : blason frappé d'un S.
  grade: (
    <>
      <path d="M12 2.5 20 5.5v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z" fill="currentColor" opacity=".3" />
      <path d="M12 2.5 20 5.5v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M15 8.4c-.7-.9-1.8-1.4-3-1.4-1.8 0-3 .9-3 2.3 0 3.1 6 1.8 6 5 0 1.5-1.3 2.4-3 2.4-1.3 0-2.5-.6-3.1-1.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  // Série de 7 jours : flamme à cœur clair.
  flame: (
    <>
      <path d="M12 2c1 3.4 5.5 5.6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.6 1.3-4.4 2.6-5.6.2 1.6.9 2.6 1.9 3 0-3.4-.4-5.8 1-8.4z" fill="currentColor" />
      <path d="M12 12.5c.6 1.4 2.4 2.2 2.4 4.3a2.4 2.4 0 0 1-4.8 0c0-1.2.5-1.9 1.1-2.4.1.6.4 1 .8 1.2 0-1.3-.1-2.2.5-3.1z" fill="#0b0716" opacity=".55" />
    </>
  ),
  // Polyvalent : trois cartes en éventail.
  cards: (
    <>
      <rect x="3" y="6" width="9" height="13" rx="1.6" transform="rotate(-14 7.5 12.5)" fill="currentColor" opacity=".45" />
      <rect x="12" y="6" width="9" height="13" rx="1.6" transform="rotate(14 16.5 12.5)" fill="currentColor" opacity=".45" />
      <rect x="7.5" y="4" width="9" height="14" rx="1.6" fill="currentColor" />
      <path d="m12 8 1.2 2.5 2.6.3-2 1.7.6 2.6-2.4-1.4-2.4 1.4.6-2.6-2-1.7 2.6-.3z" fill="#0b0716" opacity=".6" />
    </>
  ),
  // Strate III de la tour : croissant de lune et étoile, la nuit tombée.
  moon: (
    <>
      <path d="M15.5 3.5A8.5 8.5 0 1 0 20.5 15 7 7 0 0 1 15.5 3.5z" fill="currentColor" />
      <path d="m18.5 4 .6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" fill="currentColor" />
    </>
  ),
  // Tour vaincue : couronne à trois pointes.
  crown: (
    <>
      <path d="M3 8.5 7.5 12 12 5l4.5 7L21 8.5 19 18H5z" fill="currentColor" />
      <path d="M5 19.5h14v1.8H5z" fill="currentColor" opacity=".8" />
      <circle cx="12" cy="14.5" r="1.4" fill="#0b0716" opacity=".55" />
    </>
  ),
  // Tour du premier coup : éclair.
  bolt: <path d="M13.5 2 5 13.5h6L9.5 22 19 9.5h-6.2z" fill="currentColor" />,
  // Choix du staff : étoile pleine.
  star: (
    <path
      d="m12 2.5 2.9 6 6.6.8-4.9 4.5 1.3 6.6L12 17.1l-5.9 3.3 1.3-6.6L2.5 9.3l6.6-.8z"
      fill="currentColor"
    />
  ),
};
