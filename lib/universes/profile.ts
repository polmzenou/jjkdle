import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUniverse } from "./current";

/**
 * Accès au PROFIL PAR UNIVERS d'un utilisateur (`UserUniverseProfile`, étape 2c).
 * Module server-only (importe Prisma).
 *
 * Le compte reste global (identité, XP, niveau, possession des cosmétiques) ;
 * ce qui est ÉQUIPÉ (loadout) et le STREAK quotidien sont PAR univers. Ce module
 * centralise la lecture/écriture du loadout ; le streak (lecture-modif-écriture
 * transactionnelle) vit dans lib/progress/streak.ts.
 */

export interface UniverseLoadout {
  equippedTitleKey: string | null;
  equippedFrameKey: string | null;
  bannerKey: string;
  avatarCharacterId: string | null;
  profileLayout: Prisma.JsonValue | null;
  jjkdleStreak: number;
  jjkdleBestStreak: number;
  jjkdleLastPlayedAt: string | null;
}

/** Valeurs par défaut quand le profil n'existe pas encore (nouvel utilisateur
 * ou premier passage sur un univers). Miroir des `@default` du schéma. */
export const DEFAULT_LOADOUT: UniverseLoadout = {
  equippedTitleKey: null,
  equippedFrameKey: null,
  bannerKey: "default",
  avatarCharacterId: null,
  profileLayout: null,
  jjkdleStreak: 0,
  jjkdleBestStreak: 0,
  jjkdleLastPlayedAt: null,
};

const LOADOUT_SELECT = {
  equippedTitleKey: true,
  equippedFrameKey: true,
  bannerKey: true,
  avatarCharacterId: true,
  profileLayout: true,
  jjkdleStreak: true,
  jjkdleBestStreak: true,
  jjkdleLastPlayedAt: true,
} satisfies Prisma.UserUniverseProfileSelect;

/**
 * Loadout + streak d'un utilisateur pour un univers (défaut = univers courant).
 * Renvoie les valeurs par défaut si le profil n'a pas encore été créé.
 */
export async function getUniverseLoadout(
  userId: string,
  universeId?: string,
): Promise<UniverseLoadout> {
  const uid = universeId ?? (await getCurrentUniverse()).id;
  const p = await prisma.userUniverseProfile.findUnique({
    where: { userId_universeId: { userId, universeId: uid } },
    select: LOADOUT_SELECT,
  });
  return p ?? DEFAULT_LOADOUT;
}

/** Champs du loadout modifiables (patch partiel). */
export type LoadoutPatch = {
  equippedTitleKey?: string | null;
  equippedFrameKey?: string | null;
  bannerKey?: string;
  avatarCharacterId?: string | null;
  profileLayout?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
};

/**
 * Upsert partiel du loadout d'un utilisateur pour un univers (défaut = courant).
 * Crée la ligne à la volée si elle n'existe pas encore.
 */
export async function updateUniverseLoadout(
  userId: string,
  data: LoadoutPatch,
  universeId?: string,
): Promise<void> {
  const uid = universeId ?? (await getCurrentUniverse()).id;
  await prisma.userUniverseProfile.upsert({
    where: { userId_universeId: { userId, universeId: uid } },
    create: { userId, universeId: uid, ...data },
    update: data,
  });
}
