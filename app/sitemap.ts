import type { MetadataRoute } from "next";
import { GAMES } from "@/lib/games/registry";
import { siteSeo } from "@/lib/seo/config";
import { listAvailableUniverses } from "@/lib/universes/current";
import { universePath } from "@/lib/universes/routing";

/**
 * Sitemap généré depuis le registre des jeux (source unique) et la liste des
 * univers. N'inclut que les pages publiques et durables : le hub, puis pour
 * CHAQUE univers sa landing, son catalogue et chaque jeu « live ». On exclut les
 * routes éphémères (`[code]` de lobby), privées (`/account`, `/admin`) et d'auth
 * — déjà en `noindex`.
 *
 * Un seul domaine sert tous les animes (l'univers est un préfixe de chemin), donc
 * ce sitemap unique les couvre tous.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ url: SITE_URL }, universes] = await Promise.all([
    siteSeo(),
    listAvailableUniverses(),
  ]);
  const now = new Date();

  // Le hub (choix d'univers), à la racine.
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
  ];

  const liveGames = GAMES.filter((g) => g.status !== "coming-soon");

  for (const { slug } of universes) {
    const abs = (path: string) => `${SITE_URL}${universePath(path, slug)}`;

    entries.push(
      { url: abs("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
      {
        url: abs("/games"),
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.9,
      },
      ...liveGames.map((g) => ({
        url: abs(g.route),
        lastModified: now,
        // JJKdle change chaque jour (perso du jour) → fraîcheur maximale.
        changeFrequency: (g.id === "jjkdle" ? "daily" : "weekly") as
          | "daily"
          | "weekly",
        priority: g.id === "jjkdle" || g.id === "builder" ? 0.9 : 0.8,
      })),
    );
  }

  return entries;
}
