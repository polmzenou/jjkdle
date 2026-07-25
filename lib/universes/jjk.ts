import type { UniverseConfig } from "./types";

/**
 * Univers Jujutsu Kaisen — l'univers historique (et défaut) de la plateforme.
 *
 * Les valeurs reprennent à l'identique ce qui est aujourd'hui codé en dur dans
 * lib/seo/config.ts, tailwind.config.ts et components/Logo.tsx. Tant que ces
 * sources n'ont pas basculé sur le registre (étape 4), ce fichier n'est qu'une
 * copie inerte : il ne modifie aucun comportement.
 */
export const jjk: UniverseConfig = {
  slug: "jjk",
  name: "JJK Arcade",
  sourceWork: "Jujutsu Kaisen",
  title: "JJK Arcade — Mini-jeux Jujutsu Kaisen",
  description:
    "L'arcade fan dédiée à Jujutsu Kaisen : une collection de mini-jeux gratuits (JJKdle, Qui est-ce ?, quiz, draft, tier list…) pour tester ta connaissance de l'univers JJK. Sans compte, jouable dans le navigateur.",
  // jjk-arcade.com prévu ; l'URL Vercel actuelle et localhost servent au dev/preview
  // (à défaut de match, la résolution retombe sur DEFAULT_UNIVERSE, cf. registry).
  domains: ["jjk-arcade.com", "jjkdle-arcade.vercel.app", "localhost"],
  locale: "fr_FR",
  keywords: [
    "Jujutsu Kaisen",
    "JJK",
    "jeux Jujutsu Kaisen",
    "jeux JJK",
    "JJKdle",
    "wordle Jujutsu Kaisen",
    "quiz Jujutsu Kaisen",
    "qui est-ce Jujutsu Kaisen",
    "tier list JJK",
    "jeux anime",
    "jeux anime gratuits",
    "Gojo",
    "Sukuna",
    "Itadori",
  ],
  logo: {
    src: "/logo.png",
    alt: "JJK Arcade",
  },
  // Palette « Cursed Energy » (miroir de tailwind.config.ts).
  theme: {
    primary: "#7c3aed", // domain / violet « Domain Expansion »
    primaryLight: "#a78bfa",
    primaryDark: "#5b21b6",
    accent: "#dc2626", // cursed / rouge
    accentLight: "#f87171",
    accentDark: "#991b1b",
    surface: {
      DEFAULT: "#0a0a0f",
      s900: "#0a0a0f",
      s800: "#12121c",
      s700: "#1b1b2b",
      s600: "#26263a",
    },
    glow: "0 0 20px rgba(124, 58, 237, 0.45)",
    glowAccent: "0 0 20px rgba(220, 38, 38, 0.45)",
  },
  labels: {
    energyLabel: "Énergie occulte",
    tagline:
      "Une collection de mini-jeux nerveux pour tester ta connaissance de l'univers et libérer ton énergie maudite.",
  },
};
