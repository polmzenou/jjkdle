import type { UnlockContext } from "@/lib/cosmetics/types";
import type { Rarity } from "@/lib/profile/rarity";
import { MAX_LEVEL } from "@/lib/progress/xp";

/**
 * Catalogue des TITRES (source de vérité = code, comme les badges/bannières —
 * aucune table `Title`). Un titre s'affiche sous le pseudo (façon tag VIP) ; le
 * joueur en équipe au plus un (cf. `User.equippedTitleKey`).
 *
 * Le déblocage normal est DÉRIVÉ à la volée via `isUnlocked(ctx)` depuis les
 * stats + niveau + badges. En plus : un admin peut octroyer manuellement un
 * titre (UserTitleGrant), et les admins ont tout débloqué (bypass) — cette
 * couche est gérée dans lib/cosmetics/unlock, pas ici.
 *
 * `isUnlocked: () => false` ⇒ titre MANUEL : jamais auto-débloqué, réservé à
 * l'octroi admin (ex. exploits multijoueur/leaderboard non dérivables à coût
 * raisonnable). Même convention que `check: () => false` côté badges.
 */
export interface TitleDefinition {
  key: string;
  /** Texte affiché sous le pseudo. */
  name: string;
  /** Comment le débloquer (visible dans le sélecteur de profil). */
  description: string;
  rarity: Rarity;
  /** Règle de déblocage dérivée. `() => false` = titre manuel (admin). */
  isUnlocked: (ctx: UnlockContext) => boolean;
}

export const TITLES: TitleDefinition[] = [
  // ── Progression par niveau (titre de départ → légendaire au niveau max) ──
  {
    key: "NEW_SORCERER",
    name: "Jeune Exorciste",
    description: "Titre de départ — disponible dès le niveau 1.",
    rarity: "common",
    isUnlocked: (u) => u.level >= 1,
  },
  {
    key: "GRADE_4",
    name: "Sorcier de Grade 4",
    description: "Atteindre le niveau 5.",
    rarity: "common",
    isUnlocked: (u) => u.level >= 5,
  },
  {
    key: "GRADE_1",
    name: "Sorcier de Grade 1",
    description: "Atteindre le niveau 15.",
    rarity: "rare",
    isUnlocked: (u) => u.level >= 15,
  },
  {
    key: "SPECIAL_GRADE",
    name: "Niveau Spécial",
    description: "Atteindre le niveau 30.",
    rarity: "epic",
    isUnlocked: (u) => u.level >= 30,
  },
  {
    key: "STRONGEST",
    name: "L'Homme le Plus Fort",
    description: `Atteindre le niveau maximum (${MAX_LEVEL}).`,
    rarity: "legendary",
    isUnlocked: (u) => u.level >= MAX_LEVEL,
  },
  // ── Exploits méta-site (IdleGames / JJK Arcade) ──
  {
    key: "IDLE_MASTER",
    name: "Maître du IdleGames",
    description: "Trouver le JJKdle du jour en un seul essai.",
    rarity: "epic",
    isUnlocked: (u) => u.stats.jjkdleBestAttempts === 1,
  },
  {
    key: "PERFECT_WEEK",
    name: "Semaine Sans Faille",
    description: "Atteindre un streak JJKdle de 7 jours.",
    rarity: "rare",
    isUnlocked: (u) => u.stats.jjkdleBestStreak >= 7,
  },
  {
    key: "BLACK_FLASH",
    name: "Black Flash",
    description:
      "Atteindre le score maximal d'un jeu (Grade S au Builder ou Pyramide parfaite).",
    rarity: "epic",
    isUnlocked: (u) =>
      u.stats.builderBest >= 980 || u.stats.rankingBest >= 10000,
  },
  {
    key: "COLLECTOR",
    name: "Collectionneur",
    description: "Débloquer au moins 10 badges.",
    rarity: "epic",
    isUnlocked: (u) => u.badgeCount >= 10,
  },
  // ── Titres MANUELS (octroi admin uniquement, non dérivables simplement) ──
  {
    key: "UNDEFEATED",
    name: "Invaincu",
    description:
      "Battre un membre VIP en JJK Random Battle — distinction décernée par le staff.",
    rarity: "rare",
    isUnlocked: () => false,
  },
  {
    key: "DRAFT_KING",
    name: "Roi du Draft",
    description:
      "Terminer 1er d'un classement hebdomadaire — distinction décernée par le staff.",
    rarity: "legendary",
    isUnlocked: () => false,
  },
];

const BY_KEY = new Map(TITLES.map((t) => [t.key, t]));

/** Récupère une définition de titre par sa clé (ou undefined). */
export function getTitle(key: string): TitleDefinition | undefined {
  return BY_KEY.get(key);
}

/** Vrai si la clé correspond à un titre connu (garde anti-tamper). */
export function isTitleKey(key: unknown): key is string {
  return typeof key === "string" && BY_KEY.has(key);
}
