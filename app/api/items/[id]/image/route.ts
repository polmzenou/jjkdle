import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  getCurrentUniverse,
  revalidateUniversePath,
} from "@/lib/universes/current";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/session";

/**
 * Image d'un objet maudit, stockée en base (table Item : imageData/imageMime).
 * Copie conforme de la route du roster « Jujutsu Draft ».
 *
 *   GET    → sert l'image (public, cacheable).
 *   POST   → upload (multipart, champ `file`) — réservé ADMIN.
 *   DELETE → retire l'image — réservé ADMIN.
 *
 * Comme les autres routes d'image : GET non cadré (image publique, id global),
 * écritures cadrées sur l'univers administré.
 */

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
]);
const MAX_BYTES = 3 * 1024 * 1024; // 3 Mo

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const item = await prisma.item.findUnique({
    where: { id },
    select: { imageData: true, imageMime: true },
  });

  if (!item?.imageData || !item.imageMime) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(item.imageData), {
    headers: {
      "Content-Type": item.imageMime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function POST(req: Request, { params }: Params) {
  if (!(await getAdminUser())) {
    return NextResponse.json(
      { error: "Accès réservé aux administrateurs." },
      { status: 403 },
    );
  }
  const { id } = await params;
  const { id: universeId } = await getCurrentUniverse();

  const item = await prisma.item.findFirst({
    where: { id, universeId },
    select: { id: true },
  });
  if (!item) {
    return NextResponse.json({ error: "Objet introuvable." }, { status: 404 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "Format non supporté (png, jpeg, webp, gif, avif)." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image trop lourde (max 3 Mo)." },
      { status: 400 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  // `?v=` casse le cache immuable après un remplacement : sans lui, l'ancienne
  // image resterait affichée pendant un an.
  const url = `/api/items/${id}/image?v=${Date.now()}`;
  await prisma.item.update({
    where: { id },
    data: { imageData: bytes, imageMime: file.type, image: url },
  });

  await revalidateUniversePath("/games/tower");
  revalidatePath("/admin");
  return NextResponse.json({ ok: true, image: url });
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await getAdminUser())) {
    return NextResponse.json(
      { error: "Accès réservé aux administrateurs." },
      { status: 403 },
    );
  }
  const { id } = await params;
  const { id: universeId } = await getCurrentUniverse();

  await prisma.item.updateMany({
    where: { id, universeId },
    data: { imageData: null, imageMime: null, image: null },
  });

  await revalidateUniversePath("/games/tower");
  revalidatePath("/admin");
  return NextResponse.json({ ok: true });
}
