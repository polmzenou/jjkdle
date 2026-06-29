import type { UnlockContext } from "@/lib/cosmetics/types";
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
    isUnlocked: () => true,
  },
  {
    key: "CURSED_ENERGY",
    name: "Énergie Occulte",
    description: "Atteindre le niveau 5.",
    rarity: "common",
    styleKey: "cursedEnergy",
    isUnlocked: (u) => u.level >= 5,
  },
  {
    key: "DOMAIN_GLOW",
    name: "Extension du Territoire",
    description: "Atteindre le niveau 20.",
    rarity: "epic",
    styleKey: "domainGlow",
    isUnlocked: (u) => u.level >= 20,
  },
  {
    key: "INFINITY",
    name: "Infinité",
    description: `Atteindre le niveau maximum (${MAX_LEVEL}).`,
    rarity: "legendary",
    styleKey: "infinity",
    isUnlocked: (u) => u.level >= MAX_LEVEL,
  },
  {
    key: "FLAME_STREAK",
    name: "Flamme Persistante",
    description: "Atteindre un streak JJKdle de 7 jours.",
    rarity: "rare",
    styleKey: "flameStreak",
    isUnlocked: (u) => u.stats.jjkdleBestStreak >= 7,
  },
  {
    key: "VIP_HUNTER",
    name: "Chasseur de VIP",
    description:
      "Battre un membre VIP en JJK Random Battle — décerné par le staff.",
    rarity: "rare",
    styleKey: "vipHunter",
    isUnlocked: () => false,
  },
  {
    key: "IDLE_LEGEND",
    name: "Légende du IdleGames",
    description: "Trouver le JJKdle du jour en un seul essai.",
    rarity: "epic",
    styleKey: "idleLegend",
    isUnlocked: (u) => u.stats.jjkdleBestAttempts === 1,
  },
];

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
 * Classes Tailwind du cadre à appliquer autour de l'avatar pour une clé de cadre
 * (repli sur le style par défaut si la clé est inconnue/null). Sert au rendu
 * partout où la pp apparaît (UserAvatar).
 */
export function frameRing(frameKey: string | null | undefined): string {
  const def = frameKey ? BY_KEY.get(frameKey) : undefined;
  return frameRingForStyle(def?.styleKey ?? "default");
}
