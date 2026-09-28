"use client";

import { useState } from "react";
import { badgesForUniverse, type BadgeTier } from "@/lib/badges/definitions";
import { BadgeMedal } from "@/components/badges/BadgeMedal";

interface BadgeShelfProps {
  /** Clés des badges débloqués par l'utilisateur (possession GLOBALE). */
  unlockedKeys: string[];
  /** Slug de l'univers courant : la vitrine n'affiche que ses badges. */
  universeSlug: string;
}

const TIER_LABEL: Record<BadgeTier, string> = {
  bronze: "Bronze",
  silver: "Argent",
  gold: "Or",
};

/**
 * Vitrine des badges : une rangée de médailles sélectionnables, et le détail de
 * la médaille choisie en dessous (statut, palier, comment l'obtenir). Itère sur
 * le catalogue code RESTREINT à l'univers courant — la possession reste
 * globale, seul l'affichage est filtré.
 *
 * Les débloqués passent devant : c'est ce que le joueur vient montrer.
 */
export function BadgeShelf({ unlockedKeys, universeSlug }: BadgeShelfProps) {
  const unlocked = new Set(unlockedKeys);
  const badges = badgesForUniverse(universeSlug)
    .map((b, i) => ({ b, i, has: unlocked.has(b.key) }))
    .sort((x, y) => Number(y.has) - Number(x.has) || x.i - y.i);
  const owned = badges.filter((x) => x.has).length;

  const [selectedKey, setSelectedKey] = useState(badges[0]?.b.key ?? null);
  const selected = badges.find((x) => x.b.key === selectedKey) ?? badges[0];

  if (!selected) return null;
  const { b, has } = selected;

  return (
    <div className="overflow-hidden rounded-2xl border border-domain/25 bg-gradient-to-br from-void-800/80 to-void-900/80 p-4 backdrop-blur sm:p-5">
      <div className="flex items-center gap-4">
        <p className="shrink-0 text-[11px] font-black uppercase tracking-[0.25em] text-domain-light">
          Badges <span className="text-white">{owned}/{badges.length}</span>
        </p>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-domain"
            style={{ width: `${badges.length ? (owned / badges.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Rangée de médailles */}
      <div
        role="tablist"
        aria-label="Badges"
        className="-mx-1 mt-3 flex gap-1 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]"
      >
        {badges.map(({ b: item, has: itemHas }) => {
          const active = item.key === b.key;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedKey(item.key)}
              className={`flex w-[84px] shrink-0 flex-col items-center gap-1 rounded-xl border px-1.5 py-2 transition-colors ${
                active
                  ? "border-domain/60 bg-domain/15"
                  : "border-transparent hover:bg-white/5"
              }`}
            >
              <BadgeMedal
                glyph={item.glyph}
                tier={item.tier}
                color={item.color}
                locked={!itemHas}
                size={40}
                className={itemHas ? "drop-shadow-[0_0_10px_rgb(var(--color-domain)/0.35)]" : ""}
              />
              <span
                className={`line-clamp-2 text-center text-[9px] font-bold uppercase leading-tight tracking-wider ${
                  itemHas ? "text-white/80" : "text-white/35"
                }`}
              >
                {item.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Détail de la médaille sélectionnée */}
      <div
        role="tabpanel"
        className="mt-2 flex items-start gap-4 rounded-xl border border-white/10 bg-void-900/70 p-4"
      >
        <BadgeMedal
          glyph={b.glyph}
          tier={b.tier}
          color={b.color}
          locked={!has}
          size={52}
          className="shrink-0"
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className="font-display text-base font-black uppercase tracking-wide"
              style={{ color: has ? b.color : "rgb(255 255 255 / 0.75)" }}
            >
              {b.name}
            </p>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                has
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                  : "border-white/15 text-white/45"
              }`}
            >
              {has ? "Débloqué" : "Verrouillé"}
            </span>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/45">
              {TIER_LABEL[b.tier]}
            </span>
          </div>
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.25em] text-domain-light">
            Comment l&apos;obtenir
          </p>
          <p className="mt-1 text-sm leading-snug text-white/65">{b.description}</p>
        </div>
      </div>
    </div>
  );
}
