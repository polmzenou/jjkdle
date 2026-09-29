"use client";

import { NAME_COLORS, isNameColorUnlocked } from "@/lib/profile/name-colors";
import { PlayerName } from "@/components/PlayerName";
import { CheckIcon, LockIcon } from "@/components/icons/UiIcons";

/**
 * Grille des COULEURS DE PSEUDO : chaque palier de complétion de la collection
 * de l'univers en débloque une. Composant contrôlé — l'équipement (re-vérifié
 * serveur par `equipNameColorAction`) est fait par la modale d'édition.
 */
export function NameColorPicker({
  username,
  collectionPct,
  isAdmin,
  value,
  onSelect,
  disabled,
}: {
  username: string;
  /** Complétion de la collection de l'univers courant (0–100, arrondi bas). */
  collectionPct: number;
  isAdmin: boolean;
  value: string | null;
  onSelect: (key: string | null) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="mb-4 rounded-2xl border border-white/10 bg-void-900/40 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-white/60">
            Collection de l&apos;univers
          </p>
          <p className="font-display text-lg font-black tabular-nums text-white">
            {collectionPct} %
          </p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-domain"
            style={{ width: `${Math.min(collectionPct, 100)}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-white/45">
          Complète ta collection de cartes pour débloquer de nouvelles couleurs de pseudo.
        </p>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelect(null)}
          aria-pressed={value === null}
          className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
            value === null
              ? "border-domain bg-domain/10 shadow-glow"
              : "border-white/10 bg-void-900/40 hover:border-white/30"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <span className="truncate text-base font-bold text-white">{username}</span>
            {value === null && <EquippedTag />}
          </span>
          <span className="text-[11px] text-white/45">Par défaut</span>
        </button>

        {NAME_COLORS.map((c) => {
          const isUnlocked = isNameColorUnlocked(c.key, collectionPct, isAdmin);
          const isEquipped = value === c.key;
          return (
            <button
              key={c.key}
              type="button"
              disabled={disabled || !isUnlocked}
              onClick={() => isUnlocked && onSelect(c.key)}
              aria-pressed={isEquipped}
              title={isUnlocked ? c.label : `Verrouillé — ${c.threshold} % de la collection`}
              className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                isEquipped
                  ? "border-domain bg-domain/10 shadow-glow"
                  : isUnlocked
                    ? "border-white/10 bg-void-900/40 hover:border-white/30"
                    : "cursor-not-allowed border-white/5 bg-void-900/30 opacity-60"
              }`}
            >
              <span className="flex max-w-full items-center gap-1.5">
                <PlayerName
                  name={username}
                  nameColorKey={c.key}
                  className="truncate text-base"
                />
                {!isUnlocked && <LockIcon className="h-3.5 w-3.5 shrink-0 text-white/50" />}
                {isEquipped && <EquippedTag />}
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-white/55">
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: c.swatch }}
                />
                {c.label}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-white/40">
                {c.threshold} % de la collection
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EquippedTag() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold text-domain-light">
      <CheckIcon /> équipé
    </span>
  );
}
