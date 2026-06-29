import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  isBannerKey,
  isBannerUnlocked,
  bannerRequiredLevel,
} from "@/lib/profile/banners";

export const dynamic = "force-dynamic";

/**
 * Met à jour la customisation de profil de l'utilisateur connecté.
 * Anti-tamper : `bannerKey` doit appartenir à BANNER_PALETTE et
 * `avatarCharacterId` (s'il est fourni non-null) doit exister dans le roster.
 * Corps : { bannerKey?: string; avatarCharacterId?: string | null }.
 */
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, needsAuth: true, error: "Connecte-toi pour personnaliser ton profil." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }

  const { bannerKey, avatarCharacterId } = (body ?? {}) as {
    bannerKey?: unknown;
    avatarCharacterId?: unknown;
  };

  const data: { bannerKey?: string; avatarCharacterId?: string | null } = {};

  if (bannerKey !== undefined) {
    if (!isBannerKey(bannerKey)) {
      return NextResponse.json(
        { ok: false, error: "Bannière inconnue." },
        { status: 400 },
      );
    }
    // Déblocage par niveau, re-vérifié serveur (anti-tamper). Les admins
    // ignorent le palier (bypass total, cohérent avec titres/cadres).
    const me = await prisma.user.findUnique({
      where: { id: user.id },
      select: { level: true, role: true },
    });
    const isAdmin = me?.role === "ADMIN";
    if (!isBannerUnlocked(bannerKey, me?.level ?? 1, isAdmin)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Bannière verrouillée — niveau ${bannerRequiredLevel(bannerKey)} requis.`,
        },
        { status: 403 },
      );
    }
    data.bannerKey = bannerKey;
  }

  if (avatarCharacterId !== undefined) {
    if (avatarCharacterId === null) {
      data.avatarCharacterId = null;
    } else if (typeof avatarCharacterId === "string") {
      const exists = await prisma.character.findUnique({
        where: { id: avatarCharacterId },
        select: { id: true },
      });
      if (!exists) {
        return NextResponse.json(
          { ok: false, error: "Personnage introuvable." },
          { status: 400 },
        );
      }
      data.avatarCharacterId = avatarCharacterId;
    } else {
      return NextResponse.json(
        { ok: false, error: "Avatar invalide." },
        { status: 400 },
      );
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: "Rien à mettre à jour." }, { status: 400 });
  }

  await prisma.user.update({ where: { id: user.id }, data });
  revalidatePath("/account");
  return NextResponse.json({ ok: true });
}
