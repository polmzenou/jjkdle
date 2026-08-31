"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/auth/session";
import { revalidateUniversePath } from "@/lib/universes/current";
import {
  deleteItem,
  moveItem,
  upsertItem,
  type ItemInput,
} from "@/lib/admin/item-store";
import { isItemRarity, validateEffect } from "@/lib/games/tower/items";

/**
 * Server Actions de l'onglet Objets.
 *
 * Toute la validation des EFFETS passe par `validateEffect` : c'est le seul
 * endroit d'où ces valeurs peuvent venir, donc le seul endroit d'où une faute
 * de frappe peut casser tous les combats d'un univers. Un `FRAPPE_PCT: 9999`
 * saisi par erreur est refusé ici, pas découvert en jeu.
 */

export type ItemActionResult = { ok: true; id?: string } | { ok: false; error: string };

function deny(): ItemActionResult {
  return { ok: false, error: "Accès réservé aux administrateurs." };
}

async function refresh(): Promise<void> {
  await revalidateUniversePath("/games/tower");
  revalidatePath("/admin");
}

export async function saveItemAction(raw: {
  id?: string;
  name: string;
  description: string;
  rarity: string;
  effectKind: string;
  effectValue: number;
  effectKind2: string;
  effectValue2: number;
  enabled: boolean;
}): Promise<ItemActionResult> {
  if (!(await getAdminUser())) return deny();

  const name = String(raw.name ?? "").trim();
  if (!name) return { ok: false, error: "Le nom est obligatoire." };
  if (!isItemRarity(raw.rarity)) return { ok: false, error: "Rareté invalide." };

  const first = validateEffect(raw.effectKind, raw.effectValue);
  if (!first) {
    return {
      ok: false,
      error: "Effet principal invalide (vérifie l'effet et sa valeur).",
    };
  }

  // Le second effet est facultatif : une clé vide signifie « pas de second
  // effet », pas « effet incorrect ».
  let second: { kind: string; value: number } | null = null;
  if (raw.effectKind2) {
    const parsed = validateEffect(raw.effectKind2, raw.effectValue2);
    if (!parsed) {
      return { ok: false, error: "Second effet invalide (valeur hors bornes ?)." };
    }
    second = parsed;
  }

  const input: ItemInput = {
    id: raw.id,
    name,
    description: String(raw.description ?? "").trim(),
    rarity: raw.rarity,
    effectKind: first.kind,
    effectValue: first.value,
    effectKind2: second?.kind ?? null,
    effectValue2: second?.value ?? null,
    enabled: Boolean(raw.enabled),
  };

  const id = await upsertItem(input);
  await refresh();
  return { ok: true, id };
}

export async function deleteItemAction(id: string): Promise<ItemActionResult> {
  if (!(await getAdminUser())) return deny();
  await deleteItem(id);
  await refresh();
  return { ok: true };
}

export async function moveItemAction(
  id: string,
  direction: -1 | 1,
): Promise<ItemActionResult> {
  if (!(await getAdminUser())) return deny();
  await moveItem(id, direction === -1 ? -1 : 1);
  await refresh();
  return { ok: true };
}
