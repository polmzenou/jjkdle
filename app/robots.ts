import type { MetadataRoute } from "next";
import { siteSeo } from "@/lib/seo/config";

/**
 * robots.txt généré. Autorise tout le contenu public, bloque le privé et les
 * routes à faible valeur SEO (API, profils dynamiques, lobbys). Référence le
 * sitemap pour accélérer la découverte par Google/Bing.
 *
 * Par UNIVERS : l'URL renvoyée est celle du domaine réellement servi.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const { url } = await siteSeo();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin", "/account", "/login", "/register", "/u/"],
    },
    sitemap: `${url}/sitemap.xml`,
    host: url,
  };
}
