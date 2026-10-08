"use client";

import PusherClient from "pusher-js";

/**
 * Fabrique le client Pusher côté navigateur. L'abonnement aux canaux de présence
 * (`presence-lobby-*`) passe par `/api/pusher/auth` qui valide la session et
 * l'appartenance au lobby.
 */

export function isPusherClientConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_PUSHER_KEY &&
      process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  );
}

export function createPusherClient(): PusherClient {
  return new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    authEndpoint: "/api/pusher/auth",
  });
}
