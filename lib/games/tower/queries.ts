import { cache } from "react";
import type { Character } from "@/data/roster/characters";
import { getRoster } from "@/lib/content/queries";
import { loadAttributeSchema } from "@/lib/games/jjkdle/attributes-db";
import { getCurrentUniverse } from "@/lib/universes/current";
import { getUniverseBySlug } from "@/lib/universes/registry";
import { resolveTowerConfig, type TowerConfig } from "./config";
import { buildTowerRoster, isTowerPlayable, type TowerRoster } from "./floors";
import { normalizeItem, type TowerItem } from "./items";
import { isValidEvent, type TowerEvent } from "./events";
import { JJK_EVENTS } from "@/lib/universes/jjk-events";
import { prisma } from "@/lib/prisma";

/**
 * Chargement des données de « The Culling Tower » — module SERVER-ONLY
 * (Prisma + `next/headers` via la résolution d'univers).
 *
 * Tout le reste de `lib/games/tower/` est pur : ce fichier est la seule
 * frontière entre la base et le moteur. Il en sort un `TowerContext` que les
 * Server Actions passent tel quel aux fonctions pures.
 */

export interface TowerContext {
  universeId: string;
  config: TowerConfig;
  /** Roster de l'univers, indexé par id. */
  roster: Record<string, Character>;
  /** Le même, en liste (vivier des starters). */
  list: Character[];
  /** Vivier rangé par strate. */
  tower: TowerRoster;
  /** Valeurs d'arc dans l'ordre du récit. */
  arcOrder: string[];
  /** Objets ACTIFS de l'univers, dans l'ordre d'affichage. */
  items: TowerItem[];
  /** Les mêmes, indexés par id, pour résoudre un inventaire de run. */
  itemsById: Record<string, TowerItem>;
  /** Évènements de l'univers (contenu écrit, pas de la donnée en base). */
  events: TowerEvent[];
  /**
   * Le contenu suffit-il à faire tenir une tour debout ? Même esprit que
   * `MIN_DRAFT_ROSTER` : mieux vaut refuser de lancer une partie que d'en
   * servir une bancale.
   */
  playable: boolean;
}

/** Config Tour d'un univers, par son slug. Repli sur la config JJK. */
export function towerConfigForSlug(slug: string): TowerConfig {
  return resolveTowerConfig(getUniverseBySlug(slug)?.tower);
}

/**
 * Valeurs d'un attribut ORDINAL, dans l'ordre du récit.
 *
 * Les options SANS rang (`order` null) sont écartées : une valeur non ordonnée
 * n'a pas de place sur une échelle chronologique, et l'y glisser décalerait
 * toutes les strates suivantes.
 */
function orderedValues(
  schema: Awaited<ReturnType<typeof loadAttributeSchema>>,
  key: string,
): string[] {
  const spec = schema.get(key);
  if (!spec) return [];
  return spec.options
    .filter((o) => typeof o.order === "number")
    .map((o) => o.value);
}

/**
 * Contexte complet de l'univers courant.
 *
 * Mémoïsé PAR REQUÊTE (`cache()` de React), comme le schéma d'attributs : une
 * page de jeu le demande plusieurs fois, la base ne doit pas être relue à
 * chaque appel — mais un cache de process servirait un roster périmé après une
 * modification en admin.
 */
const loadContext = cache(
  async (universeId: string, slug: string): Promise<TowerContext> => {
    const config = towerConfigForSlug(slug);
    const [list, schema, itemRows] = await Promise.all([
      getRoster(universeId),
      loadAttributeSchema(universeId),
      prisma.item.findMany({
        where: { universeId, enabled: true },
        orderBy: { position: "asc" },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          image: true,
          rarity: true,
          effectKind: true,
          effectValue: true,
          effectKind2: true,
          effectValue2: true,
          enabled: true,
          position: true,
          // On ne rapatrie PAS le binaire : seule sa PRÉSENCE compte, pour
          // savoir s'il faut pointer sur la route d'image. Charger 24 images
          // à chaque rendu de page serait absurde.
          imageData: false,
        },
      }),
    ]);

    // `imageData` n'étant pas sélectionné, on relit à part quelles lignes en
    // ont une — une seule requête, et uniquement des ids.
    const withImage = new Set(
      (
        await prisma.item.findMany({
          where: { universeId, enabled: true, NOT: { imageData: null } },
          select: { id: true },
        })
      ).map((r) => r.id),
    );

    const items = itemRows
      .map((r) => normalizeItem({ ...r, imageData: withImage.has(r.id) }))
      .filter((i): i is TowerItem => i !== null);

    const arcOrder = orderedValues(schema, config.arcAttributeKey);
    const tower = buildTowerRoster(list, arcOrder, config);

    return {
      universeId,
      config,
      roster: Object.fromEntries(list.map((c) => [c.id, c])),
      list,
      tower,
      arcOrder,
      items,
      itemsById: Object.fromEntries(items.map((i) => [i.id, i])),
      events: eventsFor(slug),
      playable: arcOrder.length > 0 && isTowerPlayable(tower),
    };
  },
);

export async function getTowerContext(): Promise<TowerContext> {
  const universe = await getCurrentUniverse();
  return loadContext(universe.id, universe.slug);
}

/**
 * Évènements d'un univers.
 *
 * En CODE et non en base, contrairement aux objets : un évènement est un texte
 * de trois lignes et deux issues, il n'y a rien à y régler au quotidien. Un
 * univers sans catalogue n'a simplement pas de nœud d'évènement — la carte
 * propose alors autre chose.
 */
function eventsFor(slug: string): TowerEvent[] {
  const catalogs: Record<string, TowerEvent[]> = { jjk: JJK_EVENTS };
  return (catalogs[slug] ?? []).filter(isValidEvent);
}
