import { gameTitleIn } from "@/lib/cosmetics/game-title";
import {
  inUniverse,
  tagUniverse,
  type UniverseScope,
} from "@/lib/cosmetics/universe";
import type { UserStatsContext } from "@/lib/progress/context";

/** Nom d'un jeu côté CSM (suit `lib/universes/csm.ts`, jamais figé en dur ici). */
const csmGame = (id: string) => gameTitleIn("csm", id);
/** Idem côté AOT (`lib/universes/aot.ts`). */
const aotGame = (id: string) => gameTitleIn("aot", id);
/** Idem côté KNY (`lib/universes/kny.ts`). */
const knyGame = (id: string) => gameTitleIn("kny", id);
/** Idem côté TG (`lib/universes/tg.ts`). */
const tgGame = (id: string) => gameTitleIn("tg", id);

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
  /** Univers propriétaire (multi-univers, étape 2d). Un badge ne se gagne et ne
   * s'affiche que dans son univers ; la possession reste globale et à vie. */
  universe: UniverseScope;
  check: (ctx: UserStatsContext) => boolean;
}

// Catalogue JJK (non tagué) → tagué `universe: "jjk"` à l'export. Un futur
// univers ajoute son propre tableau tagué de son slug, concaténé ci-dessous.
const JJK_BADGES: Omit<BadgeRule, "universe">[] = [
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

// Catalogue CSM. Mêmes RÈGLES que JJK (les stats sont déjà comptées par univers,
// cf. buildUserStatsContext) mais noms et descriptions en vocabulaire Chainsaw
// Man, et clés PRÉFIXÉES : la possession est globale et indexée par clé, deux
// univers ne peuvent donc pas partager une clé sans partager le déblocage.
const CSM_BADGES: Omit<BadgeRule, "universe">[] = [
  // ── Badges de découverte : jouer à chaque jeu pour la première fois ──
  {
    key: "CSM_FIRST_PLAY_BUILDER",
    name: "Chasseur débutant",
    description: `Jouer à ${csmGame("builder")} pour la première fois.`,
    iconKey: "🩸",
    color: "#d62828",
    check: (ctx) => ctx.playedBuilder,
  },
  {
    key: "CSM_FIRST_PLAY_RANKING",
    name: "Premier classement",
    description: `Jouer à ${csmGame("ranking")} pour la première fois.`,
    iconKey: "🔺",
    color: "#e8b100",
    check: (ctx) => ctx.playedRanking,
  },
  {
    key: "CSM_FIRST_PLAY_DRAFT",
    name: "Premier contrat",
    description: `Jouer à ${csmGame("jujutsu-draft")} pour la première fois.`,
    iconKey: "⚔️",
    color: "#f59e0b",
    check: (ctx) => ctx.playedDraft,
  },
  {
    key: "CSM_FIRST_PLAY_DAILY",
    name: "Première énigme",
    description: `Jouer à ${csmGame("jjkdle")} pour la première fois.`,
    iconKey: "🎭",
    color: "#38bdf8",
    check: (ctx) => ctx.playedJjkdle,
  },
  // ── Badges de performance ──
  {
    key: "CSM_FIRST_S_GRADE",
    name: "Rang S",
    description: `Atteindre le rang S sur ${csmGame("builder")} (≥ 980).`,
    iconKey: "🩸",
    color: "#f43f5e",
    check: (ctx) => ctx.builderBest >= 980,
  },
  {
    key: "CSM_PYRAMID_PERFECT",
    name: "Pyramide parfaite",
    description: `Résoudre ${csmGame("ranking")} sans faute, du premier coup (10 000).`,
    iconKey: "🔺",
    color: "#f05545",
    check: (ctx) => ctx.rankingBest >= 10000,
  },
  {
    key: "CSM_DRAFT_CONQUEROR",
    name: "Conquérant",
    description: `Vaincre les 6 boss de ${csmGame("jujutsu-draft")} (victoire totale).`,
    iconKey: "⚔️",
    color: "#f59e0b",
    check: (ctx) => ctx.draftVictory,
  },
  {
    key: "CSM_DAILY_STREAK_7",
    name: "Assidu",
    description: `Enchaîner 7 jours de ${csmGame("jjkdle")} d'affilée.`,
    iconKey: "🔥",
    color: "#fb923c",
    check: (ctx) => ctx.jjkdleStreak >= 7 || ctx.jjkdleBestStreak >= 7,
  },
  {
    key: "CSM_POLYVALENT",
    name: "Polyvalent",
    description: "Avoir un score sur au moins 4 jeux différents.",
    iconKey: "🎴",
    color: "#38bdf8",
    check: (ctx) => ctx.gamesPlayed >= 4,
  },
  // ── Badges manuels (admin uniquement) ──
  {
    key: "CSM_STAFF_PICK",
    name: "Choix du staff",
    description: "Distinction décernée manuellement par l'équipe.",
    iconKey: "⭐",
    color: "#facc15",
    check: () => false,
  },
];

// Catalogue AOT. Mêmes règles, vocabulaire Attack on Titan, clés préfixées.
// Les couleurs suivent la palette de l'univers (vert de cape, ocre des harnais,
// cf. `lib/universes/aot.ts`) plutôt que les violets/rouges hérités de JJK.
const AOT_BADGES: Omit<BadgeRule, "universe">[] = [
  // ── Badges de découverte : jouer à chaque jeu pour la première fois ──
  {
    key: "AOT_FIRST_PLAY_BUILDER",
    name: "Recrue",
    description: `Jouer à ${aotGame("builder")} pour la première fois.`,
    iconKey: "🗡️",
    color: "#a3e635",
    check: (ctx) => ctx.playedBuilder,
  },
  {
    key: "AOT_FIRST_PLAY_RANKING",
    name: "Premier classement",
    description: `Jouer à ${aotGame("ranking")} pour la première fois.`,
    iconKey: "🔺",
    color: "#4d7c0f",
    check: (ctx) => ctx.playedRanking,
  },
  {
    key: "AOT_FIRST_PLAY_DRAFT",
    name: "Première expédition",
    description: `Jouer à ${aotGame("jujutsu-draft")} pour la première fois.`,
    iconKey: "⚔️",
    color: "#b45309",
    check: (ctx) => ctx.playedDraft,
  },
  {
    key: "AOT_FIRST_PLAY_DAILY",
    name: "Première énigme",
    description: `Jouer à ${aotGame("jjkdle")} pour la première fois.`,
    iconKey: "🎭",
    color: "#f0b429",
    check: (ctx) => ctx.playedJjkdle,
  },
  // ── Badges de performance ──
  {
    key: "AOT_FIRST_S_GRADE",
    name: "Rang S",
    description: `Atteindre le rang S sur ${aotGame("builder")} (≥ 980).`,
    iconKey: "🏅",
    color: "#f0b429",
    check: (ctx) => ctx.builderBest >= 980,
  },
  {
    key: "AOT_PYRAMID_PERFECT",
    name: "Pyramide parfaite",
    description: `Résoudre ${aotGame("ranking")} sans faute, du premier coup (10 000).`,
    iconKey: "🔺",
    color: "#a3e635",
    check: (ctx) => ctx.rankingBest >= 10000,
  },
  {
    key: "AOT_DRAFT_CONQUEROR",
    name: "Tueur de titans",
    description: `Vaincre les 6 boss de ${aotGame("jujutsu-draft")} (victoire totale).`,
    iconKey: "⚔️",
    color: "#b45309",
    check: (ctx) => ctx.draftVictory,
  },
  {
    key: "AOT_DAILY_STREAK_7",
    name: "Assidu",
    description: `Enchaîner 7 jours de ${aotGame("jjkdle")} d'affilée.`,
    iconKey: "🔥",
    color: "#fb923c",
    check: (ctx) => ctx.jjkdleStreak >= 7 || ctx.jjkdleBestStreak >= 7,
  },
  {
    key: "AOT_POLYVALENT",
    name: "Polyvalent",
    description: "Avoir un score sur au moins 4 jeux différents.",
    iconKey: "🎴",
    color: "#38bdf8",
    check: (ctx) => ctx.gamesPlayed >= 4,
  },
  // ── Badges manuels (admin uniquement) ──
  {
    key: "AOT_STAFF_PICK",
    name: "Choix du staff",
    description: "Distinction décernée manuellement par l'équipe.",
    iconKey: "⭐",
    color: "#facc15",
    check: () => false,
  },
];

// Catalogue KNY. Mêmes règles, vocabulaire Demon Slayer, clés préfixées. Palette
// du logo officiel : rouge ensō et papier (cf. `lib/universes/kny.ts`).
const KNY_BADGES: Omit<BadgeRule, "universe">[] = [
  // ── Badges de découverte : jouer à chaque jeu pour la première fois ──
  {
    key: "KNY_FIRST_PLAY_BUILDER",
    name: "Nouvelle recrue",
    description: `Jouer à ${knyGame("builder")} pour la première fois.`,
    iconKey: "🗡️",
    color: "#e0231b",
    check: (ctx) => ctx.playedBuilder,
  },
  {
    key: "KNY_FIRST_PLAY_RANKING",
    name: "Premier classement",
    description: `Jouer à ${knyGame("ranking")} pour la première fois.`,
    iconKey: "🔺",
    color: "#ff5a4d",
    check: (ctx) => ctx.playedRanking,
  },
  {
    key: "KNY_FIRST_PLAY_DRAFT",
    name: "Première mission",
    description: `Jouer à ${knyGame("jujutsu-draft")} pour la première fois.`,
    iconKey: "⚔️",
    color: "#8c0f0a",
    check: (ctx) => ctx.playedDraft,
  },
  {
    key: "KNY_FIRST_PLAY_DAILY",
    name: "Première énigme",
    description: `Jouer à ${knyGame("jjkdle")} pour la première fois.`,
    iconKey: "🎭",
    color: "#e7e5e4",
    check: (ctx) => ctx.playedJjkdle,
  },
  // ── Badges de performance ──
  {
    key: "KNY_FIRST_S_GRADE",
    name: "Rang S",
    description: `Atteindre le rang S sur ${knyGame("builder")} (≥ 980).`,
    iconKey: "🏅",
    color: "#e0231b",
    check: (ctx) => ctx.builderBest >= 980,
  },
  {
    key: "KNY_PYRAMID_PERFECT",
    name: "Pyramide parfaite",
    description: `Résoudre ${knyGame("ranking")} sans faute, du premier coup (10 000).`,
    iconKey: "🔺",
    color: "#ff5a4d",
    check: (ctx) => ctx.rankingBest >= 10000,
  },
  {
    key: "KNY_DRAFT_CONQUEROR",
    name: "Pourfendeur accompli",
    description: `Vaincre les 6 boss de ${knyGame("jujutsu-draft")} (victoire totale).`,
    iconKey: "⚔️",
    color: "#8c0f0a",
    check: (ctx) => ctx.draftVictory,
  },
  {
    key: "KNY_DAILY_STREAK_7",
    name: "Assidu",
    description: `Enchaîner 7 jours de ${knyGame("jjkdle")} d'affilée.`,
    iconKey: "🔥",
    color: "#fb923c",
    check: (ctx) => ctx.jjkdleStreak >= 7 || ctx.jjkdleBestStreak >= 7,
  },
  {
    key: "KNY_POLYVALENT",
    name: "Polyvalent",
    description: "Avoir un score sur au moins 4 jeux différents.",
    iconKey: "🎴",
    color: "#38bdf8",
    check: (ctx) => ctx.gamesPlayed >= 4,
  },
  // ── Badges manuels (admin uniquement) ──
  {
    key: "KNY_STAFF_PICK",
    name: "Choix du staff",
    description: "Distinction décernée manuellement par l'équipe.",
    iconKey: "⭐",
    color: "#facc15",
    check: () => false,
  },
];

// Catalogue TG. Mêmes règles, vocabulaire Tokyo Ghoul, clés préfixées. Palette
// du logo officiel : cramoisi et cyan de l'aberration chromatique (cf.
// `lib/universes/tg.ts`).
const TG_BADGES: Omit<BadgeRule, "universe">[] = [
  // ── Badges de découverte : jouer à chaque jeu pour la première fois ──
  {
    key: "TG_FIRST_PLAY_BUILDER",
    name: "Éveil du kakugan",
    description: `Jouer à ${tgGame("builder")} pour la première fois.`,
    iconKey: "👁️",
    color: "#c8102e",
    check: (ctx) => ctx.playedBuilder,
  },
  {
    key: "TG_FIRST_PLAY_RANKING",
    name: "Premier classement",
    description: `Jouer à ${tgGame("ranking")} pour la première fois.`,
    iconKey: "🔺",
    color: "#ff3355",
    check: (ctx) => ctx.playedRanking,
  },
  {
    key: "TG_FIRST_PLAY_DRAFT",
    name: "Première traque",
    description: `Jouer à ${tgGame("jujutsu-draft")} pour la première fois.`,
    iconKey: "⚔️",
    color: "#7a0316",
    check: (ctx) => ctx.playedDraft,
  },
  {
    key: "TG_FIRST_PLAY_DAILY",
    name: "Première énigme",
    description: `Jouer à ${tgGame("jjkdle")} pour la première fois.`,
    iconKey: "🎭",
    color: "#22d3ee",
    check: (ctx) => ctx.playedJjkdle,
  },
  // ── Badges de performance ──
  {
    key: "TG_FIRST_S_GRADE",
    name: "Rang S",
    description: `Atteindre le rang S sur ${tgGame("builder")} (≥ 980).`,
    iconKey: "🏅",
    color: "#c8102e",
    check: (ctx) => ctx.builderBest >= 980,
  },
  {
    key: "TG_PYRAMID_PERFECT",
    name: "Pyramide parfaite",
    description: `Résoudre ${tgGame("ranking")} sans faute, du premier coup (10 000).`,
    iconKey: "🔺",
    color: "#ff3355",
    check: (ctx) => ctx.rankingBest >= 10000,
  },
  {
    key: "TG_DRAFT_CONQUEROR",
    name: "Traqueur accompli",
    description: `Vaincre les 6 boss de ${tgGame("jujutsu-draft")} (victoire totale).`,
    iconKey: "⚔️",
    color: "#7a0316",
    check: (ctx) => ctx.draftVictory,
  },
  {
    key: "TG_DAILY_STREAK_7",
    name: "Assidu",
    description: `Enchaîner 7 jours de ${tgGame("jjkdle")} d'affilée.`,
    iconKey: "🔥",
    color: "#fb923c",
    check: (ctx) => ctx.jjkdleStreak >= 7 || ctx.jjkdleBestStreak >= 7,
  },
  {
    key: "TG_POLYVALENT",
    name: "Polyvalent",
    description: "Avoir un score sur au moins 4 jeux différents.",
    iconKey: "🎴",
    color: "#38bdf8",
    check: (ctx) => ctx.gamesPlayed >= 4,
  },
  // ── Badges manuels (admin uniquement) ──
  {
    key: "TG_STAFF_PICK",
    name: "Choix du staff",
    description: "Distinction décernée manuellement par l'équipe.",
    iconKey: "⭐",
    color: "#facc15",
    check: () => false,
  },
];

/**
 * Catalogue COMPLET (tous univers). La possession étant globale, c'est ce
 * catalogue qui sert de référence de clés ; pour ce qui se gagne et s'affiche
 * dans un univers donné, utiliser `badgesForUniverse`.
 */
export const BADGES: BadgeRule[] = [
  ...tagUniverse(JJK_BADGES, "jjk"),
  ...tagUniverse(CSM_BADGES, "csm"),
  ...tagUniverse(AOT_BADGES, "aot"),
  ...tagUniverse(KNY_BADGES, "kny"),
  ...tagUniverse(TG_BADGES, "tg"),
];

/** Badges d'un univers (slug) — évaluation des déblocages et vitrine profil. */
export function badgesForUniverse(slug: string): BadgeRule[] {
  return inUniverse(BADGES, slug);
}

const BY_KEY = new Map(BADGES.map((b) => [b.key, b]));

/** Récupère une règle de badge par sa clé (ou undefined). */
export function getBadge(key: string): BadgeRule | undefined {
  return BY_KEY.get(key);
}

/** Vrai si la clé correspond à un badge connu (garde anti-tamper). */
export function isBadgeKey(key: string): boolean {
  return BY_KEY.has(key);
}
