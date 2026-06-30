import { MAX_LEVEL } from "@/lib/progress/xp";

/**
 * Palette fermée de bannières de profil. Aucune valeur libre : l'utilisateur
 * choisit une CLÉ, le serveur valide qu'elle existe (anti-tamper) et le rendu
 * applique le dégradé correspondant. Cohérent avec le thème (domain/cursed/void).
 *
 * Chaque bannière a un `requiredLevel` : la courbe de déblocage est définie ICI
 * une seule fois (pas dispersée). Progression douce au début, plus exigeante à la
 * fin : 1, 1, 3, 5, 8, 11, 15, 20, 26, 33, 41, 50 (espacement croissant). Les
 * admins ignorent ce palier (cf. isBannerUnlocked).
 */
export interface BannerStyle {
  label: string;
  /** Dégradé CSS appliqué en `background`. */
  gradient: string;
  /** Niveau minimum pour débloquer (1 = disponible d'entrée). */
  requiredLevel: number;
}

export const BANNER_PALETTE = {
  default: {
    label: "Cursed Energy",
    gradient: "linear-gradient(120deg, #1b1b2b 0%, #5b21b6 60%, #7c3aed 100%)",
    requiredLevel: 1,
  },
  crimson: {
    label: "Sukuna",
    gradient: "linear-gradient(120deg, #1b1b2b 0%, #991b1b 55%, #dc2626 100%)",
    requiredLevel: 1,
  },
  infinity: {
    label: "Infinity",
    gradient: "linear-gradient(120deg, #0a0a0f 0%, #1e3a8a 55%, #38bdf8 100%)",
    requiredLevel: 3,
  },
  domain: {
    label: "Domain Expansion",
    gradient: "linear-gradient(120deg, #2e1065 0%, #7c3aed 55%, #a78bfa 100%)",
    requiredLevel: 5,
  },
  blackflash: {
    label: "Black Flash",
    gradient: "linear-gradient(120deg, #0a0a0f 0%, #26263a 50%, #f43f5e 100%)",
    requiredLevel: 8,
  },
  cursedrot: {
    label: "Cursed Rot",
    gradient: "linear-gradient(120deg, #14532d 0%, #166534 55%, #4ade80 100%)",
    requiredLevel: 11,
  },
  gold: {
    label: "Special Grade",
    gradient: "linear-gradient(120deg, #1b1b2b 0%, #b45309 55%, #f59e0b 100%)",
    requiredLevel: 15,
  },
  shadow: {
    label: "Ten Shadows",
    gradient: "linear-gradient(120deg, #000000 0%, #1b1b2b 55%, #6b7280 100%)",
    requiredLevel: 20,
  },
  abyss: {
    label: "Abyssal Void",
    gradient: "linear-gradient(120deg, #020617 0%, #1e1b4b 55%, #4338ca 100%)",
    requiredLevel: 26,
  },
  reverse: {
    label: "Reverse Cursed",
    gradient: "linear-gradient(120deg, #1b1b2b 0%, #be123c 50%, #fb7185 100%)",
    requiredLevel: 33,
  },
  maximum: {
    label: "Maximum Output",
    gradient: "linear-gradient(120deg, #022c22 0%, #0f766e 55%, #2dd4bf 100%)",
    requiredLevel: 41,
  },
  hollow: {
    label: "Hollow Purple",
    gradient: "linear-gradient(120deg, #1e1b4b 0%, #6d28d9 45%, #f43f5e 100%)",
    requiredLevel: MAX_LEVEL,
  },
} as const satisfies Record<string, BannerStyle>;

export type BannerKey = keyof typeof BANNER_PALETTE;

/** Garde de type : vrai si `k` est une clé valide de la palette. */
export function isBannerKey(k: unknown): k is BannerKey {
  return typeof k === "string" && Object.prototype.hasOwnProperty.call(BANNER_PALETTE, k);
}

/** Style d'une bannière, avec repli sur `default` si la clé est inconnue. */
export function bannerStyle(key: string | null | undefined): BannerStyle {
  return isBannerKey(key) ? BANNER_PALETTE[key] : BANNER_PALETTE.default;
}

/** Niveau requis d'une bannière (1 si la clé est inconnue). */
export function bannerRequiredLevel(key: string): number {
  return isBannerKey(key) ? BANNER_PALETTE[key].requiredLevel : 1;
}

/**
 * Vrai si la bannière est débloquée pour ce joueur. Anti-tamper : la clé doit
 * exister. Les admins ignorent le palier de niveau (bypass total).
 */
export function isBannerUnlocked(
  key: string,
  level: number,
  isAdmin = false,
): boolean {
  if (!isBannerKey(key)) return false;
  if (isAdmin) return true;
  return level >= BANNER_PALETTE[key].requiredLevel;
}
