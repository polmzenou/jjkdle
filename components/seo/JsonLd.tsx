import { GAMES, getGame } from "@/lib/games/registry";
import {
  SITE_NAME,
  SITE_URL,
  SITE_DESCRIPTION,
  absoluteUrl,
} from "@/lib/seo/config";

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

/** WebSite + Organization : injecté une fois dans le layout racine. */
export function SiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "fr-FR",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: absoluteUrl("/logo.png"),
      },
    ],
  };
  return <JsonLd data={data} />;
}

/**
 * VideoGame : à poser sur chaque page de jeu. Décrit le jeu à partir du registre
 * (source unique). `id` = identifiant du jeu dans `lib/games/registry.ts`.
 */
export function GameJsonLd({ id }: { id: string }) {
  const game = getGame(id);
  if (!game) return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.title,
    description: game.description,
    url: absoluteUrl(game.route),
    image: game.previewImage ? absoluteUrl(game.previewImage) : undefined,
    genre: "Anime fan game",
    gamePlatform: "Web browser",
    applicationCategory: "GameApplication",
    operatingSystem: "Any",
    inLanguage: "fr-FR",
    isAccessibleForFree: true,
    isBasedOn: "Jujutsu Kaisen",
    author: { "@type": "Organization", name: SITE_NAME },
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
export function GamesListJsonLd() {
  const liveGames = GAMES.filter((g) => g.status !== "coming-soon");
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
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Les jeux",
            item: absoluteUrl("/games"),
          },
        ],
      },
      {
        "@type": "ItemList",
        name: "Jeux Jujutsu Kaisen — JJK Arcade",
        itemListElement: liveGames.map((g, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: g.title,
          url: absoluteUrl(g.route),
        })),
      },
    ],
  };
  return <JsonLd data={data} />;
}
