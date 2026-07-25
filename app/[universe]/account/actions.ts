"use server";

import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { isTitleKey, isTitleInUniverse } from "@/lib/titles/definitions";
import { isFrameKey, isFrameInUniverse } from "@/lib/frames/definitions";
import {
  buildUnlockContext,
  isTitleUnlocked,
  isFrameUnlocked,
} from "@/lib/cosmetics/unlock";
import { getTitleGrantKeys, getFrameGrantKeys } from "@/lib/cosmetics/grants";
import {
  getCurrentUniverse,
  revalidateUniversePath,
} from "@/lib/universes/current";
import { updateUniverseLoadout } from "@/lib/universes/profile";
import { normalizeProfileLayout, type ProfileLayout } from "@/lib/profile/layout";

export type ActionResult = { ok: boolean; error?: string };

/**
 * Équipe (ou retire avec `null`) un TITRE pour l'utilisateur connecté, DANS
 * L'UNIVERS COURANT (le loadout est par univers, cf. UserUniverseProfile).
 * Anti-tamper : le déblocage est RE-VÉRIFIÉ côté serveur (jamais de confiance au
 * client) — clé connue ∧ titre de cet univers ∧ (règle dérivée ∨ octroi manuel
 * ∨ admin).
 */
export async function equipTitleAction(
  titleKey: string | null,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Connecte-toi pour équiper un titre." };

  const universe = await getCurrentUniverse();

  if (titleKey !== null) {
    if (!isTitleKey(titleKey)) return { ok: false, error: "Titre inconnu." };
    // Multi-univers : la POSSESSION est globale (un titre gagné sur JJK reste
    // acquis) mais on ne l'ÉQUIPE que dans son univers d'origine.
    if (!isTitleInUniverse(titleKey, universe.slug)) {
      return { ok: false, error: "Ce titre n'appartient pas à cet univers." };
    }
    const [ctx, grantKeys] = await Promise.all([
      buildUnlockContext(user.id),
      getTitleGrantKeys(user.id),
    ]);
    if (!isTitleUnlocked(titleKey, ctx, grantKeys)) {
      return { ok: false, error: "Ce titre n'est pas encore débloqué." };
    }
  }

  await updateUniverseLoadout(
    user.id,
    { equippedTitleKey: titleKey },
    universe.id,
  );
  await revalidateUniversePath("/account");
  await revalidateUniversePath(`/u/${encodeURIComponent(user.username)}`);
  return { ok: true };
}

/**
 * Équipe (ou retire avec `null`) un CADRE pour l'utilisateur connecté. Même
 * validation serveur que les titres.
 */
export async function equipFrameAction(
  frameKey: string | null,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Connecte-toi pour équiper un cadre." };

  const universe = await getCurrentUniverse();

  if (frameKey !== null) {
    if (!isFrameKey(frameKey)) return { ok: false, error: "Cadre inconnu." };
    // Idem titres : possession globale, équipement réservé à l'univers du cadre
    // (le cadre par défaut est neutre, donc équipable partout).
    if (!isFrameInUniverse(frameKey, universe.slug)) {
      return { ok: false, error: "Ce cadre n'appartient pas à cet univers." };
    }
    const [ctx, grantKeys] = await Promise.all([
      buildUnlockContext(user.id),
      getFrameGrantKeys(user.id),
    ]);
    if (!isFrameUnlocked(frameKey, ctx, grantKeys)) {
      return { ok: false, error: "Ce cadre n'est pas encore débloqué." };
    }
  }

  await updateUniverseLoadout(
    user.id,
    { equippedFrameKey: frameKey },
    universe.id,
  );
  await revalidateUniversePath("/account");
  await revalidateUniversePath(`/u/${encodeURIComponent(user.username)}`);
  return { ok: true };
}

/**
 * Enregistre la mise en page du profil PUBLIC (visibilité titre/cadre/badges/
 * scores + ordre des sections). Le client envoie un layout potentiellement
 * partiel ; on le NORMALISE serveur (source de vérité = lib/profile/layout) avant
 * persistance, donc aucune validation de clé n'est nécessaire ici.
 */
export async function updateProfileLayoutAction(
  layout: ProfileLayout,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Connecte-toi pour personnaliser ton profil." };

  const normalized = normalizeProfileLayout(layout);
  // `ProfileLayout` (interface) n'a pas d'index signature → cast vers le type
  // d'entrée JSON de Prisma. `normalized` est un objet JSON plat et sûr.
  await updateUniverseLoadout(user.id, {
    profileLayout: normalized as unknown as Prisma.InputJsonValue,
  });
  await revalidateUniversePath("/account/customize");
  await revalidateUniversePath(`/u/${encodeURIComponent(user.username)}`);
  return { ok: true };
}
