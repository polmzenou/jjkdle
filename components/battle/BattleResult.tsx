"use client";

import { motion } from "framer-motion";
import type { SerializedLobby } from "@/lib/multiplayer/events";
import type { RosterMap } from "@/lib/multiplayer/state";
import { type BattleState } from "@/lib/games/battle/types";
import { gauntletBreakdown } from "@/lib/games/battle/combat";
import { UserAvatar } from "@/components/UserAvatar";
import { DeckGrid } from "./DeckGrid";
import { GauntletDeck } from "./GauntletDeck";

interface BattleResultProps {
  lobby: SerializedLobby;
  gameState: BattleState;
  rosterMap: RosterMap;
  currentUserId: string;
  pending: boolean;
  onPlayAgain: () => void;
  onLeave: () => void;
}

export function BattleResult({
  lobby,
  gameState,
  rosterMap,
  currentUserId,
  pending,
  onPlayAgain,
  onLeave,
}: BattleResultProps) {
  const result = gameState.result;
  const isHost = lobby.hostId === currentUserId;
  const me = lobby.players.find((p) => p.userId === currentUserId);
  const opponent = lobby.players.find((p) => p.userId !== currentUserId);

  // Hardcore : on affiche les survivants restants ; sinon le cumul des battleValue.
  const hardcore = gameState.mode === "hardcore" && result?.survivors;
  const myStat = hardcore
    ? (result?.survivors?.[currentUserId] ?? 0)
    : (result?.scores[currentUserId] ?? 0);
  const oppStat = opponent
    ? hardcore
      ? (result?.survivors?.[opponent.userId] ?? 0)
      : (result?.scores[opponent.userId] ?? 0)
    : 0;
  const statLabel = hardcore ? "survivant(s)" : "pts";

  const myDeck = gameState.decks[currentUserId] ?? [];
  const oppDeck = opponent ? (gameState.decks[opponent.userId] ?? []) : [];

  let headline: string;
  let color: string;
  if (result?.tie) {
    headline = "Égalité";
    color = "#a78bfa";
  } else if (result?.winnerUserId === currentUserId) {
    headline = "Victoire !";
    color = "#22c55e";
  } else {
    headline = "Défaite";
    color = "#dc2626";
  }

  return (
    <div className="mx-auto max-w-3xl text-center">
      <motion.h1
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 14 }}
        className="font-display text-5xl font-black"
        style={{ color, textShadow: `0 0 24px ${color}88` }}
      >
        {headline}
      </motion.h1>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 font-display text-2xl font-bold text-white sm:gap-6">
        <span className="flex items-center gap-2">
          <UserAvatar username={me?.username ?? "Toi"} image={me?.avatarImage ?? null} size={32} />
          {me?.username ?? "Toi"} :{" "}
          <span className="text-domain-light">{myStat}</span>{" "}
          <span className="text-sm font-normal text-white/40">{statLabel}</span>
        </span>
        <span className="text-white/30">—</span>
        <span className="flex items-center gap-2">
          <UserAvatar
            username={opponent?.username ?? "Adversaire"}
            image={opponent?.avatarImage ?? null}
            size={32}
          />
          {opponent?.username ?? "Adversaire"} :{" "}
          <span className="text-cursed-light">{oppStat}</span>{" "}
          <span className="text-sm font-normal text-white/40">{statLabel}</span>
        </span>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {hardcore ? (
          <>
            <GauntletDeck
              title={`${me?.username ?? "Toi"} (toi)`}
              log={gauntletBreakdown(myDeck, oppDeck, rosterMap)}
              rosterMap={rosterMap}
              accent="#7c3aed"
              avatar={me ? { username: me.username, image: me.avatarImage } : undefined}
            />
            {opponent && (
              <GauntletDeck
                title={opponent.username}
                log={gauntletBreakdown(oppDeck, myDeck, rosterMap)}
                rosterMap={rosterMap}
                accent="#dc2626"
                avatar={{ username: opponent.username, image: opponent.avatarImage }}
              />
            )}
          </>
        ) : (
          <>
            <DeckGrid
              title={`${me?.username ?? "Toi"} (toi)`}
              deckIds={myDeck}
              rosterMap={rosterMap}
              accent="#7c3aed"
              avatar={me ? { username: me.username, image: me.avatarImage } : undefined}
            />
            {opponent && (
              <DeckGrid
                title={opponent.username}
                deckIds={oppDeck}
                rosterMap={rosterMap}
                accent="#dc2626"
                avatar={{ username: opponent.username, image: opponent.avatarImage }}
              />
            )}
          </>
        )}
      </div>

      <div className="mt-10 flex flex-col items-center gap-3">
        {isHost ? (
          <button
            type="button"
            disabled={pending}
            onClick={onPlayAgain}
            className="w-full max-w-xs rounded-xl bg-domain px-6 py-3 font-display font-bold uppercase tracking-wide text-white shadow-glow transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
          >
            Rejouer
          </button>
        ) : (
          <p className="text-sm text-white/50">
            En attente d'une nouvelle partie lancée par l'hôte…
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
