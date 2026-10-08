import type { MetadataRoute } from "next";
import { hubSeo, PLATFORM_NAME } from "@/lib/seo/config";
import { getCurrentUniverseConfig } from "@/lib/universes/current";

/**
 * Web App Manifest : rend le site installable (PWA) et renforce le signal
 * « application » (icône, thème). `icon.png` sert les deux tailles déclarées ;
 * remplacer par des icônes dédiées 192/512 améliorera le rendu à l'installation.
 *
 * Un seul manifest pour tout le domaine (`start_url: "/"`, le hub) : nom et
 * description sont ceux de la PLATEFORME. Ils venaient de l'univers du cookie,
 * si bien qu'un visiteur ou un robot sans cookie voyait « JJK Arcade » pour un
 * site qui sert six animes. Seules les couleurs suivent l'anime visité.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const [hub, universe] = await Promise.all([
    hubSeo(),
    getCurrentUniverseConfig(),
  ]);
  return {
    name: hub.title,
    short_name: PLATFORM_NAME,
    description: hub.description,
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
