"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CharacterImage } from "@/components/CharacterImage";
import type { SerializedLobby } from "@/lib/multiplayer/events";
import type { RosterMap } from "@/lib/multiplayer/state";
import {
  DECK_SIZE,
  type BattleDecision,
  type BattleState,
} from "@/lib/games/battle/types";
import { DeckGrid } from "./DeckGrid";

interface DraftPhaseProps {
  lobby: SerializedLobby;
  gameState: BattleState;
  rosterMap: RosterMap;
  currentUserId: string;
  pending: boolean;
  onDecide: (decision: BattleDecision) => void;
}

export function DraftPhase({
  lobby,
  gameState,
  rosterMap,
  currentUserId,
  pending,
  onDecide,
}: DraftPhaseProps) {
  const me = lobby.players.find((p) => p.userId === currentUserId);
  const opponent = lobby.players.find((p) => p.userId !== currentUserId);

  const myDeck = gameState.decks[currentUserId] ?? [];
  const oppDeck = opponent ? (gameState.decks[opponent.userId] ?? []) : [];

  const myTurn = gameState.activeUserId === currentUserId;
  const myDeckFull = myDeck.length >= DECK_SIZE;
  const oppDeckFull = oppDeck.length >= DECK_SIZE;
  const card = gameState.currentCardId ? rosterMap[gameState.currentCardId] : null;

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Phase de draft
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">
          {myTurn ? (
            <span className="text-domain-light">À toi de jouer</span>
          ) : (
            <span className="text-white/60">
              Tour de {opponent?.username ?? "l'adversaire"}…
            </span>
          )}
        </h1>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_auto_1fr]">
        {/* Mon deck */}
        <DeckGrid
          title={`${me?.username ?? "Toi"} (toi)`}
          deckIds={myDeck}
          rosterMap={rosterMap}
          accent="#7c3aed"
          showCount
          avatar={me ? { username: me.username, image: me.avatarImage } : undefined}
        />

        {/* Carte centrale */}
        <div className="flex flex-col items-center justify-center px-2 py-4">
          <AnimatePresence mode="wait">
            {card ? (
              <motion.div
                key={gameState.currentCardId}
                initial={{ scale: 0.4, opacity: 0, rotateY: 90 }}
                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
                className="relative aspect-[3/4] w-44 overflow-hidden rounded-2xl border-2 border-domain-light bg-void-900 shadow-glow sm:w-52"
              >
                <CharacterImage character={card} />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-void-900 to-transparent p-3 pt-10">
                  <p className="truncate font-display text-sm font-bold text-white">
                    {card.name}
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="aspect-[3/4] w-44 rounded-2xl border border-dashed border-white/15 sm:w-52" />
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              disabled={!myTurn || pending || myDeckFull}
              onClick={() => onDecide("keep")}
              className="rounded-xl bg-domain px-6 py-3 font-display font-bold uppercase tracking-wide text-white shadow-glow transition-transform enabled:hover:scale-105 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Garder
            </button>
            <button
              type="button"
              disabled={!myTurn || pending || oppDeckFull}
              onClick={() => onDecide("give")}
              className="rounded-xl border border-cursed/50 bg-cursed/10 px-6 py-3 font-display font-bold uppercase tracking-wide text-cursed-light transition-colors enabled:hover:bg-cursed/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Donner à l'adversaire
            </button>
            {myTurn && myDeckFull && (
              <p className="max-w-[12rem] text-center text-xs text-white/45">
                Ton deck est plein : tu dois donner cette carte.
              </p>
            )}
            {myTurn && oppDeckFull && (
              <p className="max-w-[12rem] text-center text-xs text-white/45">
                Le deck adverse est plein : tu dois garder cette carte.
              </p>
            )}
          </div>
        </div>

        {/* Deck adverse */}
        <DeckGrid
          title={opponent?.username ?? "Adversaire"}
          deckIds={oppDeck}
          rosterMap={rosterMap}
          accent="#dc2626"
          showCount
          avatar={
            opponent ? { username: opponent.username, image: opponent.avatarImage } : undefined
          }
        />
      </div>
    </div>
  );
}
