import type { MetadataRoute } from "next";
import { siteSeo } from "@/lib/seo/config";
import { getCurrentUniverseConfig } from "@/lib/universes/current";

/**
 * Web App Manifest : rend le site installable (PWA) et renforce le signal
 * « application » (icône, thème). `icon.png` sert les deux tailles déclarées ;
 * remplacer par des icônes dédiées 192/512 améliorera le rendu à l'installation.
 *
 * Par UNIVERS : nom, description et couleurs viennent de l'anime servi.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const [seo, universe] = await Promise.all([
    siteSeo(),
    getCurrentUniverseConfig(),
  ]);
  return {
    name: seo.title,
    short_name: seo.name,
    description: seo.description,
    start_url: "/",
    display: "standalone",
    background_color: universe.theme.surface.s900,
    theme_color: universe.theme.primary,
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
