import type { UserStatsContext } from "@/lib/progress/context";

/**
 * Catalogue des badges (source de vérité = code, pas de table `Badge`).
 *
 * Un badge = une règle dérivée des stats existantes (`UserStatsContext`). Le
 * déblocage est persisté dans `UserBadge.badgeKey`. Ajouter un badge = pousser
 * un objet ici (aucune migration).
 *
 * `check: () => false` ⇒ badge MANUEL : jamais auto-débloqué, réservé à
 * l'attribution admin (cf. lib/admin / UserAdmin).
 */
export interface BadgeRule {
  key: string;
  name: string;
  description: string;
  /** Emoji d'icône (aucun asset à uploader). */
  iconKey: string;
  /** Couleur d'accent (hex) pour l'affichage débloqué. */
  color: string;
  check: (ctx: UserStatsContext) => boolean;
}

export const BADGES: BadgeRule[] = [
  // ── Badges de découverte : jouer à chaque jeu pour la première fois ──
  {
    key: "FIRST_PLAY_BUILDER",
    name: "Apprenti exorciste",
    description: "Jouer à Build the Perfect Sorcerer pour la première fois.",
    iconKey: "🩸",
    color: "#dc2626",
    check: (ctx) => ctx.playedBuilder,
  },
  {
    key: "FIRST_PLAY_RANKING",
    name: "Premier classement",
    description: "Jouer à JJK Pyramid pour la première fois.",
    iconKey: "🔺",
    color: "#7c3aed",
    check: (ctx) => ctx.playedRanking,
  },
  {
    key: "FIRST_PLAY_DRAFT",
    name: "Première draft",
    description: "Jouer à Jujutsu Draft pour la première fois.",
    iconKey: "⚔️",
    color: "#f59e0b",
    check: (ctx) => ctx.playedDraft,
  },
  {
    key: "FIRST_PLAY_JJKDLE",
    name: "Première énigme",
    description: "Jouer à JJKdle pour la première fois.",
    iconKey: "🎭",
    color: "#38bdf8",
    check: (ctx) => ctx.playedJjkdle,
  },
  // ── Badges de performance ──
  {
    key: "FIRST_S_GRADE",
    name: "Grade S",
    description: "Atteindre le Grade S sur Build the Perfect Sorcerer (≥ 980).",
    iconKey: "🩸",
    color: "#f43f5e",
    check: (ctx) => ctx.builderBest >= 980,
  },
  {
    key: "PYRAMID_PERFECT",
    name: "Pyramide parfaite",
    description: "Résoudre JJK Pyramid sans faute, du premier coup (10 000).",
    iconKey: "🔺",
    color: "#a78bfa",
    check: (ctx) => ctx.rankingBest >= 10000,
  },
  {
    key: "DRAFT_CONQUEROR",
    name: "Conquérant",
    description: "Vaincre les 6 boss de Jujutsu Draft (victoire totale).",
    iconKey: "⚔️",
    color: "#f59e0b",
    check: (ctx) => ctx.draftVictory,
  },
  {
    key: "JJKDLE_STREAK_7",
    name: "Assidu",
    description: "Enchaîner 7 jours de JJKdle d'affilée.",
    iconKey: "🔥",
    color: "#fb923c",
    check: (ctx) => ctx.jjkdleStreak >= 7 || ctx.jjkdleBestStreak >= 7,
  },
  {
    key: "POLYVALENT",
    name: "Polyvalent",
    description: "Avoir un score sur au moins 4 jeux différents.",
    iconKey: "🎴",
    color: "#38bdf8",
    check: (ctx) => ctx.gamesPlayed >= 4,
  },
  // ── Badges manuels (admin uniquement) ──
  {
    key: "STAFF_PICK",
    name: "Choix du staff",
    description: "Distinction décernée manuellement par l'équipe.",
    iconKey: "⭐",
    color: "#facc15",
    check: () => false,
  },
];

const BY_KEY = new Map(BADGES.map((b) => [b.key, b]));

/** Récupère une règle de badge par sa clé (ou undefined). */
export function getBadge(key: string): BadgeRule | undefined {
  return BY_KEY.get(key);
}

/** Vrai si la clé correspond à un badge connu (garde anti-tamper). */
export function isBadgeKey(key: string): boolean {
  return BY_KEY.has(key);
}
