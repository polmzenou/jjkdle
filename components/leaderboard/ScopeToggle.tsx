import Link from "next/link";
import type { LeaderboardScope } from "@/lib/leaderboard/store";

/**
 * Bascule All-time / Hebdo. Liens relatifs (`?scope=…#leaderboard`) : le serveur
 * re-rend le leaderboard avec la nouvelle portée. Composant serveur (la portée
 * active vient de la prop, aucun état client requis).
 */
export function ScopeToggle({ scope }: { scope: LeaderboardScope }) {
  const options: [LeaderboardScope, string][] = [
    ["all-time", "All-time"],
    ["weekly", "Hebdo"],
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
              active ? "bg-amber-300/20 text-amber-200" : "text-white/45 hover:text-white"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
