import { ImageResponse } from "next/og";

/**
 * Image d'aperçu social par défaut (1200×630), générée à la volée. Sert de
 * `og:image`/`twitter:image` pour la home et toute page sans image dédiée.
 * Texte latin uniquement (la police par défaut de `next/og` ne rend pas le CJK).
 */
export const runtime = "nodejs";

const size = { width: 1200, height: 630 };

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(120% 100% at 50% 0%, #2a1656 0%, #0a0a0f 60%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 34,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: "#a78bfa",
          }}
        >
          Fan Arcade
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 120,
            fontWeight: 800,
            letterSpacing: -2,
            color: "#ffffff",
          }}
        >
          JJK Arcade
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 40,
            color: "rgba(255,255,255,0.7)",
          }}
        >
          Mini-jeux Jujutsu Kaisen
        </div>
        <div
          style={{
            marginTop: 40,
            display: "flex",
            gap: 16,
            fontSize: 26,
            color: "rgba(255,255,255,0.55)",
          }}
        >
          <span>JJKdle</span>
          <span>·</span>
          <span>Qui est-ce ?</span>
          <span>·</span>
          <span>Draft</span>
          <span>·</span>
          <span>Higher / Lower</span>
        </div>
      </div>
    ),
    size,
  );
}
