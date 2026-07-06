"use client";

import type { Character } from "@/data/roster/characters";
import { CharacterImage } from "@/components/CharacterImage";

interface GuessWhoSecretPanelProps {
  /** Mon perso secret (celui que l'adversaire doit deviner). */
  secret: Character | null;
  /** Masque le secret (pour montrer son écran sans le révéler). */
  hidden: boolean;
  onToggleHidden: () => void;
}

/**
 * Colonne de gauche : la carte mystère du joueur (comme dans le vrai Guess Who),
 * avec un bouton pour la cacher si on veut montrer son écran à quelqu'un.
 */
export function GuessWhoSecretPanel({
  secret,
  hidden,
  onToggleHidden,
}: GuessWhoSecretPanelProps) {
  return (
    <aside className="flex flex-col self-start rounded-2xl border border-domain/40 bg-void-800/60 p-3 text-center">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-domain-light">
          Ton secret
        </p>
        <button
          type="button"
          onClick={onToggleHidden}
          aria-pressed={hidden}
          title={hidden ? "Afficher ton secret" : "Cacher ton secret"}
          className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-white/70 transition-colors hover:bg-white/10"
        >
          {hidden ? "👁 Afficher" : "🙈 Cacher"}
        </button>
      </div>

      <div className="relative mx-auto aspect-[3/4] w-full max-w-[8.5rem] overflow-hidden rounded-xl border border-domain-light bg-void-900 shadow-glow">
        {secret ? (
          <>
            <div className={`h-full w-full ${hidden ? "blur-xl" : ""}`}>
              <CharacterImage character={secret} />
            </div>
            {hidden && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-void-900/70 text-center">
                <span className="text-3xl">🙈</span>
                <span className="px-2 text-xs font-semibold uppercase tracking-wide text-white/70">
                  Secret caché
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/30">
            …
          </div>
        )}
      </div>

      <p className="mt-2 shrink-0 truncate font-display text-lg font-bold text-white">
        {secret ? (hidden ? "•••" : secret.name) : "…"}
      </p>
      <p className="mt-1 shrink-0 text-[0.7rem] text-white/40">
        Le personnage que ton adversaire doit deviner.
      </p>
    </aside>
  );
}
