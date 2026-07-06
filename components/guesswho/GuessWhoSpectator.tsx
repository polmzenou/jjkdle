"use client";

import type { Character } from "@/data/roster/characters";
import { CharacterImage } from "@/components/CharacterImage";
import { GuessWhoOpponentDeck } from "./GuessWhoOpponentDeck";

export interface SpectatorSide {
  name: string;
  /** Personnage secret de ce joueur (celui que l'adversaire doit deviner). */
  secret: Character | null;
  /** Cartes que ce joueur a grisées, reçues en direct. */
  eliminated: Set<string>;
  isTurn: boolean;
}

interface GuessWhoSpectatorProps {
  /** Les 25 personnages de la grille partagée. */
  characters: Character[];
  player1: SpectatorSide;
  player2: SpectatorSide;
}

/**
 * Vue spectateur : les deux joueurs côte à côte, chacun avec son personnage
 * secret et son deck en direct. Accent violet (domain) à gauche, rouge (cursed)
 * à droite pour les différencier. Lecture seule.
 */
export function GuessWhoSpectator({
  characters,
  player1,
  player2,
}: GuessWhoSpectatorProps) {
  return (
    <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-2">
      <Side characters={characters} side={player1} accent="domain" />
      <Side characters={characters} side={player2} accent="cursed" />
    </div>
  );
}

function Side({
  characters,
  side,
  accent,
}: {
  characters: Character[];
  side: SpectatorSide;
  accent: "domain" | "cursed";
}) {
  const border = accent === "domain" ? "border-domain/40" : "border-cursed/40";
  const label = accent === "domain" ? "text-domain-light" : "text-cursed-light";
  const badge =
    accent === "domain"
      ? "bg-domain/20 text-domain-light"
      : "bg-cursed/20 text-cursed-light";

  return (
    <section
      className={`flex min-h-0 flex-col gap-3 rounded-2xl border ${border} bg-void-800/40 p-3`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2">
        <p className={`truncate font-display text-sm font-bold ${label}`}>
          {side.name}
        </p>
        {side.isTurn && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide ${badge}`}
          >
            À son tour
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div
          className={`aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-xl border ${border} bg-void-900`}
        >
          {side.secret ? (
            <CharacterImage character={side.secret} />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/30">
              …
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-white/40">
            Secret
          </p>
          <p className="truncate font-display text-base font-bold text-white">
            {side.secret?.name ?? "…"}
          </p>
        </div>
      </div>

      <GuessWhoOpponentDeck
        characters={characters}
        eliminated={side.eliminated}
        title="Deck"
      />
    </section>
  );
}
