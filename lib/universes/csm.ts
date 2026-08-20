import type { UniverseConfig } from "./types";

/**
 * Univers Chainsaw Man — servi sous le préfixe `/csm`.
 *
 * Même forme exacte que `jjk.ts` : aucun code métier n'est propre à un anime, un
 * univers n'est QUE cette config (branding, palette, libellés, SEO) plus des
 * données taggées `universeId`, saisies via /admin.
 *
 * ⚠️ Le logo est un PLACEHOLDER (`public/logo-csm.png`) : à remplacer par le
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
    src: "/logo-csm.png",
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
  // Textes des jeux côté CSM : mêmes jeux, vocabulaire Chainsaw Man. Bloc
  // COMPLET (les 8 jeux, description et tags inclus) — sans quoi le registre
  // retomberait sur ses valeurs par défaut, qui sont celles de JJK.
  //
  // `previewImage` suit la même règle : une capture montre le roster de l'anime,
  // celle du registre montre donc des persos JJK. Les jeux sans capture CSM
  // (Chainsaw Draft, CSM Codenames) gardent temporairement celle de JJK : y
  // ajouter `/assets/draft-screen-csm.png` / `codenames-screen-csm.png` dès que
  // les visuels existent.
  gameCopy: {
    builder: {
      title: "Build the Perfect Devil",
      description:
        "Compose ton démon idéal catégorie par catégorie. Chaque choix verrouille une stat et re-mélange le reste. Score sur 1000, du rang le plus bas au rang S.",
      tags: ["tap game", "roster CSM", "score"],
      previewImage: "/assets/builder-screen-csm.png",
    },
    ranking: {
      title: "CSM Pyramid",
      description:
        "Classe 8 personnages du plus fort au plus faible selon la consigne. Les bonnes positions se verrouillent, les fausses reviennent. 4 tentatives, jusqu'à 10 000 points.",
      tags: ["ranking", "drag & drop", "roster CSM"],
      previewImage: "/assets/pyramid-screen-csm.png",
    },
    "jujutsu-draft": {
      title: "Chainsaw Draft",
      description:
        "Drafte 1 chasseur par catégorie sous budget, place chacun au bon poste, puis affronte une série de démons de plus en plus féroces. Va le plus loin possible.",
      tags: ["draft", "combat", "roster CSM"],
    },
    battle: {
      title: "CSM Random Battle",
      description:
        "Affronte un ami en 1v1 : drafte une carte tirée au hasard à tour de rôle (garde-la ou refile-la), compose ton équipe de 5, puis laisse parler la tronçonneuse. Le cumul le plus fort gagne.",
      tags: ["1v1", "multijoueur", "draft", "roster CSM"],
      previewImage: "/assets/battle-screen-csm.png",
    },
    guesswho: {
      title: "Qui est-ce ?",
      description:
        "Affronte un ami en 1v1 : une grille de 25 personnages, un secret pour chacun. Pose des questions, élimine des cartes et devine le perso secret de l'adversaire avant lui. Un mauvais guess et c'est perdu.",
      tags: ["1v1", "multijoueur", "déduction", "roster CSM"],
      previewImage: "/assets/guesswho-screen-csm.png",
    },
    codenames: {
      title: "CSM Codenames",
      description:
        "En équipe (4 à 6 joueurs, rouge vs violet) : les maîtres-espions donnent des indices, les agents révèlent les bons personnages d'une grille de 36. Évitez l'assassin, révélez vos 8 cartes avant l'équipe adverse.",
      tags: ["multijoueur", "2-6", "déduction", "roster CSM"],
    },
    jjkdle: {
      title: "CSMdle",
      description:
        "Devine le personnage Chainsaw Man mystère du jour. Chaque proposition révèle des indices par attribut (espèce, camp, contrat, arc…) avec des flèches ↑/↓. Un perso par jour, essais illimités.",
      tags: ["quotidien", "déduction", "roster CSM"],
      previewImage: "/assets/idle-screen-csm.png",
    },
    "higher-lower": {
      title: "CSM Higher/Lower",
      description:
        "Plus ou moins puissant ? Compare deux personnages du roster, devine si celui de droite dépasse celui de gauche en puissance et enchaîne les bonnes réponses le plus loin possible.",
      tags: ["quickfire", "déduction", "roster CSM"],
      previewImage: "/assets/higher-lower-screen-csm.png",
    },
  },
  // Higher/Lower compare la « Puissance » (attribut ORDINAL : Minimum → Surpuissant)
  // plutôt qu'une jauge chiffrée — CSM n'a pas d'équivalent de l'énergie occulte.
  // Les ex æquo de rang sont départagés par `battleValue` (cf. lib/games/higher-lower).
  higherLower: { attributeKey: "csmpower" },
  labels: {
    tagline:
      "Une collection de mini-jeux nerveux pour tester ta connaissance de l'univers et faire hurler la tronçonneuse.",
    arcadeLead: "La salle d'arcade la plus sanglante, dédiée à",
    ctaTitle: "Prêt à tirer sur la corde ?",
    maintenanceTitle: "Révision de la tronçonneuse en cours",
    gamesHeading: "Les jeux des démons",
    gamesLead: "Choisis ton défi et fais hurler la tronçonneuse.",
    // 鬼 = démon, le motif central de Chainsaw Man.
    heroKanji: "鬼",
    // 電気鋸人 (l'homme-tronçonneuse), 悪魔 (démon), 公安 (Sécurité publique),
    // 契約 (contrat).
    kanjiColumns: ["電気鋸人", "悪魔", "公安", "契約"],
  },
  booru: {
    seriesTag: "chainsaw_man",
    // La clé de l'attribut de sexe est propre à l'univers : « csmgender » ici,
    // « gender » en JJK. Un `gender` codé en dur ne trouvait donc personne.
    filter: { attributeKey: "csmgender", value: "FEMALE" },
  },
};
