"use client";

import { useEffect, useRef, useState } from "react";
import {
  CODENAMES_CHAT_MAX,
  type CodenamesChatMessage,
} from "@/lib/games/codenames/types";
import { TEAM_STYLES } from "./colors";

interface CodenamesChatProps {
  messages: CodenamesChatMessage[];
  currentUserId: string;
  onSend: (text: string) => void;
}

/**
 * Chat intégré (panneau latéral). Messages éphémères (non persistés) reçus via
 * `codenames:chat`. Les indices (`kind: "clue"`) sont mis en avant et colorés
 * selon l'équipe qui les a donnés.
 */
export function CodenamesChat({
  messages,
  currentUserId,
  onSend,
}: CodenamesChatProps) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-white/10 bg-void-800/50">
      <p className="border-b border-white/10 px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-white/70">
        Chat & indices
      </p>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <p className="text-sm text-white/35">
            Les indices des maîtres-espions et vos messages s'affichent ici.
          </p>
        ) : (
          messages.map((m, i) => {
            if (m.kind === "clue" && m.team) {
              const s = TEAM_STYLES[m.team];
              return (
                <div
                  key={`${m.at}-${i}`}
                  className={`rounded-xl border ${s.border} ${s.bgSoft} px-3 py-1.5`}
                >
                  <span className={`text-[0.65rem] font-bold uppercase tracking-wider ${s.text}`}>
                    {m.username} · indice
                  </span>
                  <p className="text-sm font-semibold text-white">{m.text}</p>
                </div>
              );
            }
            const mine = m.userId === currentUserId;
            return (
              <div
                key={`${m.at}-${i}`}
                className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
              >
                <span className="text-[0.65rem] uppercase tracking-wider text-white/35">
                  {mine ? "Toi" : m.username}
                </span>
                <span
                  className={`max-w-[85%] break-words rounded-2xl px-3 py-1.5 text-sm ${
                    mine ? "bg-domain/25 text-white" : "bg-void-700/70 text-white/85"
                  }`}
                >
                  {m.text}
                </span>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-white/10 p-2.5">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={CODENAMES_CHAT_MAX}
          placeholder="Écris un message…"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-void-900 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-domain-light focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="rounded-xl bg-domain px-4 py-2 text-sm font-bold text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
