import type { CardColor, Team } from "@/lib/games/codenames/types";

/** Classes Tailwind par équipe (texte / bord / fond léger / plein). */
export const TEAM_STYLES: Record<
  Team,
  { label: string; text: string; border: string; bgSoft: string; bgSolid: string; ring: string }
> = {
  RED: {
    label: "Rouge",
    text: "text-red-400",
    border: "border-red-500/50",
    bgSoft: "bg-red-500/10",
    bgSolid: "bg-red-600",
    ring: "ring-red-500",
  },
  PURPLE: {
    label: "Violette",
    text: "text-fuchsia-400",
    border: "border-fuchsia-500/50",
    bgSoft: "bg-fuchsia-500/10",
    bgSolid: "bg-fuchsia-600",
    ring: "ring-fuchsia-500",
  },
};

/** Classe de fond appliquée à une carte révélée selon sa couleur. */
export const CARD_COLOR_BG: Record<CardColor, string> = {
  RED: "bg-red-600/80",
  PURPLE: "bg-fuchsia-600/80",
  NEUTRAL: "bg-stone-500/70",
  ASSASSIN: "bg-black",
};

/** Bordure d'une carte révélée selon sa couleur. */
export const CARD_COLOR_BORDER: Record<CardColor, string> = {
  RED: "border-red-400",
  PURPLE: "border-fuchsia-400",
  NEUTRAL: "border-stone-400",
  ASSASSIN: "border-white/60",
};
