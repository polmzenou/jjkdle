"use client";

import { FLOORS_PER_STRATE, TOWER_FLOORS } from "@/lib/games/tower/types";

/**
 * La tour en coupe verticale : 20 paliers empilés, on monte du bas vers le haut.
 *
 * Chaque palier est une BANDE INDÉPENDANTE, et c'est délibéré : le jour où des
 * illustrations d'étage arriveront, elles remplaceront le fond d'une bande sans
 * qu'aucune logique n'ait à bouger. Même raisonnement que `CharacterImage` pour
 * les portraits.
 */

const STRATE_NAMES = [
  "Les premiers fléaux",
  "Le tournoi",
  "Shibuya",
  "Le dénouement",
];

export function TowerMap({ floor }: { floor: number }) {
  // De haut en bas à l'écran, donc du sommet vers le rez-de-chaussée.
  const floors = Array.from({ length: TOWER_FLOORS }, (_, i) => TOWER_FLOORS - i);

  return (
    <aside className="w-full shrink-0 sm:w-44" aria-label="Progression dans la tour">
      <p className="mb-2 font-display text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
        La tour
      </p>

      <div className="flex flex-col gap-[3px]">
        {floors.map((n) => {
          const strate = Math.floor((n - 1) / FLOORS_PER_STRATE);
          const isBoss = n % FLOORS_PER_STRATE === 0;
          const reached = n < floor;
          const current = n === floor;
          const startsStrate = n % FLOORS_PER_STRATE === 0;

          return (
            <div key={n}>
              {startsStrate && (
                <p className="mb-[3px] mt-2 font-display text-[9px] uppercase tracking-[0.16em] text-white/25">
                  {STRATE_NAMES[strate]}
                </p>
              )}
              <div
                aria-current={current ? "step" : undefined}
                className={[
                  "flex h-5 items-center gap-2 rounded-sm border px-2 transition",
                  current
                    ? "border-domain bg-domain/25 shadow-glow"
                    : reached
                      ? "border-transparent bg-domain/40"
                      : "border-white/5 bg-void-800/60",
                ].join(" ")}
              >
                <span
                  className={[
                    "font-display text-[10px] font-bold tabular-nums",
                    current ? "text-white" : reached ? "text-white/70" : "text-white/30",
                  ].join(" ")}
                >
                  {n}
                </span>
                {isBoss && (
                  <span className="font-display text-[9px] font-bold uppercase tracking-wider text-cursed">
                    Boss
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
