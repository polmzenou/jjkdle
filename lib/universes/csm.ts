import type { UniverseConfig } from "./types";

/**
 * Univers Chainsaw Man — servi sous le préfixe `/csm`.
 *
 * Même forme exacte que `jjk.ts` : aucun code métier n'est propre à un anime, un
 * univers n'est QUE cette config (branding, palette, libellés, SEO) plus des
 * données taggées `universeId`, saisies via /admin.
 *
 * ⚠️ Le logo est un PLACEHOLDER (`public/logo-csm.svg`) : à remplacer par le
 * visuel définitif, sans rien changer d'autre ici.
 */
export const csm: UniverseConfig = {
  slug: "csm",
  name: "CSM Arcade",
  sourceWork: "Chainsaw Man",
  title: "CSM Arcade — Mini-jeux Chainsaw Man",
  description:
    "L'arcade fan dédiée à Chainsaw Man : une collection de mini-jeux gratuits (devinette du jour, Qui est-ce ?, quiz, draft, tier list…) pour tester ta connaissance de l'univers CSM. Sans compte, jouable dans le navigateur.",
  // Vestigial comme pour JJK : le routage se fait par préfixe de chemin. Ne sert
  // que de repli si un domaine dédié est branché un jour.
  domains: ["csm-arcade.com"],
  locale: "fr_FR",
  keywords: [
    "Chainsaw Man",
    "CSM",
    "jeux Chainsaw Man",
    "quiz Chainsaw Man",
    "qui est-ce Chainsaw Man",
    "tier list Chainsaw Man",
    "jeux anime",
    "jeux anime gratuits",
    "Denji",
    "Power",
    "Makima",
    "Aki",
  ],
  logo: {
    src: "/logo-csm.svg",
    alt: "CSM Arcade",
  },
  // Palette « Blood & Chainsaw » : rouge sang en accent principal, or en
  // secondaire, surfaces noires légèrement chaudes.
  theme: {
    primary: "#d62828",
    primaryLight: "#f05545",
    primaryDark: "#8f1616",
    accent: "#e8b100",
    accentLight: "#ffd54a",
    accentDark: "#a37a00",
    surface: {
      DEFAULT: "#0c0908",
      s900: "#0c0908",
      s800: "#171110",
      s700: "#241a18",
      s600: "#332422",
    },
    glow: "0 0 20px rgba(214, 40, 40, 0.45)",
    glowAccent: "0 0 20px rgba(232, 177, 0, 0.45)",
  },
  // Noms des jeux côté CSM : mêmes jeux, vocabulaire Chainsaw Man. Les jeux non
  // listés (« Qui est-ce ? ») gardent leur titre neutre du registre.
  gameTitles: {
    builder: "Build the Perfect Devil",
    ranking: "CSM Pyramid",
    "jujutsu-draft": "Chainsaw Draft",
    battle: "CSM Random Battle",
    codenames: "CSM Codenames",
    jjkdle: "CSMdle",
    "higher-lower": "CSM Higher/Lower",
  },
  labels: {
    // Équivalent CSM de « Énergie occulte » : la jauge de puissance du monde.
    energyLabel: "Niveau de menace",
    tagline:
      "Une collection de mini-jeux nerveux pour tester ta connaissance de l'univers et faire hurler la tronçonneuse.",
  },
};
