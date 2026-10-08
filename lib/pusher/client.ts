"use client";

import type PusherClient from "pusher-js";
import type { Channel } from "pusher-js";

/**
 * Client Pusher côté navigateur : UNE SEULE connexion websocket par onglet,
 * partagée par tous les composants temps réel (bulle de messages, toasts,
 * pastille sociale, lobbies, tables du casino).
 *
 * Chaque composant ouvre le(s) canal(aux) dont il a besoin via `openChannel` :
 * un canal par lobby / table / utilisateur, autant que nécessaire sur la même
 * connexion. Un canal demandé par plusieurs composants n'est souscrit qu'une
 * fois (compteur de références) ; chacun ne retire QUE ses propres handlers à la
 * fermeture. La connexion se coupe quand plus aucun canal n'est ouvert.
 *
 * `pusher-js` est chargé à la demande (import dynamique) : il ne pèse rien sur
 * les pages sans temps réel ni pour les visiteurs non connectés.
 *
 * L'abonnement aux canaux privés / de présence passe par `/api/pusher/auth`, qui
 * valide la session et l'appartenance au lobby.
 */

export function isPusherClientConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_PUSHER_KEY &&
      process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (payload: any) => void;

let client: PusherClient | null = null;
let loading: Promise<PusherClient> | null = null;
/** Nombre de `openChannel` encore ouverts, par nom de canal. */
const refCounts = new Map<string, number>();

function loadClient(): Promise<PusherClient> {
  if (client) return Promise.resolve(client);
  loading ??= import("pusher-js").then(({ default: Pusher }) => {
    client = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: "/api/pusher/auth",
    });
    return client;
  });
  return loading;
}

export interface ChannelHandle {
  /** Branche un handler (actif dès que le canal est prêt). */
  bind(event: string, handler: Handler): void;
  /** Retire les handlers de CE composant et libère sa référence au canal. */
  close(): void;
}

/**
 * Ouvre (ou partage) l'abonnement au canal `name`. À appeler dans un
 * `useEffect`, et à refermer dans son cleanup avec `handle.close()`.
 */
export function openChannel(name: string): ChannelHandle {
  const bindings: [string, Handler][] = [];
  let channel: Channel | null = null;
  let closed = false;

  refCounts.set(name, (refCounts.get(name) ?? 0) + 1);

  void loadClient().then((c) => {
    if (closed) return;
    // Sans effet si la connexion est déjà ouverte ; la rouvre après une
    // déconnexion (plus aucun canal ouvert entre deux pages).
    c.connect();
    // Canal déjà souscrit par un autre composant : on le réutilise tel quel
    // (`subscribe` renverrait une demande d'abonnement). Sinon `subscribe` le
    // crée, ou réactive un désabonnement encore en vol.
    const existing = c.channel(name);
    channel = existing?.subscribed ? existing : c.subscribe(name);
    for (const [event, handler] of bindings) channel.bind(event, handler);
  });

  return {
    bind(event, handler) {
      bindings.push([event, handler]);
      channel?.bind(event, handler);
    },
    close() {
      if (closed) return;
      closed = true;
      for (const [event, handler] of bindings) channel?.unbind(event, handler);

      const remaining = (refCounts.get(name) ?? 1) - 1;
      if (remaining > 0) {
        refCounts.set(name, remaining);
        return;
      }
      refCounts.delete(name);
      client?.unsubscribe(name);
      if (refCounts.size === 0) client?.disconnect();
    },
  };
}
