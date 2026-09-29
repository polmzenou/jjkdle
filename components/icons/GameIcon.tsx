import type { ReactNode } from "react";
import type { GameId } from "@/lib/games/types";

/**
 * Logos des jeux, en SVG maison. Remplacent les émojis du registre (🩸 🔺 ⚔️…),
 * qui changeaient de rendu d'un OS à l'autre et juraient avec le reste de l'UI.
 *
 * Grille 24×24, tracés en `currentColor` avec des aplats à opacité réduite
 * (même grammaire que `components/cards/CardIcons` et les médailles de badges) :
 * le parent fixe la couleur — l'accent du jeu, ou le thème de l'univers.
 * Chaque logo reste lisible à 16 px : quelques formes franches, pas de détail fin.
 */
const GAME_ICON_PATHS: Record<GameId, ReactNode> = {
  // Build the Perfect … : une silhouette qu'on assemble, dans un cadre de visée.
  builder: (
    <>
      <path d="M3.5 8V4.5a1 1 0 0 1 1-1H8M16 3.5h3.5a1 1 0 0 1 1 1V8M20.5 16v3.5a1 1 0 0 1-1 1H16M8 20.5H4.5a1 1 0 0 1-1-1V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="9" r="2.7" fill="currentColor" />
      <path d="M7.2 18c0-3 2.1-5 4.8-5s4.8 2 4.8 5z" fill="currentColor" fillOpacity=".35" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </>
  ),
  // Pyramid : un classement en blocs, 1 / 2 / 3.
  ranking: (
    <>
      <rect x="10" y="3.5" width="4" height="4" rx="1" fill="currentColor" />
      <rect x="7" y="9.5" width="4" height="4" rx="1" fill="currentColor" fillOpacity=".6" />
      <rect x="13" y="9.5" width="4" height="4" rx="1" fill="currentColor" fillOpacity=".6" />
      <rect x="4" y="15.5" width="4" height="4" rx="1" fill="currentColor" fillOpacity=".4" />
      <rect x="10" y="15.5" width="4" height="4" rx="1" fill="currentColor" fillOpacity=".4" />
      <rect x="16" y="15.5" width="4" height="4" rx="1" fill="currentColor" fillOpacity=".4" />
      <path d="M3 21.5h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  // Draft : on pioche des combattants — deux cartes en éventail, une lame
  // dressée sur celle qu'on retient.
  "jujutsu-draft": (
    <>
      <rect x="3" y="6.5" width="10" height="14.5" rx="2" stroke="currentColor" strokeWidth="1.6" opacity=".45" transform="rotate(-12 8 13.75)" />
      <rect x="9" y="3" width="11.5" height="17" rx="2.2" fill="currentColor" fillOpacity=".18" stroke="currentColor" strokeWidth="1.7" />
      <path d="m14.75 5.8 1.3 2.3v5.6h-2.6V8.1z" fill="currentColor" />
      <path d="M12.3 14.4h4.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14.75 15v2.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  // Random Battle : un dé frappé d'un éclair — le hasard et le choc.
  battle: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="currentColor" fillOpacity=".15" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="7.3" cy="7.3" r="1.2" fill="currentColor" />
      <circle cx="16.7" cy="16.7" r="1.2" fill="currentColor" />
      <path d="M13.4 5.5 8.6 12.6h3.3l-1.3 5.9 4.8-7.3h-3.3z" fill="currentColor" stroke="currentColor" strokeWidth=".8" strokeLinejoin="round" />
    </>
  ),
  // Qui est-ce ? : un buste anonyme, un point d'interrogation pour visage.
  guesswho: (
    <>
      <circle cx="12" cy="9" r="4.6" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M10.4 7.9a1.7 1.7 0 1 1 2.5 1.5c-.6.3-.9.7-.9 1.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="12.3" r=".95" fill="currentColor" />
      <path d="M4.5 21c.8-3.7 3.8-5.6 7.5-5.6s6.7 1.9 7.5 5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  // Codenames : la grille d'agents, une case révélée, une case éliminée.
  codenames: (
    <>
      {[3.5, 9.75, 16].flatMap((y) =>
        [3.5, 9.75, 16].map((x) => (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width="4.5"
            height="4.5"
            rx="1"
            fill="currentColor"
            fillOpacity={x === 9.75 && y === 9.75 ? 1 : 0.35}
          />
        )),
      )}
      <path d="m16.6 4.1 3.3 3.3m0-3.3-3.3 3.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  // Jeu du jour (…dle) : une page de calendrier remplie de cases d'essais.
  jjkdle: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="6.5" y="10" width="5" height="3.8" rx=".9" fill="currentColor" />
      <rect x="12.5" y="10" width="5" height="3.8" rx=".9" fill="currentColor" fillOpacity=".4" />
      <rect x="6.5" y="14.8" width="5" height="3.8" rx=".9" fill="currentColor" fillOpacity=".4" />
      <rect x="12.5" y="14.8" width="5" height="3.8" rx=".9" fill="currentColor" />
    </>
  ),
  // Higher / Lower : plus haut, plus bas, séparés par la ligne de référence.
  "higher-lower": (
    <>
      <path d="M12 3 18 10H6z" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M4 12h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="1.5 2.5" />
      <path d="M12 21 6 14h12z" fill="currentColor" fillOpacity=".35" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </>
  ),
  // La Tour : une flèche à étages, à gravir.
  tower: (
    <>
      <path d="M8.5 21V9.5L12 3l3.5 6.5V21z" fill="currentColor" fillOpacity=".22" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M8.5 12.5h7M8.5 16.5h7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 21h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="8.6" r="1.1" fill="currentColor" />
    </>
  ),
};

/** Manette générique, pour un id de jeu inconnu (score orphelin, jeu retiré). */
const FALLBACK_PATH = (
  <>
    <path d="M7.5 7h9a4.5 4.5 0 0 1 4.3 5.8l-1.3 4.3a2.4 2.4 0 0 1-4.1.9L13.8 16h-3.6L8.6 18a2.4 2.4 0 0 1-4.1-.9l-1.3-4.3A4.5 4.5 0 0 1 7.5 7z" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M8 10v3.6M6.2 11.8h3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="15.6" cy="10.8" r="1" fill="currentColor" />
    <circle cx="17.4" cy="12.8" r="1" fill="currentColor" />
  </>
);

function isGameId(id: string): id is GameId {
  return id in GAME_ICON_PATHS;
}

/**
 * Logo d'un jeu. `id` accepte une chaîne quelconque (les scores portent un
 * `gameId: string`) : un id inconnu retombe sur la manette générique.
 */
export function GameIcon({
  id,
  className = "h-5 w-5",
  style,
}: {
  id: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" aria-hidden>
      {isGameId(id) ? GAME_ICON_PATHS[id] : FALLBACK_PATH}
    </svg>
  );
}
