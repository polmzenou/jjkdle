"use client";

import { useEffect, useRef } from "react";
import { createPusherClient, isPusherClientConfigured } from "@/lib/pusher/client";
import { userChannel } from "@/lib/social/events";

/**
 * Abonne le navigateur au canal privé de l'utilisateur (`private-user-<id>`)
 * et route chaque événement vers son handler.
 *
 * Les handlers sont lus via une ref : les changer à chaque rendu ne relance pas
 * l'abonnement. Sans Pusher configuré, ne fait rien (`fallbackMs` permet alors
 * un repli par sondage, ex. `router.refresh`).
 */
export function useUserChannel(
  userId: string | null,
  handlers: Record<string, (payload: unknown) => void>,
  fallback?: { ms: number; poll: () => void },
): void {
  const ref = useRef(handlers);
  ref.current = handlers;
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  const events = Object.keys(handlers).sort().join("|");

  useEffect(() => {
    if (!userId) return;

    if (!isPusherClientConfigured()) {
      const fb = fallbackRef.current;
      if (!fb) return;
      const id = window.setInterval(() => fallbackRef.current?.poll(), fb.ms);
      return () => window.clearInterval(id);
    }

    const client = createPusherClient();
    const name = userChannel(userId);
    const channel = client.subscribe(name);
    for (const event of events.split("|")) {
      if (!event) continue;
      channel.bind(event, (payload: unknown) => ref.current[event]?.(payload));
    }
    return () => {
      client.unsubscribe(name);
      client.disconnect();
    };
  }, [userId, events]);
}
