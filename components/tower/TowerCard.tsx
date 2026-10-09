"use client";

import { CharacterImage } from "@/components/CharacterImage";
import type { TowerCardView } from "@/lib/games/tower/view";
import { CharacterTip } from "./InfoTip";
import { TowerIcon, techniqueIcon } from "./TowerIcon";

/**
 * Fiche de personnage de la Tour — starters, recrues, escouade.
 *
 * Le portrait passe par `CharacterImage`, qui retombe déjà sur les initiales
 * quand aucune image n'existe : c'est l'emplacement prévu pour les
 * illustrations à venir, sans qu'aucune logique n'ait à changer le jour où
 * elles arrivent.
 *
 * La carte reste volontairement sobre — nom, passif, technique, usure — et
 * renvoie le détail chiffré (PV, frappe, cadence, énergie, ultime) dans la
 * bulle de survol : ces chiffres décident du combat, mais les afficher tous
 * rendrait une grille de trois cartes illisible.
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
    // `group relative` sans `overflow-hidden` : la bulle doit pouvoir déborder
    // de la carte, le rognage est sur le bouton intérieur.
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        disabled={!interactive}
        aria-pressed={onClick ? selected : undefined}
        className={[
          "flex h-full w-full flex-col overflow-hidden rounded-xl border text-left transition",
          selected
            ? "border-domain bg-domain/10 shadow-glow"
            : "border-white/10 bg-void-800/60",
          interactive
            ? "hover:-translate-y-0.5 hover:border-domain/60 hover:bg-void-700/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-domain active:translate-y-0"
            : "cursor-default",
          disabled ? "opacity-40" : "",
        ].join(" ")}
      >
        <div className="relative aspect-[4/5] w-full">
          <CharacterImage character={{ name: card.name, image: card.image }} />
          {/* Dégradé de pied : le nom posé sur le portrait reste lisible. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-void-900 to-transparent"
          />
          <p className="absolute inset-x-2 bottom-1.5 font-display text-sm font-bold leading-tight text-white drop-shadow">
            {card.name}
          </p>
          {card.hasDomain && (
            <span
              title={card.ultimateName ?? undefined}
              className="absolute right-1.5 top-1.5 rounded bg-cursed/90 px-1.5 py-0.5 font-display text-[10px] font-bold tracking-wider text-white"
            >
              {card.ultimateBadge}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-2.5 sm:p-3">
          {/* Technique : l'action que ce personnage donnera en combat. */}
          {card.technique ? (
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-domain/20 text-domain-light">
                <TowerIcon name={techniqueIcon(card.archetype)} className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-[11px] font-bold uppercase tracking-wide text-domain-light">
                  {card.technique.name}
                </p>
                <p className="flex items-center gap-0.5 text-[10px] tabular-nums text-white/45">
                  <TowerIcon name="energy" className="h-2.5 w-2.5" />
                  {card.technique.cost}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cursed/20 text-cursed-light">
                <TowerIcon name="ultimate" className="h-4 w-4" />
              </span>
              <p className="min-w-0 truncate font-display text-[11px] font-bold uppercase tracking-wide text-cursed-light">
                {card.ultimateName ?? "Ultime"} seul
              </p>
            </div>
          )}

          <p className="hidden text-[11px] leading-snug text-white/50 sm:block">
            <span className="font-semibold text-white/70">{card.passive.name}</span>
            {" · "}
            {card.passive.description}
          </p>

          {hp && (
            <div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/50">
                <div
                  className={
                    ratio > 0.35 ? "h-full bg-emerald-400" : "h-full bg-cursed"
                  }
                  style={{ width: `${ratio * 100}%` }}
                />
              </div>
              <p className="mt-1 flex items-center gap-1 text-[11px] tabular-nums text-white/45">
                <TowerIcon name="heart" className="h-3 w-3" />
                {Math.round(hp.current)} / {hp.max}
              </p>
            </div>
          )}

          {footer}
        </div>
      </button>

      <CharacterTip card={card} hp={hp} />
    </div>
  );
}
