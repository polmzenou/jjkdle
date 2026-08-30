import type { UniverseConfig } from "./types";

/**
 * Univers Tokyo Ghoul — servi sous le préfixe `/tg`.
 *
 * Même forme exacte que `jjk.ts` / `csm.ts` / `aot.ts` / `kny.ts` : aucun code
 * métier n'est propre à un anime, un univers n'est QUE cette config (branding,
 * palette, libellés, SEO) plus des données taggées `universeId`, saisies via
 * /admin.
 *
 * ⚠️ Le logo est un PLACEHOLDER (`public/logo-tg.png`) : à remplacer par le
 * visuel définitif, sans rien changer d'autre ici que `logo.src`.
 */
export const tg: UniverseConfig = {
  slug: "tg",
  name: "TG Arcade",
  // Titre ORIGINAL de l'œuvre : c'est lui qui s'insère dans les phrases du site
  // (« l'arcade Tokyo Ghoul », « mini-jeux Tokyo Ghoul gratuits ») et dans le
  // `isBasedOn` du JSON-LD. Ici titre original et titre français coïncident.
  sourceWork: "Tokyo Ghoul",
  title: "TG Arcade — Mini-jeux Tokyo Ghoul (東京喰種)",
  description:
    "L'arcade fan dédiée à Tokyo Ghoul : une collection de mini-jeux gratuits (devinette du jour, Qui est-ce ?, quiz, draft, tier list…) pour tester ta connaissance de l'univers Tokyo Ghoul. Sans compte, jouable dans le navigateur.",
  // Vestigial comme pour JJK, CSM, AOT et KNY : le routage se fait par préfixe de
  // chemin. Ne sert que de repli si un domaine dédié est branché un jour.
  domains: ["tg-arcade.com"],
  locale: "fr_FR",
  keywords: [
    "Tokyo Ghoul",
    "TG",
    "Tokyo Kushu",
    "Tokyo Ghoul re",
    "jeux Tokyo Ghoul",
    "quiz Tokyo Ghoul",
    "qui est-ce Tokyo Ghoul",
    "tier list Tokyo Ghoul",
    "jeux anime",
    "jeux anime gratuits",
    "Kaneki",
    "Touka",
    "Rize",
    "goules",
  ],
  logo: {
    src: "/logo-tg.png",
    alt: "TG Arcade",
  },
  // Palette du LOGO officiel : le wordmark blanc/rouge sur noir, dédoublé par
  // l'aberration chromatique rouge ↔ cyan qui est LA signature graphique de la
  // série (même effet sur les jaquettes et les cartons de l'anime).
  //
  // ⚠️ Trois univers sont déjà rouges (CSM, KNY, et l'accent de JJK) : la
  // distinction se joue ici sur le SECONDAIRE et sur les surfaces.
  //   · CSM  = rouge + or chaud sur un noir brun ;
  //   · KNY  = rouge + papier sur un noir vraiment noir ;
  //   · TG   = rouge cramoisi + cyan FROID sur un noir bleuté (le Tokyo nocturne).
  // Le rouge lui-même est plus cramoisi/rosé (#c8102e) que le vermillon de KNY
  // (#e0231b) ou le rouge sang de CSM (#d62828).
  //
  // Le cyan n'est pas décoratif : c'est la moitié « froide » du dédoublement du
  // logo, et c'est ce qui empêche cet univers de ressembler à un clone de KNY.
  // Pour revenir à une identité strictement rouge/blanc/noir, il suffit de
  // remplacer les trois `accent*` par un gris de papier — rien d'autre à toucher.
  theme: {
    primary: "#c8102e",
    primaryLight: "#ff3355",
    primaryDark: "#7a0316",
    accent: "#22d3ee",
    accentLight: "#67e8f9",
    accentDark: "#0e7490",
    surface: {
      DEFAULT: "#07090d",
      s900: "#07090d",
      s800: "#0f131a",
      s700: "#171c26",
      s600: "#232a36",
    },
    glow: "0 0 20px rgba(200, 16, 46, 0.45)",
    glowAccent: "0 0 20px rgba(34, 211, 238, 0.35)",
  },
  // Textes des jeux côté TG : mêmes jeux, vocabulaire Tokyo Ghoul. Bloc COMPLET
  // (les 8 jeux, description et tags inclus) — sans quoi le registre retomberait
  // sur ses valeurs par défaut, qui sont celles de JJK.
  //
  // `previewImage` suit la même règle : une capture montre le roster de l'anime,
  // celle du registre montre donc des persos JJK. Les 4 jeux sans capture TG
  // (Kagune Draft, TG Random Battle, Qui est-ce ?, TG Codenames) gardent
  // temporairement celle de JJK — ajouter le PNG dans `public/assets/`
  // (suffixe `-tg`) puis le champ ici dès que les visuels existent (garde-fou
  // dans `tg.test.ts`).
  gameCopy: {
    builder: {
      title: "Build the Perfect Ghoul",
      description:
        "Compose ta goule idéale catégorie par catégorie. Chaque choix verrouille une stat et re-mélange le reste. Score sur 1000, de la simple menace de classe C au rang SSS.",
      tags: ["tap game", "roster TG", "score"],
      previewImage: "/assets/builder-tg.png",
    },
    ranking: {
      title: "TG Pyramid",
      description:
        "Classe 8 personnages du plus fort au plus faible selon la consigne. Les bonnes positions se verrouillent, les fausses reviennent. 4 tentatives, jusqu'à 10 000 points.",
      tags: ["ranking", "drag & drop", "roster TG"],
      previewImage: "/assets/pyramid-tg.png",
    },
    "jujutsu-draft": {
      title: "Kagune Draft",
      description:
        "Drafte 1 personnage par catégorie sous budget, place chacun au bon poste, puis affronte une série d'adversaires de plus en plus redoutables. Va le plus loin possible.",
      tags: ["draft", "combat", "roster TG"],
    },
    battle: {
      title: "TG Random Battle",
      description:
        "Affronte un ami en 1v1 : drafte une carte tirée au hasard à tour de rôle (garde-la ou refile-la), compose ton escouade de 5, puis laisse parler les kagune. Le cumul le plus fort gagne.",
      tags: ["1v1", "multijoueur", "draft", "roster TG"],
      previewImage: "/assets/battle-screen-tg.png",
    },
    guesswho: {
      title: "Qui est-ce ?",
      description:
        "Affronte un ami en 1v1 : une grille de 25 personnages, un secret pour chacun. Pose des questions, élimine des cartes et devine le perso secret de l'adversaire avant lui. Un mauvais guess et c'est perdu.",
      tags: ["1v1", "multijoueur", "déduction", "roster TG"],
      previewImage: "/assets/guesswho-tg.png",
    },
    codenames: {
      title: "TG Codenames",
      description:
        "En équipe (4 à 6 joueurs, rouge vs violet) : les maîtres-espions donnent des indices, les agents révèlent les bons personnages d'une grille de 36. Évitez l'assassin, révélez vos 8 cartes avant l'équipe adverse.",
      tags: ["multijoueur", "2-6", "déduction", "roster TG"],
    },
    jjkdle: {
      title: "TGdle",
      description:
        "Devine le personnage Tokyo Ghoul mystère du jour. Chaque proposition révèle des indices par attribut (espèce, kagune, classement, arc…) avec des flèches ↑/↓. Un perso par jour, essais illimités.",
      tags: ["quotidien", "déduction", "roster TG"],
      previewImage: "/assets/idle-screen-tg.png",
    },
    "higher-lower": {
      title: "TG Higher/Lower",
      description:
        "Plus ou moins puissant ? Compare deux personnages du roster, devine si celui de droite dépasse celui de gauche en puissance et enchaîne les bonnes réponses le plus loin possible.",
      tags: ["quickfire", "déduction", "roster TG"],
      previewImage: "/assets/higher-lower-tg.png",
    },
    tower: {
      title: "La Tour de Cochlea",
      description:
        "Grimpe 20 étages avec une escouade de 3 que tu constitues en route. Les combats se résolvent seuls : à toi de déclencher les kagune au bon moment, quand un adversaire charge son attaque. Un mort reste mort.",
      tags: ["roguelike", "combat", "quotidien", "roster TG"],
    },
  },
  // Higher/Lower compare la « Puissance » (attribut NUMERIC), comme CSM et KNY.
  // ⚠️ L'attribut `tgpower` doit exister en base pour cet univers : sans lui, le
  // jeu n'a rien à comparer (cf. lib/universes/tg-attributes.ts).
  higherLower: { attributeKey: "tgpower" },
  labels: {
    tagline:
      "Une collection de mini-jeux nerveux pour tester ta connaissance de l'univers et t'imposer dans le 20e arrondissement.",
    arcadeLead: "La salle d'arcade du 20e arrondissement, dédiée à",
    ctaTitle: "Prêt à révéler ton kakugan ?",
    maintenanceTitle: "Ratissage du secteur en cours",
    gamesHeading: "Les jeux du 20e arrondissement",
    gamesLead: "Choisis ton défi et laisse ton instinct prendre le dessus.",
    // 喰 = dévorer (le 喰 de 東京喰種).
    heroKanji: "喰",
    // 東京喰種 (le titre), 赫子 (kagune), 隻眼 (le Borgne / à un œil),
    // 二十区 (le 20e arrondissement).
    kanjiColumns: ["東京喰種", "赫子", "隻眼", "二十区"],
  },
  booru: {
    seriesTag: "tokyo_ghoul",
    // La clé de l'attribut de sexe est propre à l'univers (« gender » en JJK,
    // « knygender » en KNY) : ici « tggender ».
    filter: { attributeKey: "tggender", value: "FEMALE" },
  },
};
