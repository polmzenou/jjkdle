"use client";

import { useState } from "react";
import { SQUAD_SIZE } from "@/lib/games/tower/types";
import type { TowerView } from "@/lib/games/tower/view";
import { TowerCard } from "./TowerCard";

/**
 * Écran de recrutement — et de SACRIFICE.
 *
 * C'est le deuxième moment de décision du jeu, après le timing des
 * interventions. Tant qu'un slot est libre, recruter est gratuit ; une fois
 * l'escouade pleine, il faut désigner qui céder — et le cédé est perdu
 * définitivement, exactement comme s'il était mort. L'écran le dit sans
 * détour : c'est ce qui fait le poids du choix.
 */
export function RecruitPicker({
  view,
  busy,
  onRecruit,
  onSkip,
}: {
  view: TowerView;
  busy: boolean;
  onRecruit: (characterId: string, sacrificeSlot?: number) => void;
  onSkip: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const full = view.squad.length >= SQUAD_SIZE;

  if (view.choices.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <p className="text-white/60">Personne à recruter à cet étage.</p>
        <button
          type="button"
          onClick={onSkip}
          disabled={busy}
          className="rounded-lg border border-domain/60 bg-domain/15 px-5 py-2 font-display font-bold text-domain-light disabled:opacity-40"
        >
          Continuer
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h2 className="font-display text-xl font-bold text-white">
          {picked && full ? "Qui laisses-tu partir ?" : "Un renfort se présente"}
        </h2>
        <p className="mt-1 text-sm text-white/50">
          {picked && full
            ? "Le personnage que tu cèdes est perdu pour le reste de l'ascension. Le nouveau venu arrive à pleine forme."
            : full
              ? "Ton escouade est complète : recruter demande d'en sacrifier un."
              : `Tu as ${SQUAD_SIZE - view.squad.length} slot(s) libre(s).`}
        </p>
      </header>

      {picked && full ? (
        <div className="grid grid-cols-3 gap-3">
          {view.squad.map((member, slot) => (
            <TowerCard
              key={member.id}
              card={member}
              hp={{ current: member.hp, max: member.maxHp }}
              onClick={() => onRecruit(picked, slot)}
              disabled={busy}
              footer={
                <span className="mt-1 block text-center font-display text-[11px] font-bold uppercase tracking-wide text-cursed">
                  Sacrifier
                </span>
              }
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {view.choices.map((card) => (
            <TowerCard
              key={card.id}
              card={card}
              selected={picked === card.id}
              disabled={busy}
              onClick={() => (full ? setPicked(card.id) : onRecruit(card.id))}
            />
          ))}
        </div>
      )}

      <div className="flex justify-center gap-3">
        {picked && full && (
          <button
            type="button"
            onClick={() => setPicked(null)}
            disabled={busy}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/60 disabled:opacity-40"
          >
            Revenir
          </button>
        )}
        <button
          type="button"
          onClick={onSkip}
          disabled={busy}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/60 disabled:opacity-40"
        >
          Passer sans recruter
        </button>
      </div>
    </div>
  );
}
