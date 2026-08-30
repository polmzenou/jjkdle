import { cache } from "react";
import type { Character } from "@/data/roster/characters";
import { getRoster } from "@/lib/content/queries";
import { loadAttributeSchema } from "@/lib/games/jjkdle/attributes-db";
import { getCurrentUniverse } from "@/lib/universes/current";
import { getUniverseBySlug } from "@/lib/universes/registry";
import { resolveTowerConfig, type TowerConfig } from "./config";
import { buildTowerRoster, isTowerPlayable, type TowerRoster } from "./floors";

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
    const [list, schema] = await Promise.all([
      getRoster(universeId),
      loadAttributeSchema(universeId),
    ]);

    const arcOrder = orderedValues(schema, config.arcAttributeKey);
    const tower = buildTowerRoster(list, arcOrder, config);

    return {
      universeId,
      config,
      roster: Object.fromEntries(list.map((c) => [c.id, c])),
      list,
      tower,
      arcOrder,
      playable: arcOrder.length > 0 && isTowerPlayable(tower),
    };
  },
);

export async function getTowerContext(): Promise<TowerContext> {
  const universe = await getCurrentUniverse();
  return loadContext(universe.id, universe.slug);
}
