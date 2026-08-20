import type { UnlockContext } from "@/lib/cosmetics/types";
import { gameTitleIn } from "@/lib/cosmetics/game-title";
import {
  ANY_UNIVERSE,
  inUniverse,
  isInUniverse,
  type UniverseScope,
} from "@/lib/cosmetics/universe";
import type { Rarity } from "@/lib/profile/rarity";
import { MAX_LEVEL } from "@/lib/progress/xp";
import { frameRingForStyle, type FrameStyleKey } from "./styles";

/** Nom d'un jeu côté CSM (suit `lib/universes/csm.ts`, jamais figé en dur ici). */
const csmGame = (id: string) => gameTitleIn("csm", id);
/** Idem côté AOT (`lib/universes/aot.ts`). */
const aotGame = (id: string) => gameTitleIn("aot", id);
/** Idem côté KNY (`lib/universes/kny.ts`). */
const knyGame = (id: string) => gameTitleIn("kny", id);

/**
 * Catalogue des CADRES (nameplates) — source de vérité = code (aucune table
 * `Frame`). Un cadre est une bordure/glow décoratif autour de la photo de profil
 * (cf. `User.equippedFrameKey`). 100 % CSS : aucun upload. Le rendu d'un cadre
 * passe par son `styleKey` → lib/frames/styles.
 *
 * Mêmes règles de déblocage que les titres (cf. lib/titles/definitions) :
 * `isUnlocked(ctx)` dérivé + octroi manuel admin + bypass admin (couche gérée
 * dans lib/cosmetics/unlock). `isUnlocked: () => false` ⇒ cadre MANUEL.
 */
export interface FrameDefinition {
  key: string;
  name: string;
  /** Condition de déblocage (visible dans le sélecteur de profil). */
  description: string;
  rarity: Rarity;
  /** Référence un style CSS défini en code (lib/frames/styles). */
  styleKey: FrameStyleKey;
  /** Univers propriétaire (multi-univers, étape 2d). `ANY_UNIVERSE` = neutre.
   * Un cadre ne s'équipe que dans son univers ; la possession reste globale. */
  universe: UniverseScope;
  isUnlocked: (ctx: UnlockContext) => boolean;
}

/** Clé du cadre par défaut (toujours disponible, jamais verrouillé). */
export const DEFAULT_FRAME_KEY = "DEFAULT";

