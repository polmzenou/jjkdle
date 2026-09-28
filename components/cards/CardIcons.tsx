/**
 * Petites icônes SVG du système de cartes (boutique, deck, ouverture), en
 * `currentColor` : elles prennent la couleur du texte, donc le thème de
 * l'univers. Remplacent les émojis 🎴 / 🃏 / ✕ / ♠ de la première version.
 */

interface IconProps {
  className?: string;
}

/** Trois cartes empilées : le deck. */
export function DeckIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect x="3" y="7" width="11" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" opacity=".45" transform="rotate(-10 8.5 14)" />
      <rect x="9" y="3" width="11" height="15" rx="2" fill="currentColor" fillOpacity=".18" stroke="currentColor" strokeWidth="1.8" />
      <path d="m14.5 7.5 1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z" fill="currentColor" />
    </svg>
  );
}

/** Booster scellé : enveloppe à bords crantés et sceau. */
export function PackIcon({ className = "h-10 w-10" }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden>
      <path d="M11 6h26l-1.5 2 1.5 2v28l-1.5 2 1.5 2H11l1.5-2-1.5-2V10l1.5-2z" fill="currentColor" fillOpacity=".16" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M11 13h26M11 35h26" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2 2.5" opacity=".7" />
      <circle cx="24" cy="24" r="6.5" fill="currentColor" />
      <path d="m24 19.8 1.3 2.7 3 .4-2.2 2 .6 2.9-2.7-1.5-2.7 1.5.6-2.9-2.2-2 3-.4z" fill="rgb(var(--color-void-900))" />
    </svg>
  );
}

export function CloseIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function ArrowRightIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M5 12h13m-5-6 6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronIcon({ className = "h-3 w-3" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PencilIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="m13.5 6.5 4 4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** Pique de carte à jouer : lien vers le casino. */
export function SpadeIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 2.5c3 3.6 8 6.6 8 10.6a4.3 4.3 0 0 1-7.3 3.1c.3 2 1.1 3.5 2.3 5.3H9c1.2-1.8 2-3.3 2.3-5.3A4.3 4.3 0 0 1 4 13.1c0-4 5-7 8-10.6z" fill="currentColor" />
    </svg>
  );
}
