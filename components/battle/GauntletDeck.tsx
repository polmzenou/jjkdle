"use client";

import { CharacterImage } from "@/components/CharacterImage";
import { UserAvatar } from "@/components/UserAvatar";
import type { RosterMap } from "@/lib/multiplayer/state";
import type { GauntletCardLog } from "@/lib/games/battle/combat";

interface GauntletDeckProps {
  title: string;
  /** Fiches des persos (ordre du deck) avec leurs victimes. */
  log: GauntletCardLog[];
  rosterMap: RosterMap;
  /** Couleur d'accent de la bordure des persos. */
  accent: string;
  /** Avatar du joueur à afficher à côté du titre (optionnel). */
  avatar?: { username: string; image: string | null };
}

/**
 * Récap hardcore : l'équipe en colonne (un perso par ligne) et, à côté de
 * chacun, en petit et en ligne, tous les persos adverses qu'il a battus. Les
 * persos tombés sont grisés.
 */
export function GauntletDeck({ title, log, rosterMap, accent, avatar }: GauntletDeckProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-void-800/40 p-4 text-left">
      <p className="mb-3 flex min-w-0 items-center gap-2 font-display text-sm font-bold text-white">
        {avatar && (
          <UserAvatar username={avatar.username} image={avatar.image} size={26} />
        )}
        <span className="truncate">{title}</span>
      </p>
      <ul className="flex flex-col gap-2">
        {log.map((entry, i) => {
          const character = rosterMap[entry.cardId];
          if (!character) return null;
          return (
            <li key={`${entry.cardId}-${i}`} className="flex items-center gap-3">
              {/* Le perso de l'équipe */}
              <div className="shrink-0">
                <div
                  className="relative aspect-[3/4] w-12 overflow-hidden rounded-lg border bg-void-900 sm:w-14"
                  style={{
                    borderColor: `${accent}88`,
                    opacity: entry.eliminated ? 0.45 : 1,
                  }}
                >
                  <CharacterImage character={character} />
                </div>
                {entry.remainingHp !== undefined && (
                  <p
                    className="mt-1 text-center font-display text-[10px] font-bold tabular-nums text-emerald-400"
                    title="Points de vie restants"
                  >
                    {Math.round(entry.remainingHp)}/{Math.round(entry.maxHp)} PV
                  </p>
                )}
              </div>

              {/* Les persos qu'il a battus, en ligne */}
              {entry.defeatedIds.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="mr-1 text-xs text-white/40">a battu</span>
                  {entry.defeatedIds.map((id, j) => {
                    const victim = rosterMap[id];
                    if (!victim) return null;
                    return (
                      <div
                        key={`${id}-${j}`}
                        title={victim.name}
                        className="relative aspect-[3/4] w-7 shrink-0 overflow-hidden rounded border border-cursed/50 bg-void-900 sm:w-8"
                      >
                        <CharacterImage character={victim} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span className="text-xs text-white/30">
                  {entry.eliminated ? "vaincu" : "—"}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
