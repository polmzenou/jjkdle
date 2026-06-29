"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { isTitleKey } from "@/lib/titles/definitions";
import { isFrameKey } from "@/lib/frames/definitions";
import {
  buildUnlockContext,
  isTitleUnlocked,
  isFrameUnlocked,
} from "@/lib/cosmetics/unlock";
import { getTitleGrantKeys, getFrameGrantKeys } from "@/lib/cosmetics/grants";
import { normalizeProfileLayout, type ProfileLayout } from "@/lib/profile/layout";

export type ActionResult = { ok: boolean; error?: string };

/**
 * Équipe (ou retire avec `null`) un TITRE pour l'utilisateur connecté.
 * Anti-tamper : le déblocage est RE-VÉRIFIÉ côté serveur (jamais de confiance au
 * client) — clé connue ∧ (règle dérivée ∨ octroi manuel ∨ admin).
 */
export async function equipTitleAction(
  titleKey: string | null,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Connecte-toi pour équiper un titre." };

  if (titleKey !== null) {
    if (!isTitleKey(titleKey)) return { ok: false, error: "Titre inconnu." };
    const [ctx, grantKeys] = await Promise.all([
      buildUnlockContext(user.id),
      getTitleGrantKeys(user.id),
    ]);
    if (!isTitleUnlocked(titleKey, ctx, grantKeys)) {
      return { ok: false, error: "Ce titre n'est pas encore débloqué." };
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { equippedTitleKey: titleKey },
  });
  revalidatePath("/account");
  revalidatePath(`/u/${encodeURIComponent(user.username)}`);
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

  if (frameKey !== null) {
    if (!isFrameKey(frameKey)) return { ok: false, error: "Cadre inconnu." };
    const [ctx, grantKeys] = await Promise.all([
      buildUnlockContext(user.id),
      getFrameGrantKeys(user.id),
    ]);
    if (!isFrameUnlocked(frameKey, ctx, grantKeys)) {
      return { ok: false, error: "Ce cadre n'est pas encore débloqué." };
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { equippedFrameKey: frameKey },
  });
  revalidatePath("/account");
  revalidatePath(`/u/${encodeURIComponent(user.username)}`);
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
  await prisma.user.update({
    where: { id: user.id },
    // `ProfileLayout` (interface) n'a pas d'index signature → cast vers le type
    // d'entrée JSON de Prisma. `normalized` est un objet JSON plat et sûr.
    data: { profileLayout: normalized as unknown as Prisma.InputJsonValue },
  });
  revalidatePath("/account/customize");
  revalidatePath(`/u/${encodeURIComponent(user.username)}`);
  return { ok: true };
}