export const FRAMES: FrameDefinition[] = [
  {
    key: DEFAULT_FRAME_KEY,
    name: "Standard",
    description: "Cadre par défaut, toujours disponible.",
    rarity: "common",
    styleKey: "default",
    universe: ANY_UNIVERSE,
    isUnlocked: () => true,
  },
  {
    key: "CURSED_ENERGY",
    name: "Énergie Occulte",
    description: "Atteindre le niveau 5.",
    rarity: "common",
    styleKey: "cursedEnergy",
    universe: "jjk",
    isUnlocked: (u) => u.level >= 5,
  },
  {
    key: "DOMAIN_GLOW",
    name: "Extension du Territoire",
    description: "Atteindre le niveau 20.",
    rarity: "epic",
    styleKey: "domainGlow",
    universe: "jjk",
    isUnlocked: (u) => u.level >= 20,
  },
  {
    key: "INFINITY",
    name: "Infinité",
    description: `Atteindre le niveau maximum (${MAX_LEVEL}).`,
    rarity: "legendary",
    styleKey: "infinity",
    universe: "jjk",
    isUnlocked: (u) => u.level >= MAX_LEVEL,
  },
  {
    key: "FLAME_STREAK",
    name: "Flamme Persistante",
    description: "Atteindre un streak JJKdle de 7 jours.",
    rarity: "rare",
    styleKey: "flameStreak",
    universe: "jjk",
    isUnlocked: (u) => u.stats.jjkdleBestStreak >= 7,
  },
  {
    key: "VIP_HUNTER",
    name: "Chasseur de VIP",
    description:
      "Battre un membre VIP en JJK Random Battle — décerné par le staff.",
    rarity: "rare",
    styleKey: "vipHunter",
    universe: "jjk",
    isUnlocked: () => false,
  },
  {
    key: "IDLE_LEGEND",
    name: "Légende du IdleGames",
    description: "Trouver le JJKdle du jour en un seul essai.",
    rarity: "epic",
    styleKey: "idleLegend",
    universe: "jjk",
    isUnlocked: (u) => u.stats.jjkdleBestAttempts === 1,
  },

  // ── Cadres CSM ────────────────────────────────────────────────────────────
  // Mêmes paliers que JJK, noms Chainsaw Man, clés PRÉFIXÉES (possession
  // globale indexée par clé). Les `styleKey` sont réutilisés : un style est un
  // simple jeu de classes CSS, sans saveur d'anime, et sa clé n'est jamais
  // affichée au joueur (cf. lib/frames/styles).
  {
    key: "CSM_BLOOD_PACT",
    name: "Pacte de Sang",
    description: "Atteindre le niveau 5.",
    rarity: "common",
    styleKey: "idleLegend",
    universe: "csm",
    isUnlocked: (u) => u.level >= 5,
  },
  {
    key: "CSM_DEVIL_HORNS",
    name: "Cornes de Démon",
    description: "Atteindre le niveau 20.",
    rarity: "epic",
    styleKey: "domainGlow",
    universe: "csm",
    isUnlocked: (u) => u.level >= 20,
  },
  {
    key: "CSM_CHAINSAW_HEART",
    name: "Cœur de Tronçonneuse",
    description: `Atteindre le niveau maximum (${MAX_LEVEL}).`,
    rarity: "legendary",
    styleKey: "infinity",
    universe: "csm",
    isUnlocked: (u) => u.level >= MAX_LEVEL,
  },
  {
    key: "CSM_BURNING_STREAK",
    name: "Feu Continu",
    description: `Atteindre un streak ${csmGame("jjkdle")} de 7 jours.`,
    rarity: "rare",
    styleKey: "flameStreak",
    universe: "csm",
    isUnlocked: (u) => u.stats.jjkdleBestStreak >= 7,
  },
  {
    key: "CSM_VIP_HUNTER",
    name: "Tueur de VIP",
    description: `Battre un membre VIP en ${csmGame("battle")} — décerné par le staff.`,
    rarity: "rare",
    styleKey: "vipHunter",
    universe: "csm",
    isUnlocked: () => false,
  },
  {
    key: "CSM_DAILY_LEGEND",
    name: "Légende du Quotidien",
    description: `Trouver le ${csmGame("jjkdle")} du jour en un seul essai.`,
    rarity: "epic",
    styleKey: "cursedEnergy",
    universe: "csm",
    isUnlocked: (u) => u.stats.jjkdleBestAttempts === 1,
  },

  // ── Cadres AOT ────────────────────────────────────────────────────────────
  // Mêmes paliers, noms Attack on Titan, clés PRÉFIXÉES. Le cadre d'entrée prend
  // `scoutGreen` (ajouté avec cet univers) : le vert de cape n'existait dans
  // aucun des six styles hérités de JJK.
  {
    key: "AOT_ODM_GEAR",
    name: "Équipement Tridimensionnel",
    description: "Atteindre le niveau 5.",
    rarity: "common",
    styleKey: "scoutGreen",
    universe: "aot",
    isUnlocked: (u) => u.level >= 5,
  },
  {
    key: "AOT_SURVEY_CORPS",
    name: "Bataillon d'Exploration",
    description: "Atteindre le niveau 20.",
    rarity: "epic",
    styleKey: "domainGlow",
    universe: "aot",
    isUnlocked: (u) => u.level >= 20,
  },
  {
    key: "AOT_FOUNDING_TITAN",
    name: "Titan Originel",
    description: `Atteindre le niveau maximum (${MAX_LEVEL}).`,
    rarity: "legendary",
    styleKey: "infinity",
    universe: "aot",
    isUnlocked: (u) => u.level >= MAX_LEVEL,
  },
  {
    key: "AOT_SIGNAL_FLARE",
    name: "Fusée Éclairante",
    description: `Atteindre un streak ${aotGame("jjkdle")} de 7 jours.`,
    rarity: "rare",
    styleKey: "flameStreak",
    universe: "aot",
    isUnlocked: (u) => u.stats.jjkdleBestStreak >= 7,
  },
  {
    key: "AOT_VIP_HUNTER",
    name: "Chasseur de VIP",
    description: `Battre un membre VIP en ${aotGame("battle")} — décerné par le staff.`,
    rarity: "rare",
    styleKey: "vipHunter",
    universe: "aot",
    isUnlocked: () => false,
  },
  {
    key: "AOT_DAILY_LEGEND",
    name: "Légende du Quotidien",
    description: `Trouver le ${aotGame("jjkdle")} du jour en un seul essai.`,
    rarity: "epic",
    styleKey: "idleLegend",
    universe: "aot",
    isUnlocked: (u) => u.stats.jjkdleBestAttempts === 1,
  },

  // ── Cadres KNY ────────────────────────────────────────────────────────────
  // Mêmes paliers, noms Demon Slayer, clés PRÉFIXÉES. `ensoRed` et `paperInk`
  // (ajoutés avec cet univers) portent les deux couleurs du logo officiel.
  {
    key: "KNY_NICHIRIN",
    name: "Lame Nichirin",
    description: "Atteindre le niveau 5.",
    rarity: "common",
    styleKey: "ensoRed",
    universe: "kny",
    isUnlocked: (u) => u.level >= 5,
  },
  {
    key: "KNY_DEMON_MARK",
    name: "Marque du Pourfendeur",
    description: "Atteindre le niveau 20.",
    rarity: "epic",
    styleKey: "domainGlow",
    universe: "kny",
    isUnlocked: (u) => u.level >= 20,
  },
  {
    key: "KNY_HASHIRA_HAORI",
    name: "Haori de Pilier",
    description: `Atteindre le niveau maximum (${MAX_LEVEL}).`,
    rarity: "legendary",
    styleKey: "infinity",
    universe: "kny",
    isUnlocked: (u) => u.level >= MAX_LEVEL,
  },
  {
    key: "KNY_BURNING_STREAK",
    name: "Flamme Continue",
    description: `Atteindre un streak ${knyGame("jjkdle")} de 7 jours.`,
    rarity: "rare",
    styleKey: "flameStreak",
    universe: "kny",
    isUnlocked: (u) => u.stats.jjkdleBestStreak >= 7,
  },
  {
    key: "KNY_VIP_HUNTER",
    name: "Chasseur de VIP",
    description: `Battre un membre VIP en ${knyGame("battle")} — décerné par le staff.`,
    rarity: "rare",
    styleKey: "vipHunter",
    universe: "kny",
    isUnlocked: () => false,
  },
  {
    key: "KNY_DAILY_LEGEND",
    name: "Légende du Quotidien",
    description: `Trouver le ${knyGame("jjkdle")} du jour en un seul essai.`,
    rarity: "epic",
    styleKey: "paperInk",
    universe: "kny",
    isUnlocked: (u) => u.stats.jjkdleBestAttempts === 1,
  },
];

