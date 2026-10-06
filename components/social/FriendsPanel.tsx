"use client";

import { useState } from "react";
import { UniverseLink } from "@/components/universe/UniverseLink";
import {
  cancelFriendRequestAction,
  removeFriendAction,
  respondFriendRequestAction,
  sendFriendRequestAction,
} from "@/app/[universe]/account/social/actions";
import type { FriendRequestView, FriendView } from "@/lib/social/types";
import type { SocialRun } from "./SocialHub";

const BTN =
  "rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-40";
const BTN_GHOST = `${BTN} border-white/10 bg-void-800/80 text-white/60 hover:border-domain/50 hover:text-white`;
const BTN_PRIMARY = `${BTN} border-domain/60 bg-domain/20 text-domain-light hover:bg-domain/30`;
const BTN_DANGER = `${BTN} border-white/10 bg-void-800/80 text-white/40 hover:border-cursed/50 hover:text-cursed-light`;

/** Onglet AMIS : ajout par pseudo, demandes reçues / envoyées, liste d'amis. */
export function FriendsPanel({
  friends,
  requests,
  pending,
  run,
  onTrade,
  onMessage,
}: {
  friends: FriendView[];
  requests: { received: FriendRequestView[]; sent: FriendRequestView[] };
  pending: boolean;
  run: SocialRun;
  onTrade: (friendId: string) => void;
  onMessage: (friendId: string) => void;
}) {
  const [username, setUsername] = useState("");

  return (
    <div className="space-y-10">
      <form
        className="flex max-w-lg gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const name = username.trim();
          if (!name) return;
          run(() => sendFriendRequestAction(name), () => setUsername(""));
        }}
      >
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Pseudo du joueur"
          maxLength={64}
          aria-label="Pseudo du joueur à ajouter"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-void-800/80 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-domain/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || !username.trim()}
          className="rounded-xl bg-domain px-5 py-2.5 text-sm font-black uppercase tracking-wider text-white shadow-glow transition-transform hover:scale-105 disabled:scale-100 disabled:opacity-40"
        >
          Ajouter
        </button>
      </form>

      {requests.received.length > 0 && (
        <Section title="Demandes reçues" count={requests.received.length}>
          {requests.received.map((r) => (
            <Row key={r.id} username={r.username}>
              <button
                type="button"
                disabled={pending}
                className={BTN_PRIMARY}
                onClick={() => run(() => respondFriendRequestAction(r.id, true))}
              >
                Accepter
              </button>
              <button
                type="button"
                disabled={pending}
                className={BTN_DANGER}
                onClick={() => run(() => respondFriendRequestAction(r.id, false))}
              >
                Refuser
              </button>
            </Row>
          ))}
        </Section>
      )}

      <Section title="Mes amis" count={friends.length}>
        {friends.length === 0 ? (
          <Empty>
            Pas encore d&apos;amis. Ajoute un joueur par son pseudo, ou depuis
            son profil public.
          </Empty>
        ) : (
          friends.map((f) => (
            <Row key={f.userId} username={f.username}>
              <button type="button" className={BTN_PRIMARY} onClick={() => onTrade(f.userId)}>
                Échanger
              </button>
              <button type="button" className={BTN_GHOST} onClick={() => onMessage(f.userId)}>
                Message
              </button>
              <button
                type="button"
                disabled={pending}
                className={BTN_DANGER}
                onClick={() => {
                  if (window.confirm(`Retirer ${f.username} de tes amis ?`)) {
                    run(() => removeFriendAction(f.userId));
                  }
                }}
              >
                Retirer
              </button>
            </Row>
          ))
        )}
      </Section>

      {requests.sent.length > 0 && (
        <Section title="Demandes envoyées" count={requests.sent.length}>
          {requests.sent.map((r) => (
            <Row key={r.id} username={r.username} muted>
              <span className="text-xs text-white/35">En attente…</span>
              <button
                type="button"
                disabled={pending}
                className={BTN_DANGER}
                onClick={() => run(() => cancelFriendRequestAction(r.id))}
              >
                Annuler
              </button>
            </Row>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-white/45">
        {title} <span className="text-white/25">· {count}</span>
      </h2>
      <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-void-800/60 backdrop-blur">
        {children}
      </ul>
    </section>
  );
}

function Row({
  username,
  muted = false,
  children,
}: {
  username: string;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <UniverseLink
        href={`/u/${encodeURIComponent(username)}`}
        className={`flex items-center gap-3 font-display font-bold transition-colors hover:text-domain-light ${
          muted ? "text-white/50" : "text-white/90"
        }`}
      >
        <span
          aria-hidden
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-void-900 text-sm uppercase text-white/60"
        >
          {username.slice(0, 2)}
        </span>
        {username}
      </UniverseLink>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </li>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <li className="px-4 py-8 text-center text-sm text-white/45">{children}</li>;
}
