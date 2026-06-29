"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  type SerializedLobby,
} from "@/lib/multiplayer/events";
import { UserAvatar } from "@/components/UserAvatar";

interface WaitingRoomProps {
  lobby: SerializedLobby;
  currentUserId: string;
  pending: boolean;
  onStart: () => void;
  onLeave: () => void;
  /** Titre affiché (défaut : builder). */
  title?: string;
  /** Capacité du lobby (défaut : MAX_PLAYERS). 1v1 = 2 pour le battle. */
  maxPlayers?: number;
  /** Contrôles supplémentaires (ex. options de partie), affichés à l'hôte. */
  hostExtra?: React.ReactNode;
}

export function WaitingRoom({
  lobby,
  currentUserId,
  pending,
  onStart,
  onLeave,
  title = "Build the Perfect Sorcerer",
  maxPlayers = MAX_PLAYERS,
  hostExtra,
}: WaitingRoomProps) {
  const [copied, setCopied] = useState(false);
  const isHost = lobby.hostId === currentUserId;
  const canStart = isHost && lobby.players.length >= MIN_PLAYERS;

  async function copyCode() {
    const flash = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };
    // navigator.clipboard est indisponible hors contexte sécurisé (http/LAN) :
    // on tente l'API moderne puis on retombe sur execCommand.
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(lobby.code);
        flash();
        return;
      }
    } catch {
      // fallthrough vers le fallback
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = lobby.code;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      flash();
    } catch {
      // En dernier recours, on ne bloque pas : le code reste lisible à l'écran.
    }
  }

  return (
    <div className="mx-auto max-w-lg text-center">
      <p className="text-sm uppercase tracking-[0.3em] text-white/40">Salon d'attente</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-white">
        {title}
      </h1>

      {/* Code partageable */}
      <button
        type="button"
        onClick={() => void copyCode()}
        className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-void-800/70 px-6 py-4 transition-colors hover:border-domain-light"
      >
        <span className="font-display text-4xl font-black tracking-[0.4em] text-white">
          {lobby.code}
        </span>
        <span className="text-xs uppercase tracking-wider text-domain-light">
          {copied ? "Copié ✓" : "Copier"}
        </span>
      </button>
      <p className="mt-2 text-xs text-white/40">
        Partage ce code pour inviter (jusqu'à {maxPlayers} joueurs).
      </p>

      {/* Liste des joueurs */}
      <ul className="mt-8 space-y-2 text-left">
        {lobby.players.map((p) => (
          <motion.li
            key={p.userId}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-void-800/50 px-4 py-3"
          >
            <span className="flex items-center gap-2.5 font-semibold text-white">
              <UserAvatar username={p.username} image={p.avatarImage} size={32} />
              {p.username}
              {p.userId === currentUserId && (
                <span className="ml-1 text-xs text-white/40">(toi)</span>
              )}
            </span>
            {p.userId === lobby.hostId && (
              <span className="rounded-full bg-domain/15 px-2 py-0.5 text-xs font-bold text-domain-light">
                Hôte
              </span>
            )}
          </motion.li>
        ))}
        {Array.from({ length: Math.max(0, maxPlayers - lobby.players.length) }).map((_, i) => (
          <li
            key={`empty-${i}`}
            className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-sm text-white/30"
          >
            En attente d'un joueur…
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-col items-center gap-3">
        {isHost && hostExtra}
        {isHost ? (
          <button
            type="button"
            disabled={!canStart || pending}
            onClick={onStart}
            className="w-full max-w-xs rounded-xl bg-domain px-6 py-3 font-display font-bold uppercase tracking-wide text-white shadow-glow transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {canStart ? "Démarrer la partie" : `Il faut ${MIN_PLAYERS} joueurs`}
          </button>
        ) : (
          <p className="text-sm text-white/50">
            En attente du démarrage par l'hôte…
          </p>
        )}
        <button
          type="button"
          onClick={onLeave}
          disabled={pending}
          className="text-sm text-white/40 transition-colors hover:text-cursed-light"
        >
          Quitter le lobby
        </button>
      </div>
    </div>
  );
}
