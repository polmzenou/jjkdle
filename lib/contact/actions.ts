"use server";

import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { sendMail } from "@/lib/mail/send";
import { contactMail } from "@/lib/mail/templates";
import { siteSeo } from "@/lib/seo/config";
import { getUniverseBySlug } from "@/lib/universes/registry";
import {
  CONTACT_LIMITS,
  validateContact,
  type ContactInput,
} from "./validation";

export type ContactResult = { ok: boolean; error?: string };

const HOUR_MS = 60 * 60 * 1000;

/**
 * Envoie un message du formulaire de contact (modale du footer) à
 * l'administration. Ouvert à tous : un joueur connecté envoie sous son compte
 * (nom/email imposés par la session, jamais par le client), un visiteur donne
 * les siens.
 *
 * Le message est ARCHIVÉ avant l'envoi (`ContactMessage`) : c'est ce qui sert à
 * la limite d'envoi, et il n'est pas perdu si Gmail refuse le mail.
 */
export async function sendContactAction(
  input: ContactInput,
): Promise<ContactResult> {
  // Pot de miel rempli → robot. Faux succès : ne lui apprend rien.
  if (String(input.website ?? "").trim()) return { ok: true };

  const user = await getCurrentUser();
  const checked = validateContact(
    user ? { ...input, name: user.username, email: user.email } : input,
  );
  if (!checked.ok) return { ok: false, error: checked.error };
  const c = checked.value;

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null;

  // Limite : N messages par heure glissante, par compte sinon par IP.
  const since = new Date(Date.now() - HOUR_MS);
  const recent = await prisma.contactMessage.count({
    where: {
      createdAt: { gte: since },
      ...(user ? { userId: user.id } : ip ? { ip } : { id: "__none__" }),
    },
  });
  if (recent >= CONTACT_LIMITS.perHour) {
    return {
      ok: false,
      error: "Tu as déjà envoyé plusieurs messages récemment. Réessaie dans une heure.",
    };
  }

  const row = await prisma.contactMessage.create({
    data: {
      type: c.kind,
      name: c.name,
      email: c.email,
      userId: user?.id ?? null,
      message: c.message,
      details:
        c.kind === "BUG"
          ? { location: c.bugLocation, steps: c.bugSteps }
          : c.kind === "IDEA"
            ? { creditOk: c.creditOk }
            : undefined,
      ip,
    },
  });

  const universeSlug = (await cookies()).get("universe")?.value ?? null;
  const universe = universeSlug ? getUniverseBySlug(universeSlug) : undefined;
  const origin = (await siteSeo()).url;

  const sent = await sendMail({
    ...contactMail({
      kind: c.kind,
      name: c.name,
      email: c.email,
      message: c.message,
      username: user?.username ?? null,
      profileUrl:
        user && universe ? `${origin}/${universeSlug}/u/${user.username}` : null,
      universe: universe ? `${universe.name} (${universeSlug})` : null,
      userAgent: h.get("user-agent"),
      bugLocation: c.bugLocation,
      bugSteps: c.bugSteps,
      creditOk: c.creditOk,
    }),
    replyTo: c.email,
  });

  if (!sent.ok) {
    return {
      ok: false,
      error:
        "Ton message est bien enregistré, mais son envoi par mail a échoué. Inutile de le renvoyer : l'équipe le verra quand même.",
    };
  }
  await prisma.contactMessage.update({
    where: { id: row.id },
    data: { mailed: true },
  });
  return { ok: true };
}
