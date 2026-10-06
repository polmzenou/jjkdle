import type { EffectKind } from "@/lib/games/tower/effects";
import type { ItemRarity } from "@/lib/games/tower/items";

/**
 * Forme d'un objet d'AMORÇAGE de « The Culling Tower », commune à tous les
 * univers (`lib/universes/<slug>-items.ts`). Lue par `scripts/seed-items.ts` et
 * par les tests — jamais au runtime, où la source de vérité est la table `Item`.
 */

/**
 * Image à importer depuis le wiki Fandom de l'univers : titre de PAGE (son
 * image d'infobox) ou fichier ÉPINGLÉ quand l'infobox montre autre chose que
 * l'objet. Même contrat que `data/images/<univers>-fandom.json` pour le roster.
 */
export type WikiImage = string | { file: string };

export interface ItemSeed {
  slug: string;
  name: string;
  description: string;
  rarity: ItemRarity;
  effectKind: EffectKind;
  effectValue: number;
  effectKind2?: EffectKind;
  effectValue2?: number;
  /** Absent = visuel à téléverser depuis /admin (onglet Objets). */
  wikiImage?: WikiImage;
}
