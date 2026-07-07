"use client";

import type { Character } from "@/data/roster/characters";
import {
  ATTRIBUTE_COLUMNS,
  ATTRIBUTE_LABELS,
  attributeDisplay,
} from "@/lib/games/jjkdle/attributes";

interface GuessWhoCharacterInfoProps {
  /** Personnage actuellement survolé (null = rien à afficher). */
  character: Character | null;
}

/**
 * Petite fiche d'aide affichée sous la carte secrète : reprend toutes les
 * données JJKdle du personnage survolé (race, genre, grade, affiliation, clan,
 * arc d'apparition, extension du territoire, énergie occulte). Aide les joueurs
 * qui ne connaissent pas tout le roster. Ne s'affiche que si un perso est survolé.
 */
export function GuessWhoCharacterInfo({ character }: GuessWhoCharacterInfoProps) {
  if (!character) return null;

  return (
    <div className="rounded-2xl border border-domain/40 bg-void-800/60 p-3">
      <p className="mb-2 truncate font-display text-sm font-bold text-white">
        {character.name}
      </p>
      <dl className="flex flex-col gap-1">
        {ATTRIBUTE_COLUMNS.map((key) => (
          <div
            key={key}
            className="flex items-baseline justify-between gap-2 text-[0.7rem]"
          >
            <dt className="shrink-0 uppercase tracking-wide text-white/40">
              {ATTRIBUTE_LABELS[key]}
            </dt>
            <dd className="truncate text-right font-semibold text-white/80">
              {attributeDisplay(key, character)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
