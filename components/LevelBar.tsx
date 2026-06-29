import { xpToLevel } from "@/lib/progress/xp";

interface LevelBarProps {
  /** XP totale du compte (cache `User.totalXp`). */
  totalXp: number;
  className?: string;
}

/**
 * Barre de progression de niveau : niveau courant + avancement vers le suivant,
 * dérivé de l'XP totale via `xpToLevel`.
 */
export function LevelBar({ totalXp, className = "" }: LevelBarProps) {
  const { level, current, needed } = xpToLevel(totalXp);
  const pct = needed > 0 ? Math.min(100, Math.round((current / needed) * 100)) : 0;

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="font-display text-sm font-black uppercase tracking-wide text-white">
          Niveau <span className="text-domain-light">{level}</span>
        </span>
        <span className="text-xs tabular-nums text-white/45">
          {current} / {needed} XP
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full border border-white/10 bg-void-900">
        <div
          className="h-full rounded-full bg-gradient-to-r from-domain-dark via-domain to-domain-light shadow-glow transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
