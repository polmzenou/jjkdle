import type { UniverseConfig } from "./types";

/**
 * Univers Jujutsu Kaisen — l'univers historique (et défaut) de la plateforme.
 *
 * Il est servi sous le préfixe `/jjk` (branding, thème, SEO et libellés viennent
 * tous d'ici). Ajouter un anime = un fichier voisin de même forme, ajouté à
 * `UNIVERSES` dans registry.ts, plus une ligne `Universe` en base
 * (`npx tsx scripts/seed-universe.ts <slug>`).
 */
export const jjk: UniverseConfig = {
  slug: "jjk",
  name: "JJK Arcade",
  sourceWork: "Jujutsu Kaisen",
  title: "JJK Arcade — Mini-jeux Jujutsu Kaisen",
  description:
    "L'arcade fan dédiée à Jujutsu Kaisen : une collection de mini-jeux gratuits (JJKdle, Qui est-ce ?, quiz, draft, tier list…) pour tester ta connaissance de l'univers JJK. Sans compte, jouable dans le navigateur.",
  // Le routage se fait par PRÉFIXE DE CHEMIN, pas par domaine : ce champ ne sert
  // plus qu'à deux choses — repli si un jour un domaine dédié est branché sur
  // l'app, et URL canonique de dernier recours en rendu statique.
  domains: ["jjk-arcade.com"],
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
    tagline:
      "Une collection de mini-jeux nerveux pour tester ta connaissance de l'univers et libérer ton énergie maudite.",
    // Ces cinq libellés étaient EN DUR dans `app/[universe]/page.tsx` et
    // `app/[universe]/games/page.tsx` : ils y sont repris à l'identique, pour que
    // la landing JJK reste mot pour mot ce qu'elle était.
    arcadeLead: "La salle d'arcade maudite dédiée à",
    ctaTitle: "Prêt à libérer ton énergie maudite ?",
    maintenanceTitle: "Extension de Territoire en cours",
    gamesHeading: "Les jeux maudits",
    gamesLead: "Choisis ton défi et libère ton énergie maudite.",
    heroKanji: "呪",
    kanjiColumns: ["呪術廻", "領域展開", "無量空処", "両面宿儺"],
  },
  // L'ofuda et le sceau d'asservissement de la landing : dessinés pour JJK, ils
  // ne s'affichent donc que sur cet univers.
  decorArtwork: "jjk-cursed-objects",
  booru: {
    seriesTag: "jujutsu_kaisen",
    // Filtre historique du bouton « OUAIS » : uniquement les persos féminins.
    filter: { attributeKey: "gender", value: "FEMALE" },
  },
};
