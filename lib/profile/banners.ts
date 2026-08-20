import {
  ANY_UNIVERSE,
  isInUniverse,
  type UniverseScope,
} from "@/lib/cosmetics/universe";
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
  /** Univers propriétaire (multi-univers, étape 2d). `ANY_UNIVERSE` = neutre —
   * c'est le cas de `default`, qui est la valeur `@default` du schéma et doit
   * donc rester valide dans tous les univers. */
  universe: UniverseScope;
}

export const BANNER_PALETTE = {
  // Bannière NEUTRE (valeur `@default` du schéma) : son libellé ne doit porter
  // le vocabulaire d'aucune œuvre, elle s'affiche dans tous les univers.
  default: {
    label: "Standard",
    gradient: "linear-gradient(120deg, #1b1b2b 0%, #5b21b6 60%, #7c3aed 100%)",
    requiredLevel: 1,
    universe: ANY_UNIVERSE,
  },
  crimson: {
    label: "Sukuna",
    gradient: "linear-gradient(120deg, #1b1b2b 0%, #991b1b 55%, #dc2626 100%)",
    requiredLevel: 1,
    universe: "jjk",
  },
  infinity: {
    label: "Infinity",
    gradient: "linear-gradient(120deg, #0a0a0f 0%, #1e3a8a 55%, #38bdf8 100%)",
    requiredLevel: 3,
    universe: "jjk",
  },
  domain: {
    label: "Domain Expansion",
    gradient: "linear-gradient(120deg, #2e1065 0%, #7c3aed 55%, #a78bfa 100%)",
    requiredLevel: 5,
    universe: "jjk",
  },
  blackflash: {
    label: "Black Flash",
    gradient: "linear-gradient(120deg, #0a0a0f 0%, #26263a 50%, #f43f5e 100%)",
    requiredLevel: 8,
    universe: "jjk",
  },
  cursedrot: {
    label: "Cursed Rot",
    gradient: "linear-gradient(120deg, #14532d 0%, #166534 55%, #4ade80 100%)",
    requiredLevel: 11,
    universe: "jjk",
  },
  gold: {
    label: "Special Grade",
    gradient: "linear-gradient(120deg, #1b1b2b 0%, #b45309 55%, #f59e0b 100%)",
    requiredLevel: 15,
    universe: "jjk",
  },
  shadow: {
    label: "Ten Shadows",
    gradient: "linear-gradient(120deg, #000000 0%, #1b1b2b 55%, #6b7280 100%)",
    requiredLevel: 20,
    universe: "jjk",
  },
  abyss: {
    label: "Abyssal Void",
    gradient: "linear-gradient(120deg, #020617 0%, #1e1b4b 55%, #4338ca 100%)",
    requiredLevel: 26,
    universe: "jjk",
  },
  reverse: {
    label: "Reverse Cursed",
    gradient: "linear-gradient(120deg, #1b1b2b 0%, #be123c 50%, #fb7185 100%)",
    requiredLevel: 33,
    universe: "jjk",
  },
  maximum: {
    label: "Maximum Output",
    gradient: "linear-gradient(120deg, #022c22 0%, #0f766e 55%, #2dd4bf 100%)",
    requiredLevel: 41,
    universe: "jjk",
  },
  hollow: {
    label: "Hollow Purple",
    gradient: "linear-gradient(120deg, #1e1b4b 0%, #6d28d9 45%, #f43f5e 100%)",
    requiredLevel: MAX_LEVEL,
    universe: "jjk",
  },

  // ── Bannières CSM (mêmes paliers, palette sang & or) ──
  csmBlood: {
    label: "Sang & Tronçonneuse",
    gradient: "linear-gradient(120deg, #0c0908 0%, #8f1616 55%, #d62828 100%)",
    requiredLevel: 1,
    universe: "csm",
  },
  csmPochita: {
    label: "Pochita",
    gradient: "linear-gradient(120deg, #241a18 0%, #a37a00 50%, #ffd54a 100%)",
    requiredLevel: 3,
    universe: "csm",
  },
  csmContract: {
    label: "Contrat",
    gradient: "linear-gradient(120deg, #0c0908 0%, #4a3200 55%, #e8b100 100%)",
    requiredLevel: 5,
    universe: "csm",
  },
  csmGunDevil: {
    label: "Démon Pistolet",
    gradient: "linear-gradient(120deg, #0c0908 0%, #3f3f46 55%, #a1a1aa 100%)",
    requiredLevel: 8,
    universe: "csm",
  },
  csmBombDevil: {
    label: "Démon Bombe",
    gradient: "linear-gradient(120deg, #171110 0%, #9d174d 50%, #fb7185 100%)",
    requiredLevel: 11,
    universe: "csm",
  },
  csmPublicSafety: {
    label: "Sécurité Publique",
    gradient: "linear-gradient(120deg, #0c0908 0%, #1e293b 55%, #475569 100%)",
    requiredLevel: 15,
    universe: "csm",
  },
  csmDarkness: {
    label: "Démon Ténèbres",
    gradient: "linear-gradient(120deg, #000000 0%, #1a1327 55%, #4c1d95 100%)",
    requiredLevel: 20,
    universe: "csm",
  },
  csmHell: {
    label: "Enfer",
    gradient: "linear-gradient(120deg, #0c0908 0%, #7f1d1d 50%, #ea580c 100%)",
    requiredLevel: 26,
    universe: "csm",
  },
  csmControl: {
    label: "Démon Contrôle",
    gradient: "linear-gradient(120deg, #171110 0%, #6d28d9 50%, #e8b100 100%)",
    requiredLevel: 33,
    universe: "csm",
  },
  csmFuture: {
    label: "Démon Futur",
    gradient: "linear-gradient(120deg, #022c22 0%, #0f766e 55%, #5eead4 100%)",
    requiredLevel: 41,
    universe: "csm",
  },
  csmChainsawHeart: {
    label: "Cœur de Tronçonneuse",
    gradient: "linear-gradient(120deg, #0c0908 0%, #d62828 45%, #ffd54a 100%)",
    requiredLevel: MAX_LEVEL,
    universe: "csm",
  },

  // ── Bannières AOT (mêmes paliers, vert de cape & ocre des harnais) ──
  aotScout: {
    label: "Bataillon d'Exploration",
    gradient: "linear-gradient(120deg, #0a0b08 0%, #2f4c07 55%, #a3e635 100%)",
    requiredLevel: 1,
    universe: "aot",
  },
  aotWalls: {
    label: "Les Murs",
    gradient: "linear-gradient(120deg, #0a0b08 0%, #44403c 55%, #a8a29e 100%)",
    requiredLevel: 3,
    universe: "aot",
  },
  aotGarrison: {
    label: "Brigades Stationnaires",
    gradient: "linear-gradient(120deg, #1e2118 0%, #7c3d0a 55%, #f0b429 100%)",
    requiredLevel: 5,
    universe: "aot",
  },
  aotMilitaryPolice: {
    label: "Police Militaire",
    gradient: "linear-gradient(120deg, #0a0b08 0%, #1e3a8a 55%, #60a5fa 100%)",
    requiredLevel: 8,
    universe: "aot",
  },
  aotFemaleTitan: {
    label: "Titan Féminin",
    gradient: "linear-gradient(120deg, #141610 0%, #57534e 50%, #d6d3d1 100%)",
    requiredLevel: 11,
    universe: "aot",
  },
  aotArmored: {
    label: "Titan Cuirassé",
    gradient: "linear-gradient(120deg, #0a0b08 0%, #78350f 55%, #b45309 100%)",
    requiredLevel: 15,
    universe: "aot",
  },
  aotColossal: {
    label: "Titan Colossal",
    gradient: "linear-gradient(120deg, #141610 0%, #7f1d1d 50%, #fca5a5 100%)",
    requiredLevel: 20,
    universe: "aot",
  },
  aotMarley: {
    label: "Marley",
    gradient: "linear-gradient(120deg, #0a0b08 0%, #422006 55%, #a16207 100%)",
    requiredLevel: 26,
    universe: "aot",
  },
  aotJaegerist: {
    label: "Jägers",
    gradient: "linear-gradient(120deg, #000000 0%, #14532d 55%, #4d7c0f 100%)",
    requiredLevel: 33,
    universe: "aot",
  },
  aotFounding: {
    label: "Titan Originel",
    gradient: "linear-gradient(120deg, #0a0b08 0%, #3f3f46 45%, #fafaf9 100%)",
    requiredLevel: 41,
    universe: "aot",
  },
  aotRumbling: {
    label: "Grand Terrassement",
    gradient: "linear-gradient(120deg, #0a0b08 0%, #7c2d12 45%, #f0b429 100%)",
    requiredLevel: MAX_LEVEL,
    universe: "aot",
  },

  // ── Bannières KNY (mêmes paliers, rouge ensō & encre) ──
  knyEnso: {
    label: "Cercle d'Encre",
    gradient: "linear-gradient(120deg, #0a0708 0%, #8c0f0a 55%, #e0231b 100%)",
    requiredLevel: 1,
    universe: "kny",
  },
  knyCheckered: {
    label: "Damier",
    gradient: "linear-gradient(120deg, #0a0708 0%, #1e1819 50%, #e7e5e4 100%)",
    requiredLevel: 3,
    universe: "kny",
  },
  knyNichirin: {
    label: "Lame Nichirin",
    gradient: "linear-gradient(120deg, #141011 0%, #3f3f46 50%, #ff5a4d 100%)",
    requiredLevel: 5,
    universe: "kny",
  },
  knyWisteria: {
    label: "Glycine",
    gradient: "linear-gradient(120deg, #1e1b4b 0%, #6d28d9 55%, #c4b5fd 100%)",
    requiredLevel: 8,
    universe: "kny",
  },
  knyWaterBreathing: {
    label: "Souffle de l'Eau",
    gradient: "linear-gradient(120deg, #0a0708 0%, #0e7490 55%, #67e8f9 100%)",
    requiredLevel: 11,
    universe: "kny",
  },
  knyFlameBreathing: {
    label: "Souffle de la Flamme",
    gradient: "linear-gradient(120deg, #0a0708 0%, #9a3412 50%, #fb923c 100%)",
    requiredLevel: 15,
    universe: "kny",
  },
  knyThunderBreathing: {
    label: "Souffle de la Foudre",
    gradient: "linear-gradient(120deg, #141011 0%, #a16207 50%, #fde047 100%)",
    requiredLevel: 20,
    universe: "kny",
  },
  knyInsectBreathing: {
    label: "Souffle de l'Insecte",
    gradient: "linear-gradient(120deg, #1e1819 0%, #7e22ce 50%, #f0abfc 100%)",
    requiredLevel: 26,
    universe: "kny",
  },
  knyUpperMoon: {
    label: "Lune Supérieure",
    gradient: "linear-gradient(120deg, #000000 0%, #4c0519 55%, #be123c 100%)",
    requiredLevel: 33,
    universe: "kny",
  },
  knyInfinityCastle: {
    label: "Château de l'Infini",
    gradient: "linear-gradient(120deg, #0a0708 0%, #292524 50%, #78716c 100%)",
    requiredLevel: 41,
    universe: "kny",
  },
  knySunBreathing: {
    label: "Souffle du Soleil",
    gradient: "linear-gradient(120deg, #0a0708 0%, #e0231b 45%, #fbbf24 100%)",
    requiredLevel: MAX_LEVEL,
    universe: "kny",
  },
} as const satisfies Record<string, BannerStyle>;

export type BannerKey = keyof typeof BANNER_PALETTE;

/** Garde de type : vrai si `k` est une clé valide de la palette. */
export function isBannerKey(k: unknown): k is BannerKey {
  return typeof k === "string" && Object.prototype.hasOwnProperty.call(BANNER_PALETTE, k);
}

/**
 * Clés de bannière proposées dans un univers (neutres incluses) — catalogue
 * affiché par l'éditeur de profil.
 */
export function bannerKeysForUniverse(slug: string): BannerKey[] {
  return (Object.keys(BANNER_PALETTE) as BannerKey[]).filter((k) =>
    isInUniverse(BANNER_PALETTE[k].universe, slug),
  );
}

/**
 * Garde d'équipement multi-univers : la clé doit exister ET appartenir à
 * l'univers (ou être neutre). Orthogonal au déblocage par niveau
 * (`isBannerUnlocked`) : les deux sont vérifiés côté serveur.
 */
export function isBannerInUniverse(key: string, slug: string): boolean {
  return isBannerKey(key) && isInUniverse(BANNER_PALETTE[key].universe, slug);
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
