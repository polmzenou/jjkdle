/**
 * Couche décorative "manga / Jujutsu Kaisen" pour la landing.
 *
 * Purement visuelle (aria-hidden, pointer-events-none) et 100 % CSS/SVG :
 * aucune image copyrightée, net sur tous les écrans, perf-friendly.
 *
 * Contient :
 *  - une trame halftone façon impression manga,
 *  - des lignes de concentration (集中線) derrière le hero,
 *  - des colonnes de kanji en fond sur les côtés,
 *  - deux "objets maudits" stylisés (ofuda 呪符, sceau 縛り).
 *
 * Volontairement aéré pour ne pas surcharger : la trame et les lignes de
 * concentration sont visibles partout ; les colonnes de kanji apparaissent
 * dès `md` et les objets maudits dès `lg`, pour ne pas empiéter sur le
 * contenu en mobile.
 */
export function MangaDecor() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-[5] overflow-hidden"
    >
      {/* ── Trame halftone (points d'impression manga) ── */}
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.65) 1px, transparent 1.5px)",
          backgroundSize: "14px 14px",
          maskImage:
            "radial-gradient(150% 120% at 50% 15%, black 0%, black 45%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(150% 120% at 50% 15%, black 0%, black 45%, transparent 85%)",
        }}
      />

      {/* ── Lignes de concentration (集中線) derrière le hero ── */}
      <div
        className="absolute left-1/2 top-[-18%] h-[80vh] w-[80vh] -translate-x-1/2 opacity-[0.45]"
        style={{
          background:
            "repeating-conic-gradient(from 0deg at 50% 50%, rgba(167,139,250,0.16) 0deg 0.55deg, transparent 0.55deg 4.2deg)",
          maskImage:
            "radial-gradient(circle, transparent 26%, black 58%, transparent 82%)",
          WebkitMaskImage:
            "radial-gradient(circle, transparent 26%, black 58%, transparent 82%)",
        }}
      />

      {/* ── Colonnes de kanji en fond — côté gauche ── */}
      <KanjiColumn
        className="left-3 top-28 text-white/[0.09] xl:left-6"
        text="呪術廻"
        size="clamp(3.5rem, 7vw, 6.5rem)"
      />
      <KanjiColumn
        className="left-6 top-[58%] text-domain-light/[0.13]"
        text="領域展開"
        size="clamp(2.5rem, 4.5vw, 4rem)"
      />

      {/* ── Colonnes de kanji en fond — côté droit ── */}
      <KanjiColumn
        className="right-3 top-20 text-white/[0.09] xl:right-6"
        text="無量空処"
        size="clamp(3.5rem, 7vw, 6.5rem)"
      />
      <KanjiColumn
        className="right-7 top-[62%] text-cursed-light/[0.13]"
        text="両面宿儺"
        size="clamp(2.5rem, 4.5vw, 4rem)"
      />

      {/* ── Objets maudits flottants (2 accents discrets, dès lg) ── */}
      <FloatingObject className="left-[4%] top-[32%]" delay="0s" duration="8s" rotate={-8}>
        <Ofuda />
      </FloatingObject>
      <FloatingObject className="right-[5%] top-[58%]" delay="1.4s" duration="9s" rotate={9}>
        <CursedSeal />
      </FloatingObject>
    </div>
  );
}

/** Colonne de kanji écrite verticalement (vertical-rl), posée en fond. */
function KanjiColumn({
  text,
  className,
  size,
}: {
  text: string;
  className: string;
  size: string;
}) {
  return (
    <span
      className={`absolute hidden select-none font-display font-black tracking-[0.15em] md:block ${className}`}
      style={{
        writingMode: "vertical-rl",
        textOrientation: "upright",
        fontSize: size,
      }}
    >
      {text}
    </span>
  );
}

/** Conteneur d'objet décoratif : flottement lent + légère inclinaison. */
function FloatingObject({
  children,
  className,
  delay,
  duration,
  rotate,
}: {
  children: React.ReactNode;
  className: string;
  delay: string;
  duration: string;
  rotate: number;
}) {
  // Le `float` anime `transform: translateY` → la rotation va sur un enfant
  // pour ne pas être écrasée pendant l'animation.
  return (
    <div
      className={`absolute hidden animate-float opacity-80 drop-shadow-[0_0_22px_rgba(124,58,237,0.35)] lg:block ${className}`}
      style={{ animationDelay: delay, animationDuration: duration }}
    >
      <div style={{ transform: `rotate(${rotate}deg)` }}>{children}</div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Objets maudits stylisés (SVG vectoriel — aucune image copyrightée)
 * ────────────────────────────────────────────────────────────────────────── */

/** Ofuda (呪符) — talisman de papier avec sceau et kanji rouges. */
function Ofuda() {
  return (
    <svg viewBox="0 0 64 184" className="h-36 w-auto xl:h-44" fill="none">
      <rect x="11" y="6" width="42" height="172" rx="2" fill="#ece4cf" />
      <rect
        x="11"
        y="6"
        width="42"
        height="172"
        rx="2"
        stroke="#b91c1c"
        strokeWidth="1.5"
      />
      {/* sceau en tête */}
      <rect x="22" y="13" width="20" height="20" rx="1" fill="#b91c1c" opacity="0.9" />
      <text
        x="32"
        y="28"
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fill="#ece4cf"
      >
        呪
      </text>
      {/* colonne de kanji centrale */}
      {["術", "式", "発", "動"].map((k, i) => (
        <text
          key={k}
          x="32"
          y={58 + i * 26}
          textAnchor="middle"
          fontSize="17"
          fontWeight="700"
          fill="#7f1d1d"
        >
          {k}
        </text>
      ))}
      {/* déchirure du bas */}
      <path d="M11 178 L20 172 L29 178 L38 171 L47 178 L53 173" stroke="#b91c1c" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

/** Sceau d'asservissement (縛り) — cercles concentriques et marques radiales. */
function CursedSeal() {
  const ticks = Array.from({ length: 24 });
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-auto xl:h-32" fill="none">
      <circle cx="60" cy="60" r="54" stroke="#a78bfa" strokeWidth="1.5" opacity="0.55" />
      <circle cx="60" cy="60" r="44" stroke="#a78bfa" strokeWidth="0.8" opacity="0.4" />
      <circle cx="60" cy="60" r="30" stroke="#7c3aed" strokeWidth="1.2" opacity="0.6" />
      {/* marques radiales */}
      {ticks.map((_, i) => {
        const a = (i / ticks.length) * Math.PI * 2;
        const x1 = 60 + Math.cos(a) * 44;
        const y1 = 60 + Math.sin(a) * 44;
        const x2 = 60 + Math.cos(a) * 54;
        const y2 = 60 + Math.sin(a) * 54;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#a78bfa"
            strokeWidth={i % 2 === 0 ? 1.4 : 0.6}
            opacity="0.45"
          />
        );
      })}
      {/* triangle de scellé */}
      <path d="M60 36 L82 78 L38 78 Z" stroke="#c4b5fd" strokeWidth="1" opacity="0.5" />
      <text
        x="60"
        y="70"
        textAnchor="middle"
        fontSize="26"
        fontWeight="800"
        fill="#c4b5fd"
        opacity="0.85"
      >
        縛
      </text>
    </svg>
  );
}
