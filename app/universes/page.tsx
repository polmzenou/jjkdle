import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getGameFlags, getMaintenance } from "@/lib/config/app-config";
import { gamesForUniverse } from "@/lib/games/registry";
import { listAvailableUniverses } from "@/lib/universes/current";
import { themeCssVars } from "@/lib/universes/theme";
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
 */
export const metadata: Metadata = {
  title: "Les univers",
  description:
    "Tous les univers d'arcade de la plateforme : un anime, ses jeux et son roster. Un seul compte pour tous.",
};

export const dynamic = "force-dynamic";

/** Nombre de titres de jeux mis en avant sur une carte (le reste tient en « +N »). */
const HIGHLIGHT_COUNT = 3;

export default async function UniversesHubPage() {
  const universes = await listAvailableUniverses();

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
        highlights: games.slice(0, HIGHLIGHT_COUNT).map((game) => game.title),
        maintenance: maintenance.enabled,
      };
    }),
  );

  return <UniverseHub universes={cards} />;
}
