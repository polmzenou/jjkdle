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
  // Les six styles ci-dessus sont violets, cyan, orange, ambre et rose : nés du
  // thème JJK, ils sont réutilisables partout mais ne « sonnent » ni AOT ni KNY.
  // Les trois suivants complètent la gamme pour ces deux univers. Un style reste
  // du CSS neutre — sa clé n'est jamais montrée au joueur, tout univers peut donc
  // piocher dedans.
  /** Vert des capes du Bataillon d'exploration (AOT). */
  scoutGreen: {
    ring: "border-2 border-lime-400/80 shadow-[0_0_14px_3px_rgba(163,230,53,0.6)]",
  },
  /** Rouge du cercle au pinceau (KNY). */
  ensoRed: {
    ring: "border-2 border-red-500/80 shadow-[0_0_16px_4px_rgba(224,35,27,0.65)]",
  },
  /** Encre claire sur papier (KNY) — le seul style volontairement froid/pâle. */
  paperInk: {
    ring: "border-2 border-stone-200/70 shadow-[0_0_14px_3px_rgba(231,229,228,0.35)]",
  },
  /**
   * Or du sommet — récompense de « The Culling Tower ».
   *
   * Volontairement le plus lumineux du jeu, et le seul doré non ambré : boucler
   * la tour est l'exploit le plus long du site, il ne doit pas se confondre
   * avec `vipHunter`, qui s'achète.
   */
  towerSummit: {
    ring: "border-2 border-amber-200/90 shadow-[0_0_20px_6px_rgba(252,211,77,0.7)]",
  },
  /** Le même, animé : réservé à l'ascension réussie DU PREMIER ESSAI. */
  towerFlawless: {
    ring: "border-2 border-amber-100 shadow-[0_0_24px_8px_rgba(253,224,71,0.85)] animate-pulse",
  },
  /**
   * Cramoisi du kakugan (TG). Distinct d'`ensoRed`, plus vermillon : ici le rouge
   * tire sur le rose, comme le `primary` de l'univers (#c8102e).
   */
  kakuganRed: {
    ring: "border-2 border-rose-600/85 shadow-[0_0_16px_4px_rgba(200,16,46,0.65)]",
  },
} as const satisfies Record<string, FrameStyle>;

export type FrameStyleKey = keyof typeof FRAME_STYLES;

/** Classes du cadre pour un `styleKey` (repli sur `default`). */
export function frameRingForStyle(styleKey: string | null | undefined): string {
  return styleKey && styleKey in FRAME_STYLES
    ? FRAME_STYLES[styleKey as FrameStyleKey].ring
    : FRAME_STYLES.default.ring;
}
