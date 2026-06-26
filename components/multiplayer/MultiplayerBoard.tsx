"use client";

import { motion } from "framer-motion";
import type { CategoryConfig } from "@/data/roster/categories";
import type { RosterMap } from "@/lib/multiplayer/state";
import type { SerializedLobby, SerializedPlayer } from "@/lib/multiplayer/events";
import { PlayerBoard } from "./PlayerBoard";

interface MultiplayerBoardProps {
  lobby: SerializedLobby;
  categories: CategoryConfig[];
  rosterMap: RosterMap;
  currentUserId: string;
  onLock: (categoryId: string) => void;
  /** Easter egg perso : bascule le tirage "meilleures cartes". */
  onToggleCurated: () => void;
  /** Easter egg caché : sabote l'adversaire ciblé. */
  onSabotage: (targetUserId: string) => void;
}

/** Nombre de catégories verrouillées par un joueur. */
function lockedCount(player: SerializedPlayer): number {
  return Object.keys(player.selection).length;
}

/** Carte d'un plateau adverse (compacte, lecture seule, en direct). */
function OpponentCard({
  opponent,
  categories,
  rosterMap,
  total,
  compactCols,
  onSabotage,
}: {
  opponent: SerializedPlayer;
  categories: CategoryConfig[];
  rosterMap: RosterMap;
  total: number;
  compactCols?: number;
  onSabotage: (targetUserId: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-void-800/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        {/* Easter egg ultra caché : cliquer le pseudo sabote l'adversaire
            (pires cartes au tour suivant). Aucun indice visuel volontairement. */}
        <span
          onClick={() => onSabotage(opponent.userId)}
          className="truncate text-sm font-semibold text-white/80"
        >
          {opponent.username}
        </span>
        <span
          className={`shrink-0 text-xs font-bold ${
            opponent.lockedThisRound ? "text-domain-light" : "text-white/40"
          }`}
        >
          {opponent.lockedThisRound ? "✓ joué" : "réflexion…"} ·{" "}
          {lockedCount(opponent)}/{total}
        </span>
      </div>
      <PlayerBoard
        player={opponent}
        categories={categories}
        rosterMap={rosterMap}
        compact
        compactCols={compactCols}
      />
    </div>
  );
}

export function MultiplayerBoard({
  lobby,
  categories,
  rosterMap,
  currentUserId,
  onLock,
  onToggleCurated,
  onSabotage,
}: MultiplayerBoardProps) {
  const me = lobby.players.find((p) => p.userId === currentUserId);
  const opponents = lobby.players.filter((p) => p.userId !== currentUserId);
  if (!me) return null;

  const total = lobby.totalRounds;
  const round = Math.min(lobby.roundIndex + 1, total);
  const iLocked = me.lockedThisRound;
  const isTrio = opponents.length === 2;

  // Mon plateau (grand, interactif tant que je n'ai pas verrouillé).
  // `cols` fixe le nombre de colonnes (utile au centre du layout 3 joueurs où
  // le deck a moins de largeur → cartes plus grandes).
  const renderMyDeck = (cols?: number) => (
    <div className="rounded-2xl border border-domain/20 bg-void-800/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        {/* Easter egg : cliquer "Ton deck" bascule le tirage meilleures cartes
            (le libellé se teinte quand c'est actif). */}
        <button
          type="button"
          onClick={onToggleCurated}
          className={`select-none text-sm font-semibold transition-colors ${
            me.curated ? "text-domain-light" : "text-white"
          }`}
        >
          Ton deck <span className="text-white/40">({lockedCount(me)}/{total})</span>
        </button>
        {!iLocked && (
          <span className="text-xs text-white/50">
            👆 Tape une catégorie pour la verrouiller
          </span>
        )}
      </div>
      <PlayerBoard
        player={me}
        categories={categories}
        rosterMap={rosterMap}
        interactive={!iLocked}
        onLock={onLock}
        cols={cols}
      />
    </div>
  );

  return (
    /* Duo : on borne et centre tout le plateau (le plein écran est réservé au
       trio, qui a besoin de la largeur pour les deux ailes adverses). */
    <div className={isTrio ? undefined : "mx-auto max-w-3xl"}>
      {/* En-tête : manche + progression */}
      <header className="mb-4 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-white/70">
          Manche {round} / {total}
        </span>
        {iLocked && (
          <span className="animate-glow-pulse text-xs font-semibold text-domain-light">
            ⏳ En attente des autres joueurs…
          </span>
        )}
      </header>
      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-void-700">
        <motion.div
          className="h-full bg-gradient-to-r from-domain to-cursed"
          animate={{ width: `${(lockedCount(me) / total) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {isTrio ? (
        /* 3 joueurs : moi au centre, un adversaire sur chaque aile.
           Sur mobile (flex-wrap) : les 2 adversaires en haut côte à côte, moi dessous. */
        <div className="flex flex-wrap items-start gap-4 lg:flex-nowrap lg:gap-6">
          <div className="order-1 w-[calc(50%-8px)] lg:order-none lg:w-[20%]">
            <OpponentCard
              opponent={opponents[0]}
              categories={categories}
              rosterMap={rosterMap}
              total={total}
              compactCols={3}
              onSabotage={onSabotage}
            />
          </div>
          <div className="order-3 w-full lg:order-none lg:flex-1">
            {renderMyDeck(5)}
          </div>
          <div className="order-2 w-[calc(50%-8px)] lg:order-none lg:w-[20%]">
            <OpponentCard
              opponent={opponents[1]}
              categories={categories}
              rosterMap={rosterMap}
              total={total}
              compactCols={3}
              onSabotage={onSabotage}
            />
          </div>
        </div>
      ) : (
        /* 2 joueurs : adversaire (compact, plus étroit) en haut, mon deck
           dessous. Le deck adverse est volontairement plus petit que le mien. */
        <>
          <div className="mx-auto mb-6 max-w-md">
            <OpponentCard
              opponent={opponents[0]}
              categories={categories}
              rosterMap={rosterMap}
              total={total}
              onSabotage={onSabotage}
            />
          </div>
          {renderMyDeck()}
        </>
      )}
    </div>
  );
}
