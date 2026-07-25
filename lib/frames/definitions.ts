import type { UnlockContext } from "@/lib/cosmetics/types";
import {
  ANY_UNIVERSE,
  inUniverse,
  isInUniverse,
  type UniverseScope,
} from "@/lib/cosmetics/universe";
import type { Rarity } from "@/lib/profile/rarity";
import { MAX_LEVEL } from "@/lib/progress/xp";
import { frameRingForStyle, type FrameStyleKey } from "./styles";

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
