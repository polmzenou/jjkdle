import { prisma } from "@/lib/prisma";
import { getGameFlags, getMaintenance } from "@/lib/config/app-config";
import { gamesForUniverse } from "@/lib/games/registry";
import { getCasinoConfig } from "@/lib/casino/config";
import { listAvailableUniverses } from "@/lib/universes/current";
import { casinoThemeVars, themeCssVars } from "@/lib/universes/theme";
import { HubJsonLd } from "@/components/seo/JsonLd";
import { UniverseHub, type HubUniverse } from "./UniverseHub";

/**
 * HUB multi-univers (étape 5) : liste les animes disponibles sur la plateforme.
 *
 * Alimenté par la BASE (table `Universe`) croisée avec le registre de configs :
 * un anime ajouté apparaît ici automatiquement, sans toucher cette page ni le
 * composant de rendu (la grille s'étend d'elle-même, cf. `UniverseHub`).
 *
 * Ce fichier ne fait que RÉSOUDRE les données ; la mise en forme vit dans
 * `UniverseHub` (composant client, pour les animations d'entrée).
 *
 * Titre, description et aperçu social : ceux du hub, posés par `app/layout.tsx`
 * (cf. `hubSeo`).
 */
export const dynamic = "force-dynamic";

export default async function UniversesHubPage() {
  const [universes, casino] = await Promise.all([
    listAvailableUniverses(),
    getCasinoConfig(),
  ]);

  // Taille de chaque roster en UNE requête : un `count` par univers ferait
  // grossir le coût de la page à chaque anime ajouté.
  const rosterRows = await prisma.character.groupBy({
    by: ["universeId"],
    _count: { _all: true },
  });
  const rosterByUniverse = new Map(
    rosterRows.map((row) => [row.universeId, row._count._all]),
  );

  const cards: HubUniverse[] = await Promise.all(
    universes.map(async ({ id, slug, name, config }) => {
      // Les deux lectures tapent le même cache de requête (`loadAllConfig`) :
      // toute la config du site tient en une seule requête, tous univers confondus.
      const [flags, maintenance] = await Promise.all([
        getGameFlags(slug),
        getMaintenance(slug),
      ]);
      // Les jeux tels que les voit CET univers : titres réécrits par sa config,
      // « à venir » et jeux désactivés en admin exclus — la carte annonce donc ce
      // qui est réellement jouable.
      const games = gamesForUniverse(config.gameCopy).filter(
        (game) => game.status !== "coming-soon" && flags[game.id] !== false,
      );

      return {
        slug,
        name,
        sourceWork: config.sourceWork,
        tagline: config.labels.tagline,
        logo: config.logo,
        vars: themeCssVars(config.theme),
        gameCount: games.length,
        rosterCount: rosterByUniverse.get(id) ?? 0,
        games: games.map(({ id, title, description }) => ({
          id,
          title,
          description,
        })),
        maintenance: maintenance.enabled,
      };
    }),
  );

  return (
    <>
      <HubJsonLd />
      <UniverseHub
        universes={cards}
        // Casino coupé en admin → la carte disparaît du hub, comme un jeu
        // désactivé disparaît de la carte d'un univers.
        casino={casino.enabled ? { vars: casinoThemeVars() } : null}
      />
    </>
  );
}
