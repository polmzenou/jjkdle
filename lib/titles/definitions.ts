import type { UnlockContext } from "@/lib/cosmetics/types";
import { gameTitleIn } from "@/lib/cosmetics/game-title";
import {
  inUniverse,
  isInUniverse,
  tagUniverse,
  type UniverseScope,
} from "@/lib/cosmetics/universe";
import type { Rarity } from "@/lib/profile/rarity";
import { MAX_LEVEL } from "@/lib/progress/xp";

/** Nom d'un jeu côté CSM (suit `lib/universes/csm.ts`, jamais figé en dur ici). */
const csmGame = (id: string) => gameTitleIn("csm", id);
/** Idem côté AOT (`lib/universes/aot.ts`). */
const aotGame = (id: string) => gameTitleIn("aot", id);
/** Idem côté KNY (`lib/universes/kny.ts`). */
const knyGame = (id: string) => gameTitleIn("kny", id);

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
  /** Univers propriétaire (multi-univers, étape 2d). Un titre ne s'équipe que
   * dans son univers ; la possession reste globale. */
  universe: UniverseScope;
  /** Règle de déblocage dérivée. `() => false` = titre manuel (admin). */
  isUnlocked: (ctx: UnlockContext) => boolean;
}

// Catalogue JJK (non taggé) → tagué `universe: "jjk"` à l'export. Un futur
// univers ajoute son propre tableau tagué de son slug, concaténé ci-dessous.
const JJK_TITLES: Omit<TitleDefinition, "universe">[] = [
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

// Catalogue CSM : mêmes règles de déblocage, vocabulaire Chainsaw Man, clés
// PRÉFIXÉES (la possession est globale et indexée par clé).
const CSM_TITLES: Omit<TitleDefinition, "universe">[] = [
  // ── Progression par niveau (titre de départ → légendaire au niveau max) ──
  {
    key: "CSM_NEW_HUNTER",
    name: "Chasseur Novice",
    description: "Titre de départ — disponible dès le niveau 1.",
    rarity: "common",
    isUnlocked: (u) => u.level >= 1,
  },
  {
    key: "CSM_PUBLIC_SAFETY",
    name: "Agent de la Sécurité Publique",
    description: "Atteindre le niveau 5.",
    rarity: "common",
    isUnlocked: (u) => u.level >= 5,
  },
  {
    key: "CSM_ELITE_HUNTER",
    name: "Chasseur d'Élite",
    description: "Atteindre le niveau 15.",
    rarity: "rare",
    isUnlocked: (u) => u.level >= 15,
  },
  {
    key: "CSM_HYBRID",
    name: "Hybride",
    description: "Atteindre le niveau 30.",
    rarity: "epic",
    isUnlocked: (u) => u.level >= 30,
  },
  {
    key: "CSM_HERO_OF_HELL",
    name: "Héros de l'Enfer",
    description: `Atteindre le niveau maximum (${MAX_LEVEL}).`,
    rarity: "legendary",
    isUnlocked: (u) => u.level >= MAX_LEVEL,
  },
  // ── Exploits méta-site ──
  {
    key: "CSM_DAILY_MASTER",
    name: "Maître de l'Énigme",
    description: `Trouver le ${csmGame("jjkdle")} du jour en un seul essai.`,
    rarity: "epic",
    isUnlocked: (u) => u.stats.jjkdleBestAttempts === 1,
  },
  {
    key: "CSM_PERFECT_WEEK",
    name: "Semaine Sans Faille",
    description: `Atteindre un streak ${csmGame("jjkdle")} de 7 jours.`,
    rarity: "rare",
    isUnlocked: (u) => u.stats.jjkdleBestStreak >= 7,
  },
  {
    key: "CSM_CHAINSAW_RUSH",
    name: "Tronçonneuse Déchaînée",
    description:
      "Atteindre le score maximal d'un jeu (rang S au Builder ou Pyramide parfaite).",
    rarity: "epic",
    isUnlocked: (u) =>
      u.stats.builderBest >= 980 || u.stats.rankingBest >= 10000,
  },
  {
    key: "CSM_COLLECTOR",
    name: "Collectionneur",
    description: "Débloquer au moins 10 badges.",
    rarity: "epic",
    isUnlocked: (u) => u.badgeCount >= 10,
  },
  // ── Titres MANUELS (octroi admin uniquement) ──
  {
    key: "CSM_UNDEFEATED",
    name: "Invaincu",
    description: `Battre un membre VIP en ${csmGame("battle")} — distinction décernée par le staff.`,
    rarity: "rare",
    isUnlocked: () => false,
  },
  {
    key: "CSM_DRAFT_KING",
    name: "Roi du Draft",
    description:
      "Terminer 1er d'un classement hebdomadaire — distinction décernée par le staff.",
    rarity: "legendary",
    isUnlocked: () => false,
  },
];

// Catalogue AOT : mêmes paliers, vocabulaire Attack on Titan, clés PRÉFIXÉES.
// L'échelle de progression suit la hiérarchie du Bataillon d'exploration, ce qui
// donne à la montée en niveau le même sens que le grade dans l'œuvre.
const AOT_TITLES: Omit<TitleDefinition, "universe">[] = [
  // ── Progression par niveau (titre de départ → légendaire au niveau max) ──
  {
    key: "AOT_NEW_CADET",
    name: "Cadet",
    description: "Titre de départ — disponible dès le niveau 1.",
    rarity: "common",
    isUnlocked: (u) => u.level >= 1,
  },
  {
    key: "AOT_SOLDIER",
    name: "Soldat",
    description: "Atteindre le niveau 5.",
    rarity: "common",
    isUnlocked: (u) => u.level >= 5,
  },
  {
    key: "AOT_SQUAD_LEADER",
    name: "Chef d'Escouade",
    description: "Atteindre le niveau 15.",
    rarity: "rare",
    isUnlocked: (u) => u.level >= 15,
  },
  {
    key: "AOT_SECTION_COMMANDER",
    name: "Commandant de Section",
    description: "Atteindre le niveau 30.",
    rarity: "epic",
    isUnlocked: (u) => u.level >= 30,
  },
  {
    key: "AOT_WINGS_OF_FREEDOM",
    name: "Ailes de la Liberté",
    description: `Atteindre le niveau maximum (${MAX_LEVEL}).`,
    rarity: "legendary",
    isUnlocked: (u) => u.level >= MAX_LEVEL,
  },
  // ── Exploits méta-site ──
  {
    key: "AOT_DAILY_MASTER",
    name: "Maître de l'Énigme",
    description: `Trouver le ${aotGame("jjkdle")} du jour en un seul essai.`,
    rarity: "epic",
    isUnlocked: (u) => u.stats.jjkdleBestAttempts === 1,
  },
  {
    key: "AOT_PERFECT_WEEK",
    name: "Semaine Sans Faille",
    description: `Atteindre un streak ${aotGame("jjkdle")} de 7 jours.`,
    rarity: "rare",
    isUnlocked: (u) => u.stats.jjkdleBestStreak >= 7,
  },
  {
    key: "AOT_TITAN_SLAYER",
    name: "Tueur de Titans",
    description:
      "Atteindre le score maximal d'un jeu (rang S au Builder ou Pyramide parfaite).",
    rarity: "epic",
    isUnlocked: (u) =>
      u.stats.builderBest >= 980 || u.stats.rankingBest >= 10000,
  },
  {
    key: "AOT_COLLECTOR",
    name: "Collectionneur",
    description: "Débloquer au moins 10 badges.",
    rarity: "epic",
    isUnlocked: (u) => u.badgeCount >= 10,
  },
  // ── Titres MANUELS (octroi admin uniquement) ──
  {
    key: "AOT_UNDEFEATED",
    name: "Invaincu",
    description: `Battre un membre VIP en ${aotGame("battle")} — distinction décernée par le staff.`,
    rarity: "rare",
    isUnlocked: () => false,
  },
  {
    key: "AOT_DRAFT_KING",
    name: "Roi du Draft",
    description:
      "Terminer 1er d'un classement hebdomadaire — distinction décernée par le staff.",
    rarity: "legendary",
    isUnlocked: () => false,
  },
];

// Catalogue KNY : mêmes paliers, vocabulaire Demon Slayer, clés PRÉFIXÉES.
// L'échelle reprend les grades de l'armée des pourfendeurs (Mizunoto → Kinoe →
// Pilier), les mêmes que l'attribut `knyrank` de KNYdle.
const KNY_TITLES: Omit<TitleDefinition, "universe">[] = [
  // ── Progression par niveau (titre de départ → légendaire au niveau max) ──
  {
    key: "KNY_NEW_SLAYER",
    name: "Pourfendeur Novice",
    description: "Titre de départ — disponible dès le niveau 1.",
    rarity: "common",
    isUnlocked: (u) => u.level >= 1,
  },
  {
    key: "KNY_MIZUNOTO",
    name: "Mizunoto",
    description: "Atteindre le niveau 5.",
    rarity: "common",
    isUnlocked: (u) => u.level >= 5,
  },
  {
    key: "KNY_KANOE",
    name: "Kanoe",
    description: "Atteindre le niveau 15.",
    rarity: "rare",
    isUnlocked: (u) => u.level >= 15,
  },
  {
    key: "KNY_KINOE",
    name: "Kinoe",
    description: "Atteindre le niveau 30.",
    rarity: "epic",
    isUnlocked: (u) => u.level >= 30,
  },
  {
    key: "KNY_HASHIRA",
    name: "Pilier",
    description: `Atteindre le niveau maximum (${MAX_LEVEL}).`,
    rarity: "legendary",
    isUnlocked: (u) => u.level >= MAX_LEVEL,
  },
  // ── Exploits méta-site ──
  {
    key: "KNY_DAILY_MASTER",
    name: "Maître de l'Énigme",
    description: `Trouver le ${knyGame("jjkdle")} du jour en un seul essai.`,
    rarity: "epic",
    isUnlocked: (u) => u.stats.jjkdleBestAttempts === 1,
  },
  {
    key: "KNY_PERFECT_WEEK",
    name: "Semaine Sans Faille",
    description: `Atteindre un streak ${knyGame("jjkdle")} de 7 jours.`,
    rarity: "rare",
    isUnlocked: (u) => u.stats.jjkdleBestStreak >= 7,
  },
  {
    key: "KNY_TOTAL_CONCENTRATION",
    name: "Concentration Totale",
    description:
      "Atteindre le score maximal d'un jeu (rang S au Builder ou Pyramide parfaite).",
    rarity: "epic",
    isUnlocked: (u) =>
      u.stats.builderBest >= 980 || u.stats.rankingBest >= 10000,
  },
  {
    key: "KNY_COLLECTOR",
    name: "Collectionneur",
    description: "Débloquer au moins 10 badges.",
    rarity: "epic",
    isUnlocked: (u) => u.badgeCount >= 10,
  },
  // ── Titres MANUELS (octroi admin uniquement) ──
  {
    key: "KNY_UNDEFEATED",
    name: "Invaincu",
    description: `Battre un membre VIP en ${knyGame("battle")} — distinction décernée par le staff.`,
    rarity: "rare",
    isUnlocked: () => false,
  },
  {
    key: "KNY_DRAFT_KING",
    name: "Roi du Draft",
    description:
      "Terminer 1er d'un classement hebdomadaire — distinction décernée par le staff.",
    rarity: "legendary",
    isUnlocked: () => false,
  },
];

/**
 * Catalogue COMPLET (tous univers). Sert à la possession/au déblocage, qui sont
 * globaux ; pour l'affichage et l'équipement, filtrer par univers courant via
 * `titlesForUniverse`.
 */
export const TITLES: TitleDefinition[] = [
  ...tagUniverse(JJK_TITLES, "jjk"),
  ...tagUniverse(CSM_TITLES, "csm"),
  ...tagUniverse(AOT_TITLES, "aot"),
  ...tagUniverse(KNY_TITLES, "kny"),
];

/** Titres d'un univers (slug) — catalogue affiché par le sélecteur de profil. */
export function titlesForUniverse(slug: string): TitleDefinition[] {
  return inUniverse(TITLES, slug);
}

const BY_KEY = new Map(TITLES.map((t) => [t.key, t]));

/** Récupère une définition de titre par sa clé (ou undefined). */
export function getTitle(key: string): TitleDefinition | undefined {
  return BY_KEY.get(key);
}

/** Vrai si la clé correspond à un titre connu (garde anti-tamper). */
export function isTitleKey(key: unknown): key is string {
  return typeof key === "string" && BY_KEY.has(key);
}

/**
 * Garde d'équipement multi-univers : le titre doit exister ET appartenir à
 * l'univers (ou être neutre). Orthogonal au DÉBLOCAGE (possession globale) : les
 * deux sont vérifiés côté serveur à l'équipement.
 */
export function isTitleInUniverse(key: string, slug: string): boolean {
  const def = BY_KEY.get(key);
  return def !== undefined && isInUniverse(def.universe, slug);
}
