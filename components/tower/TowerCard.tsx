"use client";

import { CharacterImage } from "@/components/CharacterImage";
import type { TowerCardView } from "@/lib/games/tower/view";

/**
 * Fiche de personnage de la Tour — starters, recrues, escouade.
 *
 * Le portrait passe par `CharacterImage`, qui retombe déjà sur les initiales
 * quand aucune image n'existe : c'est l'emplacement prévu pour les
 * illustrations à venir, sans qu'aucune logique n'ait à changer le jour où
 * elles arrivent.
 */
export function TowerCard({
  card,
  selected = false,
  disabled = false,
  hp,
  footer,
  onClick,
}: {
  card: TowerCardView;
  selected?: boolean;
  disabled?: boolean;
  /** Usure actuelle, pour un membre d'escouade. */
  hp?: { current: number; max: number };
  footer?: React.ReactNode;
  onClick?: () => void;
}) {
  const interactive = Boolean(onClick) && !disabled;
  const ratio = hp ? Math.max(0, Math.min(1, hp.current / hp.max)) : 1;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      aria-pressed={onClick ? selected : undefined}
      className={[
        "group flex w-full flex-col overflow-hidden rounded-xl border text-left transition",
        selected
          ? "border-domain bg-domain/10 shadow-glow"
          : "border-white/10 bg-void-800/60",
        interactive
          ? "hover:border-domain/60 hover:bg-void-700/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-domain"
          : "cursor-default",
        disabled ? "opacity-40" : "",
      ].join(" ")}
    >
      <div className="relative aspect-[4/5] w-full">
        <CharacterImage character={{ name: card.name, image: card.image }} />
        {card.hasDomain && (
          <span className="absolute right-1.5 top-1.5 rounded bg-cursed/90 px-1.5 py-0.5 font-display text-[10px] font-bold tracking-wider text-white">
            領域
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div>
          <p className="font-display text-sm font-bold leading-tight text-white">
            {card.name}
          </p>
          <p className="text-[11px] leading-tight text-white/50">
            {card.passive.name} · {card.passive.description}
          </p>
        </div>

        {hp && (
          <div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/50">
              <div
                className={ratio > 0.35 ? "h-full bg-emerald-400" : "h-full bg-cursed"}
                style={{ width: `${ratio * 100}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] tabular-nums text-white/45">
              {Math.round(hp.current)} / {hp.max} PV
            </p>
          </div>
        )}

        {card.technique ? (
          <p className="text-[11px] leading-tight text-domain-light">
            <span className="font-semibold">{card.technique.name}</span>
            <span className="text-white/40"> · {card.technique.cost} énergie</span>
          </p>
        ) : (
          <p className="text-[11px] leading-tight text-cursed">
            Extension de Territoire uniquement
          </p>
        )}

        {footer}
      </div>
    </button>
  );
}
