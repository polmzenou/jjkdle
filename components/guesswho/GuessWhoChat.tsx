"use client";

import { useEffect, useRef, useState } from "react";
import { GUESSWHO_CHAT_MAX, type GuessWhoChatMessage } from "@/lib/games/guesswho/types";

interface GuessWhoChatProps {
  messages: GuessWhoChatMessage[];
  currentUserId: string;
  onSend: (text: string) => void;
  /** Mode spectateur : pas de saisie libre, uniquement une palette d'emojis. */
  emojiOnly?: boolean;
}

/** Palette d'emojis pour les spectateurs (aucune lettre ni chiffre). */
const SPECTATOR_EMOJIS = [
  "😀", "😂", "😍", "😎", "😭", "😱", "🤯", "🥶", "🤔", "😴",
  "🔥", "💀", "👀", "👏", "🙌", "💪", "🎉", "❤️", "💜", "⚡",
  "🩸", "🗿", "👑", "🥇", "🤡", "😤", "🫡", "🙏", "✨", "🙈",
];

/**
 * Chat intégré (panneau latéral). Les messages sont éphémères (non persistés) :
 * c'est là que les joueurs posent leurs questions. Reçus via `guesswho:chat`.
 */
export function GuessWhoChat({
  messages,
  currentUserId,
  onSend,
  emojiOnly = false,
}: GuessWhoChatProps) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll vers le dernier message.
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
      <p className="border-b border-white/10 px-4 py-3 font-display text-sm font-bold uppercase tracking-wide text-white/70">
        Chat
      </p>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <p className="text-sm text-white/35">
            Pose tes questions ici pour éliminer des personnages.
          </p>
        ) : (
          messages.map((m, i) => {
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
                    mine
                      ? "bg-domain/25 text-white"
                      : "bg-void-700/70 text-white/85"
                  }`}
                >
                  {m.text}
                </span>
              </div>
            );
          })
        )}
      </div>

      {emojiOnly ? (
        <div className="flex flex-wrap justify-center gap-1 border-t border-white/10 p-2">
          {SPECTATOR_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onSend(emoji)}
              className="rounded-lg px-1.5 py-1 text-lg transition-transform hover:scale-125 active:scale-95"
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : (
        <form onSubmit={submit} className="flex gap-2 border-t border-white/10 p-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={GUESSWHO_CHAT_MAX}
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
      )}
    </div>
  );
}
