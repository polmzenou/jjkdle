/**
 * Icônes d'interface en SVG maison (cadenas, validation, sections du profil,
 * KPI admin, tutoriel), en remplacement des émojis 🔒 ✓ 🎖️ 🏆 👥 ⚠️ 🖼️ 📅 🏷️ ✨.
 *
 * Grille 24×24 en `currentColor`, même grammaire que `GameIcon` et
 * `components/cards/CardIcons` (trait 1.7–2, aplats à opacité réduite) : elles
 * prennent la couleur du texte, donc le thème de l'univers.
 */

import { GameIcon } from "@/components/icons/GameIcon";

interface IconProps {
  className?: string;
}

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      {children}
    </svg>
  );
}

/** Cadenas : cosmétique verrouillé. */
export function LockIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5" fill="currentColor" />
      <circle cx="12" cy="15.3" r="1.5" fill="rgb(var(--color-void-900))" />
    </Svg>
  );
}

/** Coche : élément équipé / sélectionné. */
export function CheckIcon({ className = "h-3 w-3" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m4.5 12.5 5 5 10-11" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Médaille à rubans : section Badges. */
export function MedalIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M8 2.5h3l2 6h-3zM16 2.5h-3l-1 3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="15" r="6" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeWidth="1.8" />
      <path d="m12 11.8 1 2 2.2.3-1.6 1.5.4 2.2-2-1.1-2 1.1.4-2.2-1.6-1.5 2.2-.3z" fill="currentColor" />
    </Svg>
  );
}

/** Coupe : section Scores / records. */
export function TrophyIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M7 3.5h10v5a5 5 0 0 1-10 0z" fill="currentColor" fillOpacity=".25" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M7 5.5H4.5v1.5A3 3 0 0 0 7.5 10M17 5.5h2.5v1.5a3 3 0 0 1-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 13.5v3.5M8 20.5h8M9.5 20.5 10 17h4l.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Deux silhouettes : joueurs. */
export function UsersIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="9" cy="8" r="3.3" fill="currentColor" />
      <path d="M2.5 20c.6-3.4 3.2-5.3 6.5-5.3s5.9 1.9 6.5 5.3z" fill="currentColor" fillOpacity=".35" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="16.5" cy="7.5" r="2.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M17.5 13.2c2.3.4 3.7 2 4 4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  );
}

/** Triangle d'alerte. */
export function AlertIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M10.3 4.2a2 2 0 0 1 3.4 0l7.4 12.9a2 2 0 0 1-1.7 3H4.6a2 2 0 0 1-1.7-3z" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 9v4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="16.8" r="1.2" fill="currentColor" />
    </Svg>
  );
}

/** Cadre photo : image manquante. */
export function ImageIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" fill="currentColor" fillOpacity=".15" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="8.5" cy="9.5" r="1.8" fill="currentColor" />
      <path d="m4 18 5-5 3.5 3.5L16 13l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </Svg>
  );
}

/** Manette : parties jouées (le logo générique des jeux). */
export function GamepadIcon({ className = "h-4 w-4" }: IconProps) {
  return <GameIcon id="" className={className} />;
}

/** Page de calendrier : défi quotidien. */
export function CalendarIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" fill="currentColor" fillOpacity=".15" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <rect x="13" y="12.5" width="4" height="4" rx="1" fill="currentColor" />
    </Svg>
  );
}

/** Étiquette : titres affichés sous le pseudo. */
export function TagIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3.5 4.8v6.1c0 .5.2 1 .6 1.4l7.6 7.6a1.9 1.9 0 0 0 2.7 0l5.6-5.6a1.9 1.9 0 0 0 0-2.7l-7.6-7.6a2 2 0 0 0-1.4-.6H4.8c-.7 0-1.3.6-1.3 1.4z" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="8" cy="8" r="1.6" fill="currentColor" />
    </Svg>
  );
}

/** Étincelles : effets visuels. */
export function SparkleIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M10 3.5c.6 3.6 2 5 5.5 5.5-3.5.6-4.9 2-5.5 5.5-.6-3.5-2-4.9-5.5-5.5 3.5-.5 4.9-1.9 5.5-5.5z" fill="currentColor" />
      <path d="M17.5 13c.3 2 1.1 2.8 3 3-1.9.3-2.7 1.1-3 3-.3-1.9-1.1-2.7-3-3 1.9-.2 2.7-1 3-3z" fill="currentColor" fillOpacity=".6" />
    </Svg>
  );
}

/** Cadre de profil : bordures autour de l'avatar. */
export function FrameIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" strokeDasharray="3 2.2" />
      <circle cx="12" cy="12" r="5" fill="currentColor" fillOpacity=".3" stroke="currentColor" strokeWidth="1.6" />
    </Svg>
  );
}

/** Deux lames face à face : affrontement multijoueur. */
export function VersusIcon({ className = "h-8 w-8" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3.5 3.5 13 13M20.5 3.5 11 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="m6 15.5 3 3M18 15.5l-3 3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M7.5 17 4 20.5M16.5 17l3.5 3.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </Svg>
  );
}
