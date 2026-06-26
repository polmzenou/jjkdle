import "server-only";
import Pusher from "pusher";
import { lobbyChannel } from "@/lib/multiplayer/events";

/**
 * Instance Pusher côté serveur (clés secrètes). Utilisée par les Server Actions
 * pour diffuser l'état du lobby, et par la route d'auth des canaux de présence.
 *
 * Les variables d'env sont optionnelles : si elles manquent, le mode multijoueur
 * est simplement indisponible (le reste de l'app n'est pas affecté).
 */

let instance: Pusher | null = null;

export function isPusherConfigured(): boolean {
  return Boolean(
    process.env.PUSHER_APP_ID &&
      process.env.PUSHER_SECRET &&
      process.env.NEXT_PUBLIC_PUSHER_KEY &&
      process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  );
}

/** Renvoie l'instance Pusher serveur (la crée au premier appel). */
export function getPusherServer(): Pusher {
  if (!isPusherConfigured()) {
    throw new Error(
      "Pusher non configuré : renseigne PUSHER_APP_ID, PUSHER_SECRET, " +
        "NEXT_PUBLIC_PUSHER_KEY et NEXT_PUBLIC_PUSHER_CLUSTER dans .env.",
    );
  }
  if (!instance) {
    instance = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    });
  }
  return instance;
}

/** Diffuse un événement à tous les membres d'un lobby. */
export async function triggerLobby(
  code: string,
  event: string,
  data: unknown,
): Promise<void> {
  await getPusherServer().trigger(lobbyChannel(code), event, data);
}
