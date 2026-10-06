"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadConversationAction,
  sendMessageAction,
} from "@/app/[universe]/account/social/actions";
import { SOCIAL_EVENTS } from "@/lib/social/events";
import type { ConversationView, MessageView } from "@/lib/social/types";
import { useUserChannel } from "./useUserChannel";

const MESSAGE_MAX = 500;

const timeFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Onglet MESSAGES : liste des conversations (une par ami) + fil actif.
 *
 * Les messages entrants arrivent par le canal Pusher privé : ajoutés au fil
 * s'il est ouvert (et marqués lus en relisant le fil), sinon comptés comme
 * non lus. Sans Pusher, le fil ouvert est relu toutes les 10 s.
 */
export function MessagesPanel({
  me,
  conversations,
  active,
  onSelect,
}: {
  me: { id: string; username: string };
  conversations: ConversationView[];
  active: string | null;
  onSelect: (friendId: string) => void;
}) {
  const [unread, setUnread] = useState<Record<string, number>>(() =>
    Object.fromEntries(conversations.map((c) => [c.friendId, c.unread])),
  );
  const [thread, setThread] = useState<MessageView[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find((c) => c.friendId === active) ?? null;

  const load = useCallback(async (friendId: string) => {
    const res = await loadConversationAction(friendId);
    if (res.ok && res.messages) {
      setThread(res.messages);
      setUnread((u) => ({ ...u, [friendId]: 0 }));
    } else {
      setError(res.error ?? "Chargement impossible.");
    }
  }, []);

  useEffect(() => {
    setThread(null);
    setError(null);
    if (active) void load(active);
  }, [active, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [thread]);

  useUserChannel(
    me.id,
    {
      [SOCIAL_EVENTS.message]: (payload) => {
        const msg = payload as MessageView;
        if (msg.senderId === active) {
          // Relire le fil le marque lu côté serveur.
          void load(msg.senderId);
        } else {
          setUnread((u) => ({ ...u, [msg.senderId]: (u[msg.senderId] ?? 0) + 1 }));
        }
      },
    },
    active ? { ms: 10_000, poll: () => void load(active) } : undefined,
  );

  const send = async () => {
    const body = draft.trim();
    if (!active || !body || sending) return;
    setSending(true);
    setError(null);
    const res = await sendMessageAction(active, body);
    setSending(false);
    if (res.ok && res.message) {
      setDraft("");
      setThread((t) => [...(t ?? []), res.message!]);
    } else {
      setError(res.error ?? "Envoi impossible.");
    }
  };

  if (conversations.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-void-800/60 px-6 py-10 text-center text-white/55">
        Ajoute des amis pour discuter avec eux.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
      <ul className="max-h-[32rem] overflow-y-auto rounded-2xl border border-white/10 bg-void-800/60 backdrop-blur">
        {conversations.map((c) => {
          const n = unread[c.friendId] ?? 0;
          const selected = c.friendId === active;
          return (
            <li key={c.friendId}>
              <button
                type="button"
                onClick={() => onSelect(c.friendId)}
                className={`flex w-full items-center justify-between gap-2 border-b border-white/5 px-4 py-3 text-left transition-colors ${
                  selected ? "bg-domain/15" : "hover:bg-white/5"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-display font-bold text-white/90">
                    {c.username}
                  </span>
                  {c.lastMessage && (
                    <span className="block truncate text-xs text-white/40">
                      {c.lastMessage.senderId === me.id ? "Toi : " : ""}
                      {c.lastMessage.body}
                    </span>
                  )}
                </span>
                {n > 0 && (
                  <span className="shrink-0 rounded-full bg-domain px-2 py-0.5 text-[10px] font-black text-white">
                    {n}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex min-h-[24rem] flex-col rounded-2xl border border-white/10 bg-void-800/60 backdrop-blur">
        {!activeConv ? (
          <p className="m-auto px-6 text-center text-sm text-white/45">
            Choisis un ami pour ouvrir la conversation.
          </p>
        ) : (
          <>
            <p className="border-b border-white/5 px-4 py-3 font-display font-bold text-white/90">
              {activeConv.username}
            </p>
            <div className="max-h-[26rem] flex-1 space-y-2 overflow-y-auto px-4 py-4">
              {thread === null ? (
                <p className="animate-pulse text-sm text-white/40">Chargement…</p>
              ) : thread.length === 0 ? (
                <p className="text-center text-sm text-white/40">
                  Aucun message. Dis bonjour !
                </p>
              ) : (
                thread.map((m) => {
                  const mine = m.senderId === me.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                          mine ? "bg-domain/30 text-white" : "bg-void-900/80 text-white/85"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        <p className="mt-1 text-right text-[10px] text-white/35">
                          {timeFmt.format(new Date(m.createdAt))}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>
            {error && <p className="px-4 pb-2 text-sm text-cursed-light">{error}</p>}
            <form
              className="flex gap-2 border-t border-white/5 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={MESSAGE_MAX}
                placeholder={`Message à ${activeConv.username}`}
                aria-label="Message"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-void-900/70 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-domain/60 focus:outline-none"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="rounded-xl bg-domain px-4 py-2.5 text-sm font-black uppercase tracking-wider text-white disabled:opacity-40"
              >
                Envoyer
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
