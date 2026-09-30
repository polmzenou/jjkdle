import "server-only";
import { after } from "next/server";
import { sendMail } from "./send";
import { adminEventMail, type AdminEvent } from "./templates";

export type { AdminEvent } from "./templates";

/**
 * Notifie l'administration par mail d'un événement du site.
 *
 * L'envoi est planifié avec `after()` : il part APRÈS la réponse, sans retarder
 * l'action qui le déclenche, et Vercel garde la fonction en vie le temps de
 * l'envoyer. Hors contexte de requête (script, cron…) `after` lève : on envoie
 * alors directement. Ne lève jamais.
 */
export function notifyAdmin(event: AdminEvent): void {
  const send = async () => {
    await sendMail(adminEventMail(event));
  };
  try {
    after(send);
  } catch {
    void send();
  }
}
