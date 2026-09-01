import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { TOWER_FLOORS } from "@/lib/games/tower/types";
import { getUniverseBySlug } from "@/lib/universes/registry";

/**
 * Image de PARTAGE d'une ascension (1200×630), générée à la volée.
 *
 *   /og/tower?floor=17&score=2140&attempt=3&u=jjk
 *
 * Pourquoi une route dédiée plutôt que l'image par défaut du site : une
 * ascension est un RÉSULTAT, et un résultat ne se partage que s'il porte un
 * chiffre. « J'ai atteint l'étage 17 » est une invitation à faire mieux ;
 * « JJK Arcade » n'en est pas une.
 *
 * Tout vient de l'URL, rien de la base : l'image doit pouvoir être générée par
 * un crawler qui n'a ni session ni cookie de run. Elle n'est donc pas une
 * preuve — n'importe qui peut forger l'URL — et c'est sans conséquence : le
 * classement, lui, est calculé côté serveur.
 *
 * Texte latin uniquement (la police par défaut de `next/og` ne rend pas le CJK).
 */
export const runtime = "nodejs";

const size = { width: 1200, height: 630 };

/** Entier borné lu dans l'URL. Une valeur absurde ne doit pas produire une image absurde. */
function intParam(
  request: NextRequest,
  key: string,
  min: number,
  max: number,
): number {
  const raw = Number(request.nextUrl.searchParams.get(key));
  if (!Number.isFinite(raw)) return min;
  return Math.max(min, Math.min(max, Math.trunc(raw)));
}

export function GET(request: NextRequest) {
  const floor = intParam(request, "floor", 0, TOWER_FLOORS);
  const score = intParam(request, "score", 0, 999_999);
  const attempt = intParam(request, "attempt", 0, 999);
  const cleared = floor >= TOWER_FLOORS;

  // Le thème suit l'univers : la même image en violet sur JJK et en vert sur
  // AOT, sans quoi le partage renverrait tout le monde vers l'identité JJK.
  const universe =
    getUniverseBySlug(request.nextUrl.searchParams.get("u") ?? "jjk") ??
    getUniverseBySlug("jjk");
  const accent = universe?.theme.primaryLight ?? "#a78bfa";
  const deep = universe?.theme.surface.s900 ?? "#0a0a0f";
  const gold = "#fcd34d";

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
          background: `radial-gradient(120% 100% at 50% 0%, ${accent}33 0%, ${deep} 62%)`,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 30,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: accent,
          }}
        >
          The Culling Tower
        </div>

        {/* Le CHIFFRE est le sujet de l'image : il occupe la moitié de la
            hauteur, parce qu'un aperçu social se lit en vignette. */}
        <div
          style={{
            marginTop: 10,
            display: "flex",
            alignItems: "baseline",
            gap: 18,
            color: cleared ? gold : "#ffffff",
          }}
        >
          <span style={{ fontSize: 52, opacity: 0.75 }}>ÉTAGE</span>
          <span style={{ fontSize: 190, fontWeight: 800, letterSpacing: -6 }}>
            {floor}
          </span>
          <span style={{ fontSize: 52, opacity: 0.55 }}>/ {TOWER_FLOORS}</span>
        </div>

        <div
          style={{
            marginTop: 4,
            fontSize: 40,
            fontWeight: 700,
            color: cleared ? gold : "rgba(255,255,255,0.82)",
          }}
        >
          {cleared
            ? attempt === 1
              ? "Sommet atteint — du premier essai"
              : "Sommet atteint"
            : "Ascension interrompue"}
        </div>

        <div
          style={{
            marginTop: 36,
            display: "flex",
            gap: 18,
            fontSize: 26,
            color: "rgba(255,255,255,0.5)",
          }}
        >
          <span>{score} points</span>
          {attempt > 0 && <span>·</span>}
          {attempt > 0 && <span>essai n°{attempt}</span>}
          <span>·</span>
          <span>1 tour par jour, la même pour tous</span>
        </div>
      </div>
    ),
    size,
  );
}
