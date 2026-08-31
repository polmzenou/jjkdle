"use client";

import type { TowerView } from "@/lib/games/tower/view";
import { ItemCard } from "./ItemCard";

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
        <h2 className="font-display text-xl font-bold text-white">
          {view.kind === "boss" ? "Le boss est tombé" : "Étage franchi"}
        </h2>
        <p className="mt-1 text-sm text-white/50">
          Prends une seule de ces trois choses avant de continuer.
        </p>
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
                "flex flex-col items-center justify-center gap-2 rounded-xl border p-6 text-center transition",
                isHeal
                  ? "border-emerald-400/40 bg-emerald-400/10 hover:bg-emerald-400/20"
                  : "border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20",
                busy ? "opacity-40" : "",
              ].join(" ")}
            >
              <span aria-hidden className="text-3xl">
                {isHeal ? "✚" : "◈"}
              </span>
              <span className="font-display text-sm font-bold text-white">
                {isHeal
                  ? `Soigner ${reward.pct} %`
                  : `${reward.amount} fragments`}
              </span>
              <span className="text-[11px] leading-snug text-white/50">
                {isHeal
                  ? hurt
                    ? "Toute l'escouade. Rien d'autre ne rend de PV."
                    : "Ton escouade est déjà au complet."
                  : "À dépenser chez le marchand, avant le boss."}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
