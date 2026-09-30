import "server-only";
import { adminRecipient, getTransporter } from "./transport";

export interface MailInput {
  subject: string;
  html: string;
  text: string;
  /** Adresse de réponse (formulaire de contact : l'email du joueur). */
  replyTo?: string;
  /** Destinataire ; par défaut l'adresse d'administration. */
  to?: string;
}

export type MailResult = { ok: true } | { ok: false; error: string };

/**
 * Envoie un mail. Ne LÈVE JAMAIS : une notification ratée ne doit pas faire
 * échouer l'action qui l'a déclenchée (inscription, bascule d'un jeu…). Le
 * résultat permet à l'appelant qui en a besoin (formulaire de contact) de réagir.
 */
export async function sendMail(input: MailInput): Promise<MailResult> {
  const transport = getTransporter();
  if (!transport) {
    console.warn(
      `[mail] SMTP non configuré (SMTP_USER / SMTP_PASS) — mail ignoré : ${input.subject}`,
    );
    return { ok: false, error: "SMTP non configuré." };
  }
  try {
    await transport.sendMail({
      from: `"Anime Arcade" <${process.env.SMTP_USER}>`,
      to: input.to ?? adminRecipient(),
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });
    return { ok: true };
  } catch (e) {
    console.error(`[mail] Échec d'envoi « ${input.subject} » :`, e);
    return { ok: false, error: (e as Error).message };
  }
}
