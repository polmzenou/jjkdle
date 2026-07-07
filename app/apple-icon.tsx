import { ImageResponse } from "next/og";

/**
 * Apple touch icon (écran d'accueil iOS), générée à la volée pour éviter un
 * asset binaire. 180×180, fond de marque + monogramme « JJK ».
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #7c3aed 0%, #2a1656 100%)",
          color: "white",
          fontSize: 64,
          fontWeight: 800,
          fontFamily: "sans-serif",
          letterSpacing: -2,
        }}
      >
        JJK
      </div>
    ),
    size,
  );
}
