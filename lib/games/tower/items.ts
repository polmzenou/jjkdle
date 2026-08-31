import {
  EFFECT_SPECS,
  aggregateEffects,
  clampEffectValue,
  describeEffect,
  isEffectKind,
  type EffectInstance,
  type EffectKind,
  type RunModifiers,
} from "./effects";

/**
 * Le roster ITEM — module PUR.
 *
 * Les objets sont un roster à part entière en base (table `Item`), éditable
 * depuis /admin comme le roster des personnages. Rien n'entre dans
 * `Character` : un objet maudit n'est pas un personnage, et mélanger les deux
 * aurait pollué tous les jeux qui lisent le roster.
 *
 * Ce module ne connaît ni Prisma ni React : il définit la forme d'un objet,
 * valide ce qui vient de l'admin, et transforme un inventaire de run en
 * modificateurs chiffrés pour le moteur de combat.
 */

/**
 * Rareté d'un objet — échelle PROPRE, volontairement distincte de `CardRarity`
 * (qui dérive de `Character.tier` et pilote les taux de booster). Même mot,
 * concept différent : la codebase applique déjà cette séparation entre
 * `lib/cards/rarity.ts` et `lib/profile/rarity.ts`, on l'étend plutôt que de la
 * contredire.
 */
export type ItemRarity = "COMMON" | "RARE" | "EPIC";

export const ITEM_RARITIES: ItemRarity[] = ["COMMON", "RARE", "EPIC"];

export interface ItemRarityStyle {
  label: string;
  color: string;
  /** Poids de tirage sur un nœud de récompense ordinaire. */
  weight: number;
}

export const ITEM_RARITY_STYLES: Record<ItemRarity, ItemRarityStyle> = {
  COMMON: { label: "Commun", color: "#9ca3af", weight: 60 },
  RARE: { label: "Rare", color: "#38bdf8", weight: 30 },
  // Les épiques ne tombent PAS sur un combat ordinaire : elles sont la
  // récompense des élites et des boss (cf. `rollItems`). Leur poids ne sert
  // qu'aux tirages où elles sont explicitement autorisées.
  EPIC: { label: "Épique", color: "#a78bfa", weight: 10 },
};

export function isItemRarity(value: unknown): value is ItemRarity {
  return typeof value === "string" && (ITEM_RARITIES as string[]).includes(value);
}

export function itemRarityStyle(rarity: ItemRarity): ItemRarityStyle {
  return ITEM_RARITY_STYLES[rarity] ?? ITEM_RARITY_STYLES.COMMON;
}

/** Un objet, tel qu'il circule dans le jeu et l'admin. */
export interface TowerItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  image?: string;
  rarity: ItemRarity;
  /** Un ou deux effets. Le second permet les objets à double tranchant. */
  effects: EffectInstance[];
  enabled: boolean;
  position: number;
}

/**
 * Seuil de viabilité, sur le modèle de `MIN_DRAFT_ROSTER`.
 *
 * En dessous, les nœuds à objet servent des fragments plutôt que de proposer
 * trois fois le même objet — mieux vaut une récompense terne qu'un choix qui
 * n'en est pas un.
 */
export const MIN_ITEMS = 12;

// ──────────────────────────────────────────────────────────────────────────
// Validation
// ──────────────────────────────────────────────────────────────────────────

/**
 * Normalise une ligne relue en base.
 *
 * Défensif à la LECTURE et pas seulement à l'écriture : une ligne écrite avant
 * un durcissement des bornes, ou un `effectKind` retiré du catalogue, ne doit
 * pas casser un combat en cours. Un objet dont plus aucun effet n'est
 * reconnaissable est écarté (`null`) plutôt que servi inerte.
 */
export function normalizeItem(raw: {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string | null;
  imageData?: unknown;
  rarity: string;
  effectKind: string;
  effectValue: number;
  effectKind2: string | null;
  effectValue2: number | null;
  enabled: boolean;
  position: number;
}): TowerItem | null {
  const effects: EffectInstance[] = [];

  if (isEffectKind(raw.effectKind)) {
    effects.push({
      kind: raw.effectKind,
      value: clampEffectValue(raw.effectKind, raw.effectValue),
    });
  }
  if (raw.effectKind2 && isEffectKind(raw.effectKind2)) {
    effects.push({
      kind: raw.effectKind2,
      value: clampEffectValue(raw.effectKind2, raw.effectValue2 ?? 0),
    });
  }

  if (effects.length === 0) return null;

  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    description: raw.description,
    // Image binaire en base → servie par la route API ; sinon chemin statique.
    image: raw.imageData ? `/api/items/${raw.id}/image` : (raw.image ?? undefined),
    rarity: isItemRarity(raw.rarity) ? raw.rarity : "COMMON",
    effects,
    enabled: raw.enabled,
    position: raw.position,
  };
}

/** Résumé lisible des effets d'un objet, pour la carte de récompense. */
export function describeItem(item: TowerItem): string {
  return item.effects
    .map((e) => describeEffect(e.kind, e.value))
    .join(" · ");
}

/**
 * Valide un couple (effet, valeur) venant du formulaire admin.
 *
 * C'est le seul endroit d'où ces valeurs peuvent venir, et donc le seul endroit
 * d'où une faute de frappe peut casser tous les combats d'un univers : un
 * `FRAPPE_PCT: 9999` saisi par erreur ne doit pas atteindre la base.
 */
export function validateEffect(
  kind: unknown,
  value: unknown,
): { kind: EffectKind; value: number } | null {
  if (!isEffectKind(kind)) return null;
  const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) return null;

  const spec = EFFECT_SPECS[kind];
  if (n < spec.min || n > spec.max) return null;

  return { kind, value: Math.trunc(n) };
}

// ──────────────────────────────────────────────────────────────────────────
// Inventaire de run
// ──────────────────────────────────────────────────────────────────────────

/**
 * Modificateurs apportés par l'inventaire d'une run.
 *
 * Le moteur de combat ne connaît JAMAIS les objets eux-mêmes, seulement ce
 * total chiffré et plafonné : c'est ce qui permet d'ajouter, retirer ou
 * rééquilibrer un objet en admin sans toucher une ligne de `combat.ts`.
 */
export function modifiersOf(items: readonly TowerItem[]): RunModifiers {
  return aggregateEffects(items.flatMap((i) => i.effects));
}

/** Objets d'un inventaire (ids) résolus contre le catalogue de l'univers. */
export function resolveItems(
  ids: readonly string[],
  catalog: Record<string, TowerItem>,
): TowerItem[] {
  const seen = new Set<string>();
  const out: TowerItem[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const item = catalog[id];
    if (!item) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}
