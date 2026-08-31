"use client";

import type { TowerView } from "@/lib/games/tower/view";
import { ItemCard } from "./ItemCard";

/**
 * L'étal du marchand, posé juste avant chaque boss.
 *
 * Les fragments meurent avec la run : les garder ne sert strictement à rien, et
 * l'écran le dit. C'est ce qui rend le nœud intéressant — la question n'est pas
 * « puis-je me le permettre » mais « est-ce que je préfère un objet ou de la
 * vie avant le boss ».
 */
export function MerchantScreen({
  view,
  busy,
  onBuyItem,
  onBuyHeal,
  onLeave,
}: {
  view: TowerView;
  busy: boolean;
  onBuyItem: (itemId: string) => void;
  onBuyHeal: () => void;
  onLeave: () => void;
}) {
  const hurt = view.squad.some((m) => m.hp < m.maxHp);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-bold text-white">
            Un marchand, avant le boss
          </h2>
          <p className="mt-1 text-sm text-white/50">
            Tes fragments disparaîtront à la fin de l&apos;ascension. Autant les
            dépenser ici.
          </p>
        </div>
        <p className="font-display text-lg font-bold tabular-nums text-amber-300">
          ◈ {view.fragments}
        </p>
      </header>

      {view.shop.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {view.shop.map((offer) => (
            <ItemCard
              key={offer.item.id}
              item={offer.item}
              disabled={busy || !offer.affordable}
              onClick={() => onBuyItem(offer.item.id)}
              footer={
                <span
                  className={[
                    "mt-1 block text-center font-display text-sm font-bold tabular-nums",
                    offer.affordable ? "text-amber-300" : "text-white/30",
                  ].join(" ")}
                >
                  ◈ {offer.price}
                </span>
              }
            />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-white/10 bg-void-800/50 p-4 text-sm text-white/50">
          L&apos;étal est vide — tu as déjà ramassé tout ce qu&apos;il avait.
        </p>
      )}

      <button
        type="button"
        onClick={onBuyHeal}
        disabled={busy || !view.healOffer.affordable || !hurt}
        className={[
          "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition",
          view.healOffer.affordable && hurt
            ? "border-emerald-400/40 bg-emerald-400/10 hover:bg-emerald-400/20"
            : "border-white/10 bg-void-800/50 opacity-50",
        ].join(" ")}
      >
        <span>
          <span className="block font-display text-sm font-bold text-white">
            Soins de fortune · {view.healOffer.pct} %
          </span>
          <span className="text-[11px] text-white/50">
            {hurt
              ? "Toute l'escouade. Achetable autant de fois que tu peux payer."
              : "Ton escouade est déjà au complet."}
          </span>
        </span>
        <span className="font-display text-sm font-bold tabular-nums text-amber-300">
          ◈ {view.healOffer.price}
        </span>
      </button>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onLeave}
          disabled={busy}
          className="rounded-lg bg-domain px-5 py-2.5 font-display font-bold text-white disabled:opacity-40"
        >
          Reprendre l&apos;ascension
        </button>
      </div>
    </div>
  );
}
