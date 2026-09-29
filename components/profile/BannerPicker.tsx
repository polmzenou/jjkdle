"use client";

import { useMemo, useState } from "react";
import { CharacterImage } from "@/components/CharacterImage";
import { CheckIcon, LockIcon } from "@/components/icons/UiIcons";
import {
  BANNER_PALETTE,
  bannerKeysForUniverse,
  isBannerUnlocked,
} from "@/lib/profile/banners";

/** Forme minimale d'un personnage pour le sélecteur d'avatar. */
export interface AvatarChoice {
  id: string;
  name: string;
  image?: string;
}

/**
 * Grille des BANNIÈRES de l'univers courant (+ la neutre), verrouillées par
 * niveau (bypass admin). Composant contrôlé : la persistance et l'aperçu sont
 * gérés par la modale d'édition du profil.
 */
export function BannerPicker({
  value,
  onSelect,
  level,
  isAdmin,
  universeSlug,
  disabled,
}: {
  value: string;
  onSelect: (key: string) => void;
  level: number;
  isAdmin: boolean;
  universeSlug: string;
  disabled?: boolean;
}) {
  const keys = useMemo(() => bannerKeysForUniverse(universeSlug), [universeSlug]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {keys.map((key) => {
        const banner = BANNER_PALETTE[key];
        const selected = key === value;
        const unlocked = isBannerUnlocked(key, level, isAdmin);
        return (
          <button
            key={key}
            type="button"
            disabled={disabled || !unlocked}
            onClick={() => unlocked && onSelect(key)}
            title={unlocked ? banner.label : `${banner.label} — Niveau ${banner.requiredLevel} requis`}
            aria-pressed={selected}
            className={`group flex flex-col gap-1.5 rounded-xl border p-1.5 text-left transition-colors ${
              selected
                ? "border-domain bg-domain/10 shadow-glow"
                : unlocked
                  ? "border-white/10 bg-void-900/40 hover:border-white/30 disabled:opacity-60"
                  : "cursor-not-allowed border-white/5 bg-void-900/30 opacity-60"
            }`}
          >
            <span
              className="relative block h-16 w-full overflow-hidden rounded-lg"
              style={{ background: banner.gradient }}
            >
              {!unlocked && (
                <span className="absolute inset-0 flex flex-col items-center justify-center bg-void-900/60 text-[10px] font-bold leading-none text-white/90">
                  <LockIcon className="h-4 w-4" />
                  <span className="mt-1">Niv. {banner.requiredLevel}</span>
                </span>
              )}
            </span>
            <span className="flex items-center justify-between gap-2 px-1 pb-0.5">
              <span className="truncate text-xs font-bold text-white/85">{banner.label}</span>
              {selected && (
                <CheckIcon className="h-3.5 w-3.5 shrink-0 text-domain-light" />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Grille des AVATARS (personnages du roster de l'univers), avec recherche et
 * « Retirer ». Composant contrôlé, comme `BannerPicker`.
 */
export function AvatarPicker({
  roster,
  value,
  onSelect,
  disabled,
}: {
  roster: AvatarChoice[];
  value: string | null;
  onSelect: (id: string | null) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(
      (c) => c.name.toLowerCase().includes(q) || c.id.includes(q),
    );
  }, [roster, query]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un perso…"
          aria-label="Rechercher un personnage"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-void-900 px-3 py-2 text-sm text-white outline-none focus:border-domain sm:max-w-xs"
        />
        {value && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelect(null)}
            className="text-xs font-bold text-white/50 hover:text-cursed-light disabled:opacity-50"
          >
            Retirer l'avatar
          </button>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6 lg:grid-cols-8">
        {filtered.map((c) => {
          const selected = c.id === value;
          return (
            <button
              key={c.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(c.id)}
              title={c.name}
              aria-label={c.name}
              aria-pressed={selected}
              className={`aspect-square overflow-hidden rounded-xl border-2 transition-transform hover:scale-105 disabled:opacity-60 ${
                selected ? "border-domain shadow-glow" : "border-white/10"
              }`}
            >
              <CharacterImage character={c} />
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full py-6 text-center text-sm text-white/30">
            Aucun personnage.
          </p>
        )}
      </div>
    </div>
  );
}
