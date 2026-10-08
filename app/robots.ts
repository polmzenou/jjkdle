import type { MetadataRoute } from "next";
import { isIndexableDeployment, siteSeo } from "@/lib/seo/config";

/**
 * robots.txt généré. Autorise tout le contenu public, bloque l'admin et les
 * API. Référence le sitemap pour accélérer la découverte par Google/Bing.
 *
 * Par UNIVERS : l'URL renvoyée est celle du domaine réellement servi.
 *
 * Les pages privées sous préfixe d'univers (`/jjk/account`, `/jjk/u/…`) ne sont
 * PAS bloquées ici : elles portent un `noindex`, que Google ne pourrait plus lire
 * si l'exploration lui était interdite. Les previews Vercel sont fermées à tous.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const { url } = await siteSeo();
  if (!isIndexableDeployment) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // `/login` et `/register` ne sont PAS bloqués : ils portent un `noindex`
      // que Google ne pourrait pas lire s'il n'avait pas le droit d'y aller.
      disallow: ["/api/", "/*/api/", "/admin"],
    },
    sitemap: `${url}/sitemap.xml`,
  };
}
