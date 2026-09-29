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

/**
 * Variante « bord à bord » de la barre d'XP : pleine largeur, sans libellé ni
 * arrondi, collée sous une bannière (hero de profil). Les chiffres sont affichés
 * par le parent, qui dispose d'`xpToLevel` s'il en a besoin.
 */
export function XpStrip({ totalXp, className = "" }: LevelBarProps) {
  const { current, needed } = xpToLevel(totalXp);
  const pct = needed > 0 ? Math.min(100, Math.round((current / needed) * 100)) : 0;

  return (
    <div
      role="progressbar"
      aria-label="Progression vers le niveau suivant"
      aria-valuemin={0}
      aria-valuemax={needed}
      aria-valuenow={current}
      className={`h-2.5 w-full bg-void-900 ${className}`}
    >
      <div
        className="h-full bg-gradient-to-r from-domain-dark via-domain to-domain-light shadow-glow transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
