import Link from "next/link";
import type { TowerScope } from "@/lib/games/tower/ranking";

/**
 * Bascule « Tour du jour » / « Panthéon » — propre à la Tour.
 *
 * Elle ne réutilise pas `ScopeToggle` (All-time / Hebdo) parce que la Tour ne
 * se classe pas comme les autres jeux : son critère est le nombre d'essais,
 * qui n'a de sens qu'entre joueurs ayant affronté LA MÊME tour. Une portée
 * « hebdomadaire » y mélangerait sept tours différentes et ne voudrait rien
 * dire.
 *
 * Liens relatifs (`?scope=…#leaderboard`) : le serveur re-rend le classement
 * avec la nouvelle portée, aucun état client.
 */
export function TowerScopeToggle({ scope }: { scope: TowerScope }) {
  const options: [TowerScope, string][] = [
    ["today", "Tour du jour"],
    ["all-time", "Panthéon"],
  ];

  return (
    <div className="flex gap-1 rounded-full border border-white/10 bg-void-900/60 p-0.5">
      {options.map(([value, label]) => {
        const active = value === scope;
        return (
          <Link
            key={value}
            href={`?scope=${value}#leaderboard`}
            scroll={false}
            aria-current={active ? "true" : undefined}
            className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide transition-colors ${
              active
                ? "bg-amber-300/20 text-amber-200"
                : "text-white/45 hover:text-white"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
