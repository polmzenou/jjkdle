import Link from "next/link";
import type { Game } from "@/lib/games/types";

/** Vignette d'un jeu sur le hub. Carte cliquable sauf si "coming-soon". */
export function GameCard({ game }: { game: Game }) {
  const isComingSoon = game.status === "coming-soon";

  const inner = (
    <div
      className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-void-800/60 p-6 backdrop-blur transition-all data-[soon=false]:hover:-translate-y-1 data-[soon=false]:hover:border-domain/50 data-[soon=false]:hover:shadow-glow"
      data-soon={isComingSoon}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-domain/15 text-4xl">
        {game.glyph ?? "🎮"}
      </div>
      <h2 className="font-display text-xl font-bold text-white">{game.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-white/55">
        {game.description}
      </p>

      {game.tags && (
        <div className="mt-4 flex flex-wrap gap-2">
          {game.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/50"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {isComingSoon && (
        <span className="absolute right-4 top-4 rounded-full bg-cursed/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cursed-light">
          Bientôt
        </span>
      )}
    </div>
  );

  if (isComingSoon) {
    return <div className="cursor-not-allowed opacity-60">{inner}</div>;
  }

  return (
    <Link href={game.route} className="block h-full">
      {inner}
    </Link>
  );
}
