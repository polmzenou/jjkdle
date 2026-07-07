import type { MetadataRoute } from "next";
import { GAMES } from "@/lib/games/registry";
import { SITE_URL } from "@/lib/seo/config";

/**
 * Sitemap généré depuis le registre des jeux (source unique). N'inclut que les
 * pages publiques et durables : home, hub, et chaque jeu « live ». On exclut les
 * routes éphémères (`[code]` de lobby), privées (`/account`, `/admin`) et
 * d'auth — déjà en `noindex`.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/games`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  const gamePages: MetadataRoute.Sitemap = GAMES.filter(
    (g) => g.status !== "coming-soon",
  ).map((g) => ({
    url: `${SITE_URL}${g.route}`,
    lastModified: now,
    // JJKdle change chaque jour (perso du jour) → priorité/fraîcheur maximale.
    changeFrequency: g.id === "jjkdle" ? "daily" : "weekly",
    priority: g.id === "jjkdle" || g.id === "builder" ? 0.9 : 0.8,
  }));

  return [...staticPages, ...gamePages];
}
