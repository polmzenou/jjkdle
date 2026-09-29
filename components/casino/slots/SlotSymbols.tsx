import type { SlotSymbol } from "@/lib/casino/slots";

/**
 * Les symboles de la machine à sous, dessinés en SVG (aucune image, aucun
 * emoji — même principe que la pièce du pile ou face et les cartes du
 * blackjack). Chaque symbole occupe une case de 100 × 100 centrée en (50, 50) ;
 * c'est au parent de le placer avec un `transform`.
 *
 * Les dégradés sont déclarés UNE fois par `<SlotDefs />`, que le SVG hôte doit
 * monter dans ses `<defs>` : 3 rouleaux × 160 cases dupliquant chacune ses
 * dégradés feraient des milliers de nœuds pour rien.
 */

export function SlotDefs() {
  return (
    <>
      <radialGradient id="slot-cherry" cx="35%" cy="30%" r="75%">
        <stop offset="0" stopColor="#ffd1d1" />
        <stop offset="0.3" stopColor="#ff3b4a" />
        <stop offset="1" stopColor="#8a0412" />
      </radialGradient>
      <radialGradient id="slot-lemon" cx="35%" cy="30%" r="80%">
        <stop offset="0" stopColor="#fffbd0" />
        <stop offset="0.35" stopColor="#ffe23a" />
        <stop offset="1" stopColor="#c28a00" />
      </radialGradient>
      <radialGradient id="slot-orange" cx="35%" cy="30%" r="80%">
        <stop offset="0" stopColor="#ffe3c0" />
        <stop offset="0.35" stopColor="#ff9a1f" />
        <stop offset="1" stopColor="#b44b00" />
      </radialGradient>
      <radialGradient id="slot-plum" cx="35%" cy="30%" r="80%">
        <stop offset="0" stopColor="#f0d4ff" />
        <stop offset="0.35" stopColor="#9b3bd6" />
        <stop offset="1" stopColor="#3d0a5e" />
      </radialGradient>
      <linearGradient id="slot-gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff6c8" />
        <stop offset="0.35" stopColor="#ffd23f" />
        <stop offset="0.7" stopColor="#d99a00" />
        <stop offset="1" stopColor="#7a4a00" />
      </linearGradient>
      <linearGradient id="slot-red7" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ff8a8a" />
        <stop offset="0.45" stopColor="#f0142b" />
        <stop offset="1" stopColor="#7d0010" />
      </linearGradient>
      <linearGradient id="slot-gem" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#e6fdff" />
        <stop offset="0.5" stopColor="#4fd8ff" />
        <stop offset="1" stopColor="#0a5a9c" />
      </linearGradient>
      <radialGradient id="slot-wild" cx="50%" cy="50%" r="60%">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.35" stopColor="#ff7ae6" />
        <stop offset="1" stopColor="#6b1fd1" />
      </radialGradient>
      <linearGradient id="slot-leaf" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#9bf07a" />
        <stop offset="1" stopColor="#1d7a2c" />
      </linearGradient>
    </>
  );
}

const SHINE = "rgb(255 255 255 / 0.75)";

