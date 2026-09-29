"use client";

import { framesForUniverse, DEFAULT_FRAME_KEY } from "@/lib/frames/definitions";
import { rarityStyle } from "@/lib/profile/rarity";
import { UserAvatar } from "@/components/UserAvatar";
import { CheckIcon, LockIcon } from "@/components/icons/UiIcons";

/**
 * Grille des CADRES de l'univers courant (+ le neutre), chacun prévisualisé
 * autour de l'avatar du joueur. Composant contrôlé : `value` null = cadre par
 * défaut. L'équipement (re-vérifié serveur par `equipFrameAction`) est fait par
 * la modale d'édition.
 */
export function FramePicker({
  username,
  avatarImage,
  unlockedKeys,
  value,
  onSelect,
  universeSlug,
  disabled,
}: {
  username: string;
  avatarImage?: string | null;
  /** Clés des cadres débloqués (calculées serveur : règle + grants + admin). */
  unlockedKeys: string[];
  value: string | null;
  /** Reçoit null pour le cadre par défaut (= retirer côté serveur). */
  onSelect: (key: string | null) => void;
  universeSlug: string;
  disabled?: boolean;
}) {
  const unlocked = new Set(unlockedKeys);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {framesForUniverse(universeSlug).map((f) => {
        const isUnlocked = unlocked.has(f.key);
        const isEquipped = (value ?? DEFAULT_FRAME_KEY) === f.key;
        const { color, label } = rarityStyle(f.rarity);
        return (
          <button
            key={f.key}
            type="button"
            disabled={disabled || !isUnlocked}
            onClick={() =>
              isUnlocked && onSelect(f.key === DEFAULT_FRAME_KEY ? null : f.key)
            }
            aria-pressed={isEquipped}
            title={isUnlocked ? f.description : `Verrouillé — ${f.description}`}
            className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors ${
              isEquipped
                ? "border-domain bg-domain/10 shadow-glow"
                : isUnlocked
                  ? "border-white/10 bg-void-900/40 hover:border-white/30"
                  : "cursor-not-allowed border-white/5 bg-void-900/30 opacity-60"
            }`}
          >
            <UserAvatar username={username} image={avatarImage} frameKey={f.key} size={56} />
            <span className="flex items-center gap-1 text-xs font-bold text-white/85">
              {f.name}
              {!isUnlocked && <LockIcon className="h-3.5 w-3.5 text-white/50" />}
            </span>
            <span className="text-[9px] uppercase tracking-wide" style={{ color }}>
              {label}
            </span>
            {isEquipped && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-domain-light">
                <CheckIcon /> équipé
              </span>
            )}
            {!isUnlocked && (
              <span className="text-[10px] leading-snug text-white/40">{f.description}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
