"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/auth/session";
import {
  createUniverse,
  deleteUniverse,
  listAdminUniverses,
  renameUniverse,
  validateUniverseName,
  validateUniverseSlug,
} from "@/lib/admin/universe-store";

/**
 * Server Actions de la gestion des UNIVERS (`/admin/universes`).
 *
 * Réservées au rôle ADMIN, comme le reste de `/admin` : le rôle est global (il
 * ne dépend d'aucun univers), c'est donc bien lui qui autorise à créer ou
 * supprimer un anime.
 *
 * Contrairement aux autres actions de l'admin, celles-ci ne s'appliquent PAS à
 * « l'univers administré » (cookie) : chaque univers est désigné par son id.
 */

export type ActionResult = { ok: boolean; error?: string };

/** Invalide tout ce qui liste les univers : admin, hub et chrome. */
function revalidateUniverseLists(): void {
  revalidatePath("/admin/universes");
  revalidatePath("/admin");
  // Le hub (`/` réécrit vers `/universes`) affiche la liste des univers.
  revalidatePath("/universes");
  revalidatePath("/", "layout");
}

/** Crée un univers (ligne `Universe`). La config code reste à ajouter à part. */
export async function createUniverseAction(input: {
  slug: string;
  name: string;
}): Promise<ActionResult & { slug?: string }> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  const slug = validateUniverseSlug(input.slug ?? "");
  if (!slug.ok) return { ok: false, error: slug.error };
  const name = validateUniverseName(input.name ?? "");
  if (!name.ok) return { ok: false, error: name.error };

  try {
    await createUniverse({ slug: slug.slug, name: name.name });
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  revalidateUniverseLists();
  return { ok: true, slug: slug.slug };
}

/** Renomme un univers (nom d'affichage uniquement — le slug est immuable). */
export async function renameUniverseAction(
  id: string,
  rawName: string,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  const name = validateUniverseName(rawName ?? "");
  if (!name.ok) return { ok: false, error: name.error };

  try {
    await renameUniverse(id, name.name);
  } catch (e) {
    return { ok: false, error: `Échec : ${(e as Error).message}` };
  }
  revalidateUniverseLists();
  return { ok: true };
}

/**
 * Supprime un univers VIDE. Le slug est redemandé par la vue et vérifié ici :
 * une suppression d'univers est trop lourde pour tenir à un seul clic.
 */
export async function deleteUniverseAction(
  id: string,
  confirmSlug: string,
): Promise<ActionResult> {
  if (!(await getAdminUser())) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  try {
    const universe = (await listAdminUniverses()).find((u) => u.id === id);
    if (!universe) return { ok: false, error: "Univers introuvable." };
    if (confirmSlug.trim().toLowerCase() !== universe.slug) {
      return {
        ok: false,
        error: `Confirmation incorrecte : saisis « ${universe.slug} » pour supprimer.`,
      };
    }
    await deleteUniverse(id);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  revalidateUniverseLists();
  return { ok: true };
}
