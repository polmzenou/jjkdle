"use client";

import { useMemo } from "react";
import type { Character } from "@/data/roster/characters";
import {
  attributeDisplayFor,
  buildAttributeSchema,
  type AttributeSpec,
} from "@/lib/games/jjkdle/attribute-schema";

interface GuessWhoCharacterInfoProps {
  /** Personnage actuellement survolé (null = rien à afficher). */
  character: Character | null;
  /** Attributs de l'univers courant (définissent les lignes de la fiche). */
  attributeColumns: AttributeSpec[];
}

/**
 * Petite fiche d'aide affichée sous la carte secrète : reprend tous les attributs
 * du personnage survolé (pour JJK : race, genre, grade, affiliation, clan, arc
 * d'apparition, territoire, énergie occulte). Aide les joueurs qui ne connaissent
 * pas tout le roster. Ne s'affiche que si un perso est survolé.
 *
 * Les lignes viennent du schéma d'attributs de l'univers : un autre anime affiche
 * automatiquement SES attributs, sans toucher à ce composant.
 */
export function GuessWhoCharacterInfo({
  character,
  attributeColumns,
}: GuessWhoCharacterInfoProps) {
  const schema = useMemo(
    () => buildAttributeSchema(attributeColumns),
    [attributeColumns],
  );

  if (!character) return null;

  return (
    <div className="rounded-2xl border border-domain/40 bg-void-800/60 p-3">
      <p className="mb-2 truncate font-display text-sm font-bold text-white">
        {character.name}
      </p>
      <dl className="flex flex-col gap-1">
        {schema.columns.map((col) => (
          <div
            key={col.key}
            className="flex items-baseline justify-between gap-2 text-[0.7rem]"
          >
            <dt className="shrink-0 uppercase tracking-wide text-white/40">
              {col.label}
            </dt>
            <dd className="truncate text-right font-semibold text-white/80">
              {attributeDisplayFor(schema, character, col.key)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
