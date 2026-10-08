import { ImageResponse } from "next/og";
import { gamesForUniverse } from "@/lib/games/registry";
import { getUniverseBySlug, listUniverses } from "@/lib/universes/registry";
import { PLATFORM_NAME } from "@/lib/seo/config";

/**
 * Image d'aperçu social par défaut (1200×630), générée à la volée. Sert de
 * `og:image`/`twitter:image` pour la home et toute page sans image dédiée.
 * Texte latin uniquement (la police par défaut de `next/og` ne rend pas le CJK).
 *
 * `?u=<slug>` rend l'image d'un UNIVERS (nom, œuvre, ses jeux, sa palette) ;
 * sans paramètre (ou slug inconnu), celle de la PLATEFORME. Était figée sur JJK :
 * un partage de /csm affichait « JJK Arcade — Mini-jeux Jujutsu Kaisen ».
 */
export const runtime = "nodejs";

const size = { width: 1200, height: 630 };

/** Jeux cités en pied d'image (4 max : au-delà, la ligne déborde). */
const FEATURED_GAMES = ["jjkdle", "guesswho", "jujutsu-draft", "higher-lower"];

function content(slug: string | null) {
  const universe = slug ? getUniverseBySlug(slug) : undefined;
  if (!universe) {
    return {
      kicker: "Fan Arcade",
      name: PLATFORM_NAME,
      subtitle: "Mini-jeux anime gratuits",
      items: listUniverses().map((u) => u.sourceWork).slice(0, 4),
      glow: "#2a1656",
      accent: "#a78bfa",
      surface: "#0a0a0f",
    };
  }
  const games = gamesForUniverse(universe.gameCopy);
  return {
    kicker: "Fan Arcade",
    name: universe.name,
    subtitle: `Mini-jeux ${universe.sourceWork}`,
    items: FEATURED_GAMES.map(
      (id) => games.find((g) => g.id === id)?.title ?? id,
    ),
    glow: universe.theme.primaryDark,
    accent: universe.theme.primaryLight,
    surface: universe.theme.surface.s900,
  };
}

export function GET(request: Request) {
  const c = content(new URL(request.url).searchParams.get("u"));
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
            `radial-gradient(120% 100% at 50% 0%, ${c.glow} 0%, ${c.surface} 60%)`,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 34,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: c.accent,
          }}
        >
          {c.kicker}
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
          {c.name}
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 40,
            color: "rgba(255,255,255,0.7)",
          }}
        >
          {c.subtitle}
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
          {c.items.map((item, i) => (
            <span key={item} style={{ display: "flex", gap: 16 }}>
              {i > 0 && <span>·</span>}
              <span>{item}</span>
            </span>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
