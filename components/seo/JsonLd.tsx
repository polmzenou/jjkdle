import { universeGame, universeGames } from "@/lib/games/universe";
import { siteSeo, absoluteUrl } from "@/lib/seo/config";
import {
  getCurrentUniverseConfig,
  universeHref,
} from "@/lib/universes/current";

/**
 * Données structurées schema.org (JSON-LD). Aident Google à comprendre le site
 * et débloquent d'éventuels rich results. Rendu côté serveur via un `<script>`
 * inline (autorisé par la CSP : `script-src 'self' 'unsafe-inline'`).
 *
 * On sérialise avec `JSON.stringify` et on neutralise `<` pour éviter toute
 * fermeture prématurée du `<script>`.
 */
function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

/** Locale SEO ("fr_FR" → "fr-FR"). */
function bcp47(locale: string): string {
  return locale.replace("_", "-");
}

/** WebSite + Organization de l'univers courant : injecté une fois dans le layout. */
export async function SiteJsonLd() {
  const seo = await siteSeo();
  const universe = await getCurrentUniverseConfig();
  // L'entité « site » d'un univers est sa landing (/jjk), pas la racine (le hub).
  const SITE_URL = await absoluteUrl(await universeHref("/"));
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: seo.name,
        description: seo.description,
        inLanguage: bcp47(seo.locale),
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: seo.name,
        url: SITE_URL,
        logo: await absoluteUrl(universe.logo.src),
      },
    ],
  };
  return <JsonLd data={data} />;
}

/**
 * VideoGame : à poser sur chaque page de jeu. Décrit le jeu à partir du registre
 * (source unique). `id` = identifiant du jeu dans `lib/games/registry.ts`.
 */
export async function GameJsonLd({ id }: { id: string }) {
  const game = await universeGame(id);
  if (!game) return null;

  const seo = await siteSeo();
  const universe = await getCurrentUniverseConfig();
  const data = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.title,
    description: game.description,
    url: await absoluteUrl(await universeHref(game.route)),
    image: game.previewImage ? await absoluteUrl(game.previewImage) : undefined,
    genre: "Anime fan game",
    gamePlatform: "Web browser",
    applicationCategory: "GameApplication",
    operatingSystem: "Any",
    inLanguage: bcp47(seo.locale),
    isAccessibleForFree: true,
    isBasedOn: universe.sourceWork,
    author: { "@type": "Organization", name: seo.name },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    },
  };
  return <JsonLd data={data} />;
}

/**
 * ItemList des jeux + fil d'Ariane. À poser sur le hub `/games` (et réutilisable
 * sur la home) pour renforcer le maillage interne et les rich results.
 */
export async function GamesListJsonLd() {
  const liveGames = (await universeGames()).filter(
    (g) => g.status !== "coming-soon",
  );
  const seo = await siteSeo();
  const universe = await getCurrentUniverseConfig();
  const gamesUrl = await absoluteUrl(await universeHref("/games"));
  // Une seule résolution d'URL par jeu (absoluteUrl est asynchrone).
  const gameUrls = await Promise.all(
    liveGames.map(async (g) => absoluteUrl(await universeHref(g.route))),
  );
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Accueil",
            item: seo.url,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Les jeux",
            item: gamesUrl,
          },
        ],
      },
      {
        "@type": "ItemList",
        name: `Jeux ${universe.sourceWork} — ${seo.name}`,
        itemListElement: liveGames.map((g, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: g.title,
          url: gameUrls[i],
        })),
      },
    ],
  };
  return <JsonLd data={data} />;
}