/** Cadres d'un univers (slug) — catalogue affiché par le sélecteur de profil.
 * Inclut toujours le cadre par défaut (neutre). */
export function framesForUniverse(slug: string): FrameDefinition[] {
  return inUniverse(FRAMES, slug);
}

const BY_KEY = new Map(FRAMES.map((f) => [f.key, f]));

/** Récupère une définition de cadre par sa clé (ou undefined). */
export function getFrame(key: string): FrameDefinition | undefined {
  return BY_KEY.get(key);
}

/** Vrai si la clé correspond à un cadre connu (garde anti-tamper). */
export function isFrameKey(key: unknown): key is string {
  return typeof key === "string" && BY_KEY.has(key);
}

/**
 * Garde d'équipement multi-univers : le cadre doit exister ET appartenir à
 * l'univers (ou être neutre, cas du cadre par défaut). Orthogonal au DÉBLOCAGE.
 */
export function isFrameInUniverse(key: string, slug: string): boolean {
  const def = BY_KEY.get(key);
  return def !== undefined && isInUniverse(def.universe, slug);
}

/**
 * Classes Tailwind du cadre à appliquer autour de l'avatar pour une clé de cadre
 * (repli sur le style par défaut si la clé est inconnue/null). Sert au rendu
 * partout où la pp apparaît (UserAvatar).
 */
export function frameRing(frameKey: string | null | undefined): string {
  const def = frameKey ? BY_KEY.get(frameKey) : undefined;
  return frameRingForStyle(def?.styleKey ?? "default");
}
