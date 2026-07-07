import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/config";

/**
 * robots.txt généré. Autorise tout le contenu public, bloque le privé et les
 * routes à faible valeur SEO (API, profils dynamiques, lobbys). Référence le
 * sitemap pour accélérer la découverte par Google/Bing.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin", "/account", "/login", "/register", "/u/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
