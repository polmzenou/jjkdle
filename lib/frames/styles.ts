/**
 * Styles visuels des cadres (nameplates) — 100 % CSS, AUCUN upload. Chaque
 * `styleKey` mappe vers un jeu de classes Tailwind appliquées au conteneur rond
 * de l'avatar (bordure + glow néon, animé pour les plus rares). Découplé des
 * définitions de cadres (lib/frames/definitions) : une définition référence un
 * `styleKey`, on peut donc réutiliser/échanger les styles sans toucher au reste.
 */
export interface FrameStyle {
  /** Classes Tailwind appliquées au cercle de l'avatar (bordure + ombre/glow). */
  ring: string;
}

export const FRAME_STYLES = {
  /** Cadre par défaut : bordure discrète (équivalent à l'ancien rendu). */
  default: { ring: "border border-white/15" },
  cursedEnergy: {
    ring: "border-2 border-violet-500/70 shadow-[0_0_10px_2px_rgba(139,92,246,0.55)]",
  },
  domainGlow: {
    ring: "border-2 border-fuchsia-400/80 shadow-[0_0_16px_4px_rgba(217,70,239,0.6)]",
  },
  infinity: {
    ring: "border-2 border-cyan-300/80 shadow-[0_0_18px_5px_rgba(34,211,238,0.65)] animate-pulse",
  },
  flameStreak: {
    ring: "border-2 border-orange-400/80 shadow-[0_0_14px_3px_rgba(251,146,60,0.7)] animate-pulse",
  },
  vipHunter: {
    ring: "border-2 border-amber-300/80 shadow-[0_0_14px_3px_rgba(251,191,36,0.6)]",
  },
  idleLegend: {
    ring: "border-2 border-rose-400/80 shadow-[0_0_16px_4px_rgba(244,63,94,0.6)]",
  },
} as const satisfies Record<string, FrameStyle>;

export type FrameStyleKey = keyof typeof FRAME_STYLES;

/** Classes du cadre pour un `styleKey` (repli sur `default`). */
export function frameRingForStyle(styleKey: string | null | undefined): string {
  return styleKey && styleKey in FRAME_STYLES
    ? FRAME_STYLES[styleKey as FrameStyleKey].ring
    : FRAME_STYLES.default.ring;
}
