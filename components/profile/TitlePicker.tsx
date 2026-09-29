"use client";

import { titlesForUniverse } from "@/lib/titles/definitions";
import { rarityStyle } from "@/lib/profile/rarity";
import { CheckIcon, LockIcon } from "@/components/icons/UiIcons";

/**
 * Grille des TITRES de l'univers courant : débloqués équipables, verrouillés
 * grisés avec leur condition. Composant contrôlé — l'équipement (re-vérifié
 * serveur par `equipTitleAction`) est fait par la modale d'édition.
 */
export function TitlePicker({
  unlockedKeys,
  value,
  onSelect,
  universeSlug,
  disabled,
}: {
  /** Clés des titres débloqués (calculées serveur : règle + grants + admin). */
  unlockedKeys: string[];
  value: string | null;
  onSelect: (key: string | null) => void;
  universeSlug: string;
  disabled?: boolean;
}) {
  const unlocked = new Set(unlockedKeys);

  return (
    <div>
      {value && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelect(null)}
          className="mb-3 text-xs font-bold text-white/50 hover:text-cursed-light disabled:opacity-50"
        >
          Retirer le titre
        </button>
      )}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {titlesForUniverse(universeSlug).map((t) => {
          const isUnlocked = unlocked.has(t.key);
          const isEquipped = value === t.key;
          const { color, label } = rarityStyle(t.rarity);
          return (
            <button
              key={t.key}
              type="button"
              disabled={disabled || !isUnlocked}
              onClick={() => isUnlocked && onSelect(t.key)}
              aria-pressed={isEquipped}
              title={isUnlocked ? t.description : `Verrouillé — ${t.description}`}
              className={`flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-colors ${
                isEquipped
                  ? "border-domain bg-domain/10 shadow-glow"
                  : isUnlocked
                    ? "border-white/10 bg-void-900/40 hover:border-white/30"
                    : "cursor-not-allowed border-white/5 bg-void-900/30 opacity-60"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="text-sm font-bold"
                  style={{ color: isUnlocked ? color : "#ffffff70" }}
                >
                  {t.name}
                </span>
                {!isUnlocked && <LockIcon className="h-3.5 w-3.5 text-white/50" />}
                {isEquipped && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-domain-light">
                    <CheckIcon /> équipé
                  </span>
                )}
              </span>
              <span className="text-[11px] leading-snug text-white/45">{t.description}</span>
              <span className="mt-0.5 text-[10px] uppercase tracking-wide" style={{ color }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
