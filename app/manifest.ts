import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo/config";

/**
 * Web App Manifest : rend le site installable (PWA) et renforce le signal
 * « application » (icône, thème). `icon.png` sert les deux tailles déclarées ;
 * remplacer par des icônes dédiées 192/512 améliorera le rendu à l'installation.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME + " — Mini-jeux Jujutsu Kaisen",
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: "#7c3aed",
    lang: "fr",
    categories: ["games", "entertainment"],
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  };
}
