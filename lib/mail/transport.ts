import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Transport SMTP Gmail (nodemailer), créé paresseusement au premier envoi.
 *
 * Auth par « mot de passe d'application » Google (SMTP_USER / SMTP_PASS) — le mot
 * de passe du compte ne marche pas en SMTP. Comme Pusher, le mail est OPTIONNEL :
 * sans ces variables, rien n'est envoyé et le reste de l'app fonctionne (dev local).
 */

/** Destinataire des notifications et des messages de contact. */
export const DEFAULT_ADMIN_EMAIL = "anime.arcadeidle@gmail.com";

export function adminRecipient(): string {
  return process.env.ADMIN_NOTIFY_EMAIL?.trim() || DEFAULT_ADMIN_EMAIL;
}

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter: Transporter | null = null;

export function getTransporter(): Transporter | null {
  if (!isMailConfigured()) return null;
  transporter ??= nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      // Google affiche le mot de passe d'application par blocs de 4 : on
      // tolère qu'il soit collé avec ses espaces.
      pass: process.env.SMTP_PASS!.replace(/\s+/g, ""),
    },
  });
  return transporter;
}
