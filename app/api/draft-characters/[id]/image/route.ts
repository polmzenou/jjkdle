import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/session";

/**
 * Image d'un personnage du jeu "Jujutsu Draft", stockée en base
 * (table DraftCharacter : imageData/imageMime). Calqué sur la route du roster.
 *
 *   GET    → sert l'image (public, cacheable).
 *   POST   → upload (multipart, champ `file`) — réservé ADMIN.
 *   DELETE → retire l'image — réservé ADMIN.
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
  const character = await prisma.draftCharacter.findUnique({
    where: { id },
    select: { imageData: true, imageMime: true },
  });

  if (!character?.imageData || !character.imageMime) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(character.imageData), {
    headers: {
      "Content-Type": character.imageMime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function POST(req: Request, { params }: Params) {
  if (!(await getAdminUser())) {
    return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  }
  const { id } = await params;

  const character = await prisma.draftCharacter.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!character) {
    return NextResponse.json({ error: "Personnage introuvable." }, { status: 404 });
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
    return NextResponse.json({ error: "Image trop lourde (max 3 Mo)." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const url = `/api/draft-characters/${id}/image?v=${Date.now()}`;
  await prisma.draftCharacter.update({
    where: { id },
    data: { imageData: bytes, imageMime: file.type, image: url },
  });

  revalidatePath("/games/jujutsu-draft");
  revalidatePath("/admin");
  return NextResponse.json({ ok: true, image: url });
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await getAdminUser())) {
    return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  }
  const { id } = await params;

  await prisma.draftCharacter.updateMany({
    where: { id },
    data: { imageData: null, imageMime: null, image: null },
  });

  revalidatePath("/games/jujutsu-draft");
  revalidatePath("/admin");
  return NextResponse.json({ ok: true });
}
