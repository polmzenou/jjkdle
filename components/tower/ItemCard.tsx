"use client";

import { CharacterImage } from "@/components/CharacterImage";
import type { ItemView } from "@/lib/games/tower/view";
import { ItemTip } from "./InfoTip";

/**
 * Fiche d'un objet maudit.
 *
 * Le visuel passe par `CharacterImage`, qui retombe déjà sur les initiales
 * quand aucune image n'existe : les 24 objets sont seedés sans illustration et
 * s'affichent correctement en attendant qu'on les téléverse depuis l'admin.
 * C'est la même mécanique que pour un personnage sans portrait.
 */
export function ItemCard({
  item,
  onClick,
  disabled = false,
  footer,
  compact = false,
}: {
  item: ItemView;
  onClick?: () => void;
  disabled?: boolean;
  footer?: React.ReactNode;
  compact?: boolean;
}) {
  const interactive = Boolean(onClick) && !disabled;

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        disabled={!interactive}
        style={{ borderColor: `${item.color}66` }}
        className={[
          "flex w-full flex-col overflow-hidden rounded-xl border bg-void-800/60 text-left transition",
          interactive
            ? "hover:bg-void-700/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-domain"
            : "cursor-default",
          disabled ? "opacity-40" : "",
        ].join(" ")}
      >
        {!compact && (
          <div className="relative aspect-square w-full">
            <CharacterImage character={{ name: item.name, image: item.image }} />
            <span
              className="absolute right-1.5 top-1.5 rounded px-1.5 py-0.5 font-display text-[9px] font-bold uppercase tracking-wider text-black"
              style={{ background: item.color }}
            >
              {item.rarityLabel}
            </span>
          </div>
        )}

        <div className="flex flex-1 flex-col gap-1 p-3">
          <p
            className="font-display text-sm font-bold leading-tight"
            style={{ color: item.color }}
          >
            {item.name}
          </p>
          <p className="text-[11px] leading-tight text-white/70">{item.effect}</p>
          {!compact && (
            <p className="mt-0.5 text-[11px] italic leading-snug text-white/40">
              {item.description}
            </p>
          )}
          {footer}
        </div>
      </button>

      <ItemTip item={item} />
    </div>
  );
}

/**
 * Bandeau d'inventaire : ce que la run a ramassé, visible à tout moment.
 *
 * Réduit à des pastilles pour ne pas voler l'écran au combat — le détail des
 * effets vit dans la bulle de survol, pas dans le bandeau.
 */
export function InventoryStrip({ items }: { items: ItemView[] }) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
        Objets
      </span>
      {items.map((item) => (
        <div key={item.id} className="group relative">
          <span
            tabIndex={0}
            style={{ borderColor: `${item.color}88`, color: item.color }}
            className="block cursor-help rounded border px-1.5 py-0.5 font-display text-[10px] font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-domain"
          >
            {item.name}
          </span>
          <ItemTip item={item} />
        </div>
      ))}
    </div>
  );
}
