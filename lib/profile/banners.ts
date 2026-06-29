/**
 * Palette fermée de bannières de profil. Aucune valeur libre : l'utilisateur
 * choisit une CLÉ, le serveur valide qu'elle existe (anti-tamper) et le rendu
 * applique le dégradé correspondant. Cohérent avec le thème (domain/cursed/void).
 */
export interface BannerStyle {
  label: string;
  /** Dégradé CSS appliqué en `background`. */
  gradient: string;
}

export const BANNER_PALETTE = {
  default: {
    label: "Cursed Energy",
    gradient: "linear-gradient(120deg, #1b1b2b 0%, #5b21b6 60%, #7c3aed 100%)",
  },
  crimson: {
    label: "Sukuna",
    gradient: "linear-gradient(120deg, #1b1b2b 0%, #991b1b 55%, #dc2626 100%)",
  },
  infinity: {
    label: "Infinity",
    gradient: "linear-gradient(120deg, #0a0a0f 0%, #1e3a8a 55%, #38bdf8 100%)",
  },
  domain: {
    label: "Domain Expansion",
    gradient: "linear-gradient(120deg, #2e1065 0%, #7c3aed 55%, #a78bfa 100%)",
  },
  blackflash: {
    label: "Black Flash",
    gradient: "linear-gradient(120deg, #0a0a0f 0%, #26263a 50%, #f43f5e 100%)",
  },
  cursedrot: {
    label: "Cursed Rot",
    gradient: "linear-gradient(120deg, #14532d 0%, #166534 55%, #4ade80 100%)",
  },
  gold: {
    label: "Special Grade",
    gradient: "linear-gradient(120deg, #1b1b2b 0%, #b45309 55%, #f59e0b 100%)",
  },
  shadow: {
    label: "Ten Shadows",
    gradient: "linear-gradient(120deg, #000000 0%, #1b1b2b 55%, #6b7280 100%)",
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
