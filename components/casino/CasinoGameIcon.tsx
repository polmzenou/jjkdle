import { useId } from "react";

/**
 * Icônes des jeux du casino (accueil /casino), dessinées en SVG — aucun emoji,
 * même principe que `SlotSymbols`, la pièce du pile ou face et les cartes du
 * blackjack : rendu identique sur tous les OS et net à toutes les tailles (le
 * même dessin sert au jeton en orbite et au jeton agrandi de la vue zoom).
 *
 * Chaque icône tient dans un carré 100 × 100. Les identifiants de dégradés sont
 * préfixés par `useId` : la même icône est montée deux fois pendant le zoom
 * (orbite masquée + vue zoom), et des `id` dupliqués casseraient les `url(#…)`.
 */

export type CasinoIconId = "blackjack" | "roulette" | "slots" | "coinflip";

export function CasinoGameIcon({
  icon,
  className,
}: {
  icon: CasinoIconId;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const Icon = ICONS[icon];
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <Icon id={(name) => `${uid}-${icon}-${name}`} />
    </svg>
  );
}

type IdFn = (name: string) => string;

const ICONS: Record<CasinoIconId, (props: { id: IdFn }) => React.ReactElement> = {
  blackjack: BlackjackIcon,
  roulette: RouletteIcon,
  slots: SlotsIcon,
  coinflip: CoinIcon,
};

/** Pique centré en (50, 50), dans un carré 100 × 100. */
const SPADE =
  "M50 8C50 8 12 38 12 60c0 16 17 24 32 15-2 9-6 15-13 19h38c-7-4-11-10-13-19 15 9 32 1 32-15C88 38 50 8 50 8Z";