export function SlotSymbolArt({ symbol }: { symbol: SlotSymbol }) {
  switch (symbol) {
    case "CHERRY":
      return (
        <g>
          <path d="M50 22 C46 40 38 50 32 62" stroke="#2f7a22" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M50 22 C56 40 64 48 68 58" stroke="#2f7a22" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M50 22 C62 12 78 16 82 26 C70 30 58 28 50 22Z" fill="url(#slot-leaf)" stroke="#16501d" strokeWidth="1.5" />
          <circle cx="32" cy="68" r="16" fill="url(#slot-cherry)" stroke="#5c0009" strokeWidth="2" />
          <circle cx="68" cy="64" r="16" fill="url(#slot-cherry)" stroke="#5c0009" strokeWidth="2" />
          <ellipse cx="26" cy="62" rx="4" ry="3" fill={SHINE} />
          <ellipse cx="62" cy="58" rx="4" ry="3" fill={SHINE} />
        </g>
      );
    case "LEMON":
      return (
        <g>
          <path
            d="M14 52 C18 30 40 20 56 22 C72 24 86 36 88 50 C90 56 86 58 86 60 C80 76 62 82 46 80 C30 78 18 70 14 58 C12 56 12 54 14 52Z"
            fill="url(#slot-lemon)"
            stroke="#8a6200"
            strokeWidth="2"
          />
          <ellipse cx="38" cy="38" rx="10" ry="5" transform="rotate(-20 38 38)" fill={SHINE} />
          {[
            [44, 56],
            [58, 48],
            [64, 64],
            [30, 60],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" fill="#b88400" opacity="0.6" />
          ))}
        </g>
      );
    case "ORANGE":
      return (
        <g>
          <circle cx="50" cy="54" r="30" fill="url(#slot-orange)" stroke="#8a3a00" strokeWidth="2" />
          <path d="M50 25 C56 14 70 12 76 18 C68 26 58 28 50 25Z" fill="url(#slot-leaf)" stroke="#16501d" strokeWidth="1.5" />
          <circle cx="50" cy="26" r="3" fill="#5a3b00" />
          <ellipse cx="38" cy="42" rx="8" ry="5" transform="rotate(-30 38 42)" fill={SHINE} />
          {[
            [60, 50],
            [44, 64],
            [62, 68],
            [34, 56],
            [52, 76],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" fill="#b85500" opacity="0.6" />
          ))}
        </g>
      );
    case "PLUM":
      return (
        <g>
          <path d="M52 24 C52 18 56 14 60 12" stroke="#5a3b00" strokeWidth="4" fill="none" strokeLinecap="round" />
          <ellipse cx="50" cy="56" rx="28" ry="31" fill="url(#slot-plum)" stroke="#2b0544" strokeWidth="2" />
          <path d="M50 27 C44 44 44 70 50 86" stroke="#2b0544" strokeWidth="2" fill="none" opacity="0.5" />
          <ellipse cx="38" cy="42" rx="6" ry="9" transform="rotate(20 38 42)" fill={SHINE} opacity="0.8" />
        </g>
      );
    case "BELL":
      return (
        <g>
          <circle cx="50" cy="18" r="5" fill="url(#slot-gold)" stroke="#6b4300" strokeWidth="1.5" />
          <path
            d="M50 22 C34 22 28 36 28 52 C28 62 24 68 16 74 L84 74 C76 68 72 62 72 52 C72 36 66 22 50 22Z"
            fill="url(#slot-gold)"
            stroke="#6b4300"
            strokeWidth="2.5"
          />
          <rect x="14" y="72" width="72" height="8" rx="4" fill="url(#slot-gold)" stroke="#6b4300" strokeWidth="2" />
          <circle cx="50" cy="84" r="7" fill="url(#slot-gold)" stroke="#6b4300" strokeWidth="2" />
          <path d="M38 34 C34 42 34 54 34 62" stroke={SHINE} strokeWidth="4" strokeLinecap="round" fill="none" />
        </g>
      );
    case "BAR":
      return (
        <g>
          <rect x="10" y="30" width="80" height="40" rx="7" fill="#101014" stroke="url(#slot-gold)" strokeWidth="5" />
          <rect x="16" y="36" width="68" height="28" rx="4" fill="none" stroke="#ffd23f" strokeOpacity="0.35" strokeWidth="1.5" />
          <text
            x="50"
            y="60"
            textAnchor="middle"
            fontFamily="Impact, 'Arial Black', sans-serif"
            fontSize="27"
            fontWeight="900"
            letterSpacing="2"
            fill="url(#slot-gold)"
          >
            BAR
          </text>
        </g>
      );
    case "SEVEN":
      return (
        <g>
          <path
            d="M20 18 L82 18 L82 30 C66 46 56 64 52 86 L32 86 C36 64 46 46 60 32 L34 32 L34 40 L20 40Z"
            fill="url(#slot-red7)"
            stroke="url(#slot-gold)"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path d="M26 23 L76 23" stroke={SHINE} strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case "DIAMOND":
      return (
        <g>
          <polygon points="50,86 12,38 26,18 74,18 88,38" fill="url(#slot-gem)" stroke="#0a3d6b" strokeWidth="2.5" strokeLinejoin="round" />
          <polygon points="12,38 88,38 74,18 26,18" fill="#bff4ff" opacity="0.55" />
          <polyline points="26,18 36,38 50,18 64,38 74,18" fill="none" stroke="#0a3d6b" strokeWidth="1.5" opacity="0.6" />
          <polyline points="12,38 50,86 88,38" fill="none" stroke="#0a3d6b" strokeWidth="1" opacity="0.4" />
          <polyline points="36,38 50,86 64,38" fill="none" stroke="#0a3d6b" strokeWidth="1.5" opacity="0.5" />
          <path d="M72 8 L74 14 L80 16 L74 18 L72 24 L70 18 L64 16 L70 14Z" fill="#fff" />
        </g>
      );
    case "WILD":
      return (
        <g>
          <polygon
            points={starPoints(50, 50, 42, 20, 10)}
            fill="url(#slot-wild)"
            stroke="#3a0a7a"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <text
            x="50"
            y="58"
            textAnchor="middle"
            fontFamily="Impact, 'Arial Black', sans-serif"
            fontSize="22"
            fontWeight="900"
            fill="#fff"
            stroke="#3a0a7a"
            strokeWidth="1.2"
            letterSpacing="1"
          >
            WILD
          </text>
        </g>
      );
  }
}

function starPoints(cx: number, cy: number, outer: number, inner: number, spikes: number): string {
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

/** Pastille autonome (petit SVG) pour la table des gains et l'historique. */
export function SlotSymbolIcon({ symbol, className }: { symbol: SlotSymbol; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <defs>
        <SlotDefs />
      </defs>
      <SlotSymbolArt symbol={symbol} />
    </svg>
  );
}
