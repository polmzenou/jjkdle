"use client";

import type { Character } from "@/data/roster/characters";
import { CharacterImage } from "@/components/CharacterImage";

/** Mode d'interaction sur la grille. */
export type BoardMode = "idle" | "eliminate" | "guess";

interface GuessWhoBoardProps {
  /** 25 personnages dans l'ordre de grille (partagé entre les deux joueurs). */
  characters: Character[];
  /** IDs grisés localement (privé, non persisté). */
  eliminated: Set<string>;
  mode: BoardMode;
  isMyTurn: boolean;
  /** Mon perso secret (affiché uniquement à moi). */
  mySecret: Character | null;
  pending: boolean;
  onCardClick: (id: string) => void;
  onSetMode: (mode: BoardMode) => void;
  onPass: () => void;
}

export function GuessWhoBoard({
  characters,
  eliminated,
  mode,
  isMyTurn,
  mySecret,
  pending,
  onCardClick,
  onSetMode,
  onPass,
}: GuessWhoBoardProps) {
  const interactive = isMyTurn && mode !== "idle";

  return (
    <div>
      {/* En-tête : indicateur de tour */}
      <div className="mb-4 flex items-center justify-end">
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
            isMyTurn
              ? "bg-domain/20 text-domain-light"
              : "bg-white/5 text-white/40"
          }`}
        >
          {isMyTurn ? "À toi de jouer" : "Au tour de l'adversaire"}
        </span>
      </div>

      {/* Grille 5×5 */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {characters.map((char) => {
          const isEliminated = eliminated.has(char.id);
          const isSecret = mySecret?.id === char.id;
          return (
            <button
              key={char.id}
              type="button"
              disabled={!interactive || pending}
              onClick={() => onCardClick(char.id)}
              className={`group relative aspect-[3/4] overflow-hidden rounded-xl border bg-void-800 transition-all ${
                isSecret ? "border-domain-light" : "border-white/10"
              } ${isEliminated ? "opacity-25" : "opacity-100"} ${
                interactive
                  ? "cursor-pointer hover:border-domain-light hover:ring-2 hover:ring-domain/40"
                  : "cursor-default"
              }`}
            >
              <CharacterImage character={char} />
              <span className="absolute inset-x-0 bottom-0 truncate bg-void-900/80 px-1.5 py-1 text-center text-[0.6rem] font-semibold text-white/90 sm:text-xs">
                {char.name}
              </span>
              {isSecret && (
                <span className="absolute right-1 top-1 rounded-full bg-domain px-1.5 py-0.5 text-[0.55rem] font-bold uppercase text-white">
                  Secret
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          disabled={!isMyTurn || pending}
          onClick={onPass}
          className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-display text-sm font-bold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Passer le tour
        </button>
        <button
          type="button"
          disabled={!isMyTurn || pending}
          onClick={() => onSetMode(mode === "eliminate" ? "idle" : "eliminate")}
          className={`rounded-xl border px-5 py-3 font-display text-sm font-bold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            mode === "eliminate"
              ? "border-domain bg-domain/20 text-domain-light"
              : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
          }`}
        >
          {mode === "eliminate" ? "Éliminer ✓" : "Éliminer"}
        </button>
        <button
          type="button"
          disabled={!isMyTurn || pending}
          onClick={() => onSetMode(mode === "guess" ? "idle" : "guess")}
          className={`rounded-xl border px-5 py-3 font-display text-sm font-bold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            mode === "guess"
              ? "border-cursed bg-cursed/20 text-cursed-light"
              : "border-cursed/40 bg-cursed/10 text-cursed-light hover:bg-cursed/20"
          }`}
        >
          {mode === "guess" ? "Choisis une carte…" : "Deviner"}
        </button>
      </div>

      <p className="mt-3 text-center text-xs text-white/35">
        {mode === "eliminate"
          ? "Clique sur les cartes pour les griser (privé). Reclique pour restaurer."
          : mode === "guess"
            ? "Clique sur le personnage que tu penses être le secret adverse."
            : isMyTurn
              ? "Choisis une action."
              : "Attends ton tour pour agir."}
      </p>
    </div>
  );
}