/** Deux cartes en éventail : un dos, et l'as de pique devant. */
function BlackjackIcon({ id }: { id: IdFn }) {
  return (
    <>
      <defs>
        <linearGradient id={id("face")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e4e0d6" />
        </linearGradient>
        <linearGradient id={id("back")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e23a4b" />
          <stop offset="1" stopColor="#7d0b1a" />
        </linearGradient>
        <pattern id={id("weave")} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0h6M0 0v6" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="1.4" />
        </pattern>
        <filter id={id("shadow")} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#000" floodOpacity="0.55" />
        </filter>
      </defs>

      {/* Dos de carte, incliné à gauche. */}
      <g transform="rotate(-16 50 56)" filter={`url(#${id("shadow")})`}>
        <rect x="20" y="22" width="42" height="60" rx="6" fill="#f5f1e8" />
        <rect x="23.5" y="25.5" width="35" height="53" rx="3.5" fill={`url(#${id("back")})`} />
        <rect x="23.5" y="25.5" width="35" height="53" rx="3.5" fill={`url(#${id("weave")})`} />
        <rect x="27" y="29" width="28" height="46" rx="2.5" fill="none" stroke="#ffd56a" strokeOpacity="0.7" strokeWidth="1" />
      </g>

      {/* As de pique, incliné à droite. */}
      <g transform="rotate(12 50 56)" filter={`url(#${id("shadow")})`}>
        <rect x="38" y="20" width="42" height="60" rx="6" fill={`url(#${id("face")})`} stroke="#000" strokeOpacity="0.12" strokeWidth="0.8" />
        <g fill="#14141c" fillRule="evenodd">
          <path d="M44.2 35.5 47.6 26h2.2l3.4 9.5h-2.4l-.7-2.2h-3l-.7 2.2Zm3.6-4.2h1.9l-.95-3Z" />
          <path d={SPADE} transform="translate(45 37) scale(0.075)" />
          <path d={SPADE} transform="translate(45 36) scale(0.28)" />
          <path
            d="M44.2 35.5 47.6 26h2.2l3.4 9.5h-2.4l-.7-2.2h-3l-.7 2.2Zm3.6-4.2h1.9l-.95-3Z"
            transform="rotate(180 59 50)"
          />
        </g>
      </g>
    </>
  );
}

/** Nombre de cases dessinées : une roue lisible à petite taille, pas les 37. */
const POCKETS = 18;

/** Point sur un cercle centré en (50, 50), arrondi pour un rendu serveur/client identique. */
function polar(r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return `${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`;
}

/** Roue vue de dessus : jante dorée, cases rouges/noires (un zéro vert), moyeu, bille. */
function RouletteIcon({ id }: { id: IdFn }) {
  const step = 360 / POCKETS;
  const pockets = Array.from({ length: POCKETS }, (_, i) => {
    const a0 = i * step;
    const a1 = a0 + step;
    const fill = i === 0 ? "#0f9d58" : i % 2 ? "#c8102e" : "#15151c";
    const d = `M${polar(40, a0)} A40 40 0 0 1 ${polar(40, a1)} L${polar(27, a1)} A27 27 0 0 0 ${polar(27, a0)} Z`;
    return <path key={i} d={d} fill={fill} stroke="#e9c46a" strokeWidth="0.6" />;
  });

  return (
    <>
      <defs>
        <linearGradient id={id("rim")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff1b8" />
          <stop offset="0.45" stopColor="#e0a526" />
          <stop offset="1" stopColor="#7a4d05" />
        </linearGradient>
        <radialGradient id={id("cone")} cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#a8693a" />
          <stop offset="1" stopColor="#4a2410" />
        </radialGradient>
        <radialGradient id={id("hub")} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fff6cc" />
          <stop offset="0.5" stopColor="#e7b232" />
          <stop offset="1" stopColor="#8a5a08" />
        </radialGradient>
        <radialGradient id={id("ball")} cx="35%" cy="30%" r="70%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#b9bcc6" />
        </radialGradient>
        <filter id={id("shadow")} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#000" floodOpacity="0.55" />
        </filter>
      </defs>

      <g filter={`url(#${id("shadow")})`}>
        <circle cx="50" cy="50" r="46" fill={`url(#${id("rim")})`} />
        <circle cx="50" cy="50" r="41.5" fill="#3a1d0c" />
      </g>
      {pockets}
      <circle cx="50" cy="50" r="27" fill={`url(#${id("cone")})`} stroke="#e9c46a" strokeWidth="1" />
      {/* Croisillon du moyeu. */}
      <g stroke={`url(#${id("hub")})`} strokeWidth="3" strokeLinecap="round">
        <path d="M50 30v40M30 50h40" />
      </g>
      <circle cx="50" cy="50" r="7.5" fill={`url(#${id("hub")})`} />
      <circle cx="50" cy="50" r="2.5" fill="#fff6cc" />
      {/* La bille, posée dans une case. */}
      <circle cx="50" cy="16.5" r="3.6" fill={`url(#${id("ball")})`} stroke="#000" strokeOpacity="0.3" strokeWidth="0.5" />
      {/* Reflet de la jante. */}
      <path d="M18 30A38 38 0 0 1 42 9" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

/** Un « 7 » dessiné (pas de police : rendu identique partout), dans une case 10 × 14. */
const SEVEN = "M0 0h10v2.6L4.8 14H1.6l5-11.2H0Z";

/** Machine à sous : fronton, trois rouleaux « 777 », levier. */
function SlotsIcon({ id }: { id: IdFn }) {
  return (
    <>
      <defs>
        <linearGradient id={id("body")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0364a" />
          <stop offset="1" stopColor="#7d0716" />
        </linearGradient>
        <linearGradient id={id("gold")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3c0" />
          <stop offset="0.4" stopColor="#f2bd36" />
          <stop offset="1" stopColor="#8a5a08" />
        </linearGradient>
        <linearGradient id={id("reel")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9a968c" />
          <stop offset="0.3" stopColor="#ffffff" />
          <stop offset="0.7" stopColor="#ffffff" />
          <stop offset="1" stopColor="#9a968c" />
        </linearGradient>
        <linearGradient id={id("seven")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff6b6b" />
          <stop offset="1" stopColor="#a3000f" />
        </linearGradient>
        <radialGradient id={id("knob")} cx="35%" cy="30%" r="70%">
          <stop offset="0" stopColor="#ffb3b3" />
          <stop offset="0.4" stopColor="#ef2335" />
          <stop offset="1" stopColor="#6d0010" />
        </radialGradient>
        <filter id={id("shadow")} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#000" floodOpacity="0.55" />
        </filter>
      </defs>

      <g filter={`url(#${id("shadow")})`}>
        {/* Levier. */}
        <rect x="80" y="40" width="7" height="14" rx="2" fill={`url(#${id("gold")})`} />
        <path d="M84.5 46V22" stroke="#c9c9cf" strokeWidth="3" strokeLinecap="round" />
        <circle cx="84.5" cy="19" r="6" fill={`url(#${id("knob")})`} />

        {/* Fronton. */}
        <path d="M18 30c0-12 10-20 32-20s32 8 32 20Z" fill={`url(#${id("gold")})`} />
        <path d="M24 28c1-8 9-13 26-13s25 5 26 13Z" fill="#7d0716" />
        <g fill="#ffe28a">
          <circle cx="36" cy="22" r="1.6" />
          <circle cx="50" cy="19" r="1.6" />
          <circle cx="64" cy="22" r="1.6" />
        </g>

        {/* Caisse. */}
        <rect x="14" y="28" width="72" height="62" rx="9" fill={`url(#${id("gold")})`} />
        <rect x="18" y="32" width="64" height="54" rx="6" fill={`url(#${id("body")})`} />

        {/* Fenêtre des rouleaux. */}
        <rect x="22" y="38" width="56" height="28" rx="4" fill="#1a0b0e" />
        {[24.5, 42.5, 60.5].map((x) => (
          <g key={x}>
            <rect x={x} y="40" width="15" height="24" rx="2" fill={`url(#${id("reel")})`} />
            <path d={SEVEN} transform={`translate(${x + 2.5} 44) scale(1 1.15)`} fill={`url(#${id("seven")})`} />
          </g>
        ))}
        {/* Ligne de paiement. */}
        <path d="M22 52h56" stroke="#ffd23f" strokeOpacity="0.8" strokeWidth="1" />

        {/* Fente et bac. */}
        <rect x="40" y="71" width="20" height="3" rx="1.5" fill="#3a0208" />
        <rect x="30" y="78" width="40" height="5" rx="2.5" fill="#3a0208" />
      </g>
      {/* Reflet. */}
      <path d="M24 34h20" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

/** Pièce d'or vue de face, avec sa tranche et un éclat. */
function CoinIcon({ id }: { id: IdFn }) {
  return (
    <>
      <defs>
        <radialGradient id={id("face")} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#fff6cc" />
          <stop offset="0.45" stopColor="#f2bd36" />
          <stop offset="1" stopColor="#9a6408" />
        </radialGradient>
        <linearGradient id={id("edge")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b57a0c" />
          <stop offset="1" stopColor="#5c3800" />
        </linearGradient>
        <linearGradient id={id("emboss")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff2b0" />
          <stop offset="1" stopColor="#b98208" />
        </linearGradient>
        <filter id={id("shadow")} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#000" floodOpacity="0.55" />
        </filter>
      </defs>

      <g filter={`url(#${id("shadow")})`}>
        {/* Tranche (la pièce a de l'épaisseur). */}
        <circle cx="50" cy="55" r="38" fill={`url(#${id("edge")})`} />
        <circle cx="50" cy="50" r="38" fill={`url(#${id("face")})`} />
      </g>
      <circle cx="50" cy="50" r="31" fill="none" stroke="#8a5a08" strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="1.5 2.5" />
      <circle cx="50" cy="50" r="27" fill="none" stroke="#fff3c0" strokeOpacity="0.7" strokeWidth="1" />
      {/* Étoile en relief : ombre décalée, puis la face. */}
      <path
        d="M50 31l5.6 11.4 12.6 1.8-9.1 8.9 2.1 12.5L50 59.7l-11.2 5.9 2.1-12.5-9.1-8.9 12.6-1.8Z"
        fill="#7a4d05"
        transform="translate(1 1.5)"
      />
      <path
        d="M50 31l5.6 11.4 12.6 1.8-9.1 8.9 2.1 12.5L50 59.7l-11.2 5.9 2.1-12.5-9.1-8.9 12.6-1.8Z"
        fill={`url(#${id("emboss")})`}
      />
      {/* Reflet et éclat. */}
      <path d="M24 38A28 28 0 0 1 44 21" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M80 12l1.8 5.2L87 19l-5.2 1.8L80 26l-1.8-5.2L73 19l5.2-1.8Z" fill="#fffbe6" />
    </>
  );
}
