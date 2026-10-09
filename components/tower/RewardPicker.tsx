"use client";

import { STRATE_CLEAR_HEAL_PCT } from "@/lib/games/tower/run";
import type { TowerView } from "@/lib/games/tower/view";
import { ItemCard } from "./ItemCard";
import { TowerIcon } from "./TowerIcon";

/**
 * Choix de récompense après un étage gagné.
 *
 * Trois natures différentes — un objet, des fragments, un soin — et non trois
 * objets : la question intéressante n'est pas « lequel de ces trois » mais « de
 * quoi ai-je le plus besoin maintenant ». Les PV ne se régénérant jamais tout
 * seuls, le soin est un vrai concurrent d'un objet rare.
 */
export function RewardPicker({
  view,
  busy,
  onPick,
}: {
  view: TowerView;
  busy: boolean;
  onPick: (index: number) => void;
}) {
  const hurt = view.squad.some((m) => m.hp < m.maxHp);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
          <TowerIcon name="gift" className="h-3.5 w-3.5" />
          Récompense
        </p>
        <h2 className="mt-1 font-display text-xl font-bold text-white">
          {view.kind === "boss" ? "Le boss est tombé" : "Étage franchi"}
        </h2>
        <p className="mt-1 text-sm text-white/50">
          Prends une seule de ces trois choses avant de continuer.
        </p>

        {/* Le souffle de palier est déjà appliqué à ce stade. Il faut le DIRE :
            un soin silencieux ne compte pas pour le joueur, qui verrait ses
            barres remonter sans savoir pourquoi ni s'il peut y compter. */}
        {view.kind === "boss" ? (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-200">
            <TowerIcon name="heal" className="h-3.5 w-3.5" />
            Palier franchi — l&apos;escouade récupère {STRATE_CLEAR_HEAL_PCT} % de
            ses PV.
          </p>
        ) : null}
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {view.rewards.map((reward, index) => {
          if (reward.kind === "item") {
            return (
              <ItemCard
                key={`item-${reward.item.id}`}
                item={reward.item}
                disabled={busy}
                onClick={() => onPick(index)}
              />
            );
          }

          const isHeal = reward.kind === "heal";
          return (
            <button
              key={`${reward.kind}-${index}`}
              type="button"
              onClick={() => onPick(index)}
              disabled={busy}
              className={[
                "flex flex-col items-center justify-center gap-2 rounded-xl border p-6 text-center transition hover:-translate-y-0.5 active:translate-y-0",
                isHeal
                  ? "border-emerald-400/40 bg-emerald-400/10 hover:bg-emerald-400/20"
                  : "border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20",
                busy ? "opacity-40" : "",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-14 w-14 items-center justify-center rounded-2xl",
                  isHeal
                    ? "bg-emerald-400/20 text-emerald-300"
                    : "bg-amber-400/20 text-amber-300",
                ].join(" ")}
              >
                <TowerIcon name={isHeal ? "heal" : "fragments"} className="h-8 w-8" />
              </span>
              <span className="font-display text-sm font-bold text-white">
                {isHeal
                  ? `Soigner ${reward.pct} %`
                  : `${reward.amount} fragments`}
              </span>
              <span className="text-[11px] leading-snug text-white/50">
                {isHeal
                  ? hurt
                    ? "Toute l'escouade. Les PV ne remontent pas seuls."
                    : "Ton escouade est déjà au complet."
                  : "À dépenser chez le marchand."}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
