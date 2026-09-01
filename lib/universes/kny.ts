import type { UniverseConfig } from "./types";

/**
 * Univers Kimetsu no Yaiba (Demon Slayer) — servi sous le préfixe `/kny`.
 *
 * Même forme exacte que `jjk.ts` / `csm.ts` / `aot.ts` : aucun code métier n'est
 * propre à un anime, un univers n'est QUE cette config (branding, palette,
 * libellés, SEO) plus des données taggées `universeId`, saisies via /admin.
 *
 * ⚠️ Le logo est un PLACEHOLDER (`public/logo-kny.svg`) : à remplacer par le
 * visuel définitif, sans rien changer d'autre ici que `logo.src`.
 */
export const kny: UniverseConfig = {
  slug: "kny",
  name: "KNY Arcade",
  // Titre ORIGINAL de l'œuvre : c'est lui qui s'insère dans les phrases du site
  // (« l'arcade Kimetsu no Yaiba », « mini-jeux Kimetsu no Yaiba gratuits ») et
  // dans le `isBasedOn` du JSON-LD. « Demon Slayer », plus cherché en France,
  // porte le SEO via `title`, `description` et `keywords`.
  sourceWork: "Kimetsu no Yaiba",
  title: "KNY Arcade — Mini-jeux Demon Slayer (Kimetsu no Yaiba)",
  description:
    "L'arcade fan dédiée à Demon Slayer : une collection de mini-jeux gratuits (devinette du jour, Qui est-ce ?, quiz, draft, tier list…) pour tester ta connaissance de l'univers Kimetsu no Yaiba. Sans compte, jouable dans le navigateur.",
  // Vestigial comme pour JJK, CSM et AOT : le routage se fait par préfixe de
  // chemin. Ne sert que de repli si un domaine dédié est branché un jour.
  domains: ["kny-arcade.com"],
  locale: "fr_FR",
  keywords: [
    "Demon Slayer",
    "Kimetsu no Yaiba",
    "KNY",
    "jeux Demon Slayer",
    "quiz Demon Slayer",
    "qui est-ce Demon Slayer",
    "tier list Demon Slayer",
    "jeux anime",
    "jeux anime gratuits",
    "Tanjiro",
    "Nezuko",
    "Zenitsu",
    "Inosuke",
    "Piliers",
  ],
  logo: {
    src: "/logo-kny.png",
    alt: "KNY Arcade",
  },
  // Palette du LOGO officiel : le rouge du cercle au pinceau (ensō), l'encre
  // noire et le papier. Rien d'autre — c'est une identité à trois couleurs, et
  // c'est ce qui la rend reconnaissable au premier coup d'œil.
  //
  // L'accent secondaire est donc un BLANC cassé (le papier), pas une couleur :
  // les éléments en `cursed-*` sortent en encre claire sur le noir, ce qui garde
  // le rouge seul porteur de couleur. Voulu.
  //
  // ⚠️ CSM est lui aussi rouge : la distinction se joue sur le secondaire (or
  // chaud là-bas, papier ici), sur des surfaces vraiment noires plutôt que
  // brunes, et sur un rouge plus vif et plus vermillon (#e0231b vs #d62828).
  theme: {
    primary: "#e0231b",
    primaryLight: "#ff5a4d",
    primaryDark: "#8c0f0a",
    accent: "#e7e5e4",
    accentLight: "#fafaf9",
    accentDark: "#78716c",
    surface: {
      DEFAULT: "#0a0708",
      s900: "#0a0708",
      s800: "#141011",
      s700: "#1e1819",
      s600: "#2b2223",
    },
    // Le halo secondaire est nettement plus discret que les autres univers : un
    // blanc à 0.45 d'opacité brûle l'écran là où un or ou un ocre tient.
    glow: "0 0 20px rgba(224, 35, 27, 0.45)",
    glowAccent: "0 0 20px rgba(231, 229, 228, 0.22)",
  },
  // Textes des jeux côté KNY : mêmes jeux, vocabulaire Demon Slayer. Bloc COMPLET
  // (les 8 jeux, description et tags inclus) — sans quoi le registre retomberait
  // sur ses valeurs par défaut, qui sont celles de JJK.
  //
  // `previewImage` suit la même règle : une capture montre le roster de l'anime,
  // celle du registre montre donc des persos JJK. Les 4 jeux sans capture KNY
  // (Hashira Draft, KNY Random Battle, Qui est-ce ?, KNY Codenames) gardent
  // temporairement celle de JJK — ajouter le PNG dans `public/assets/` puis le
  // champ ici dès que les visuels existent.
  gameCopy: {
    builder: {
      title: "Build the Perfect Slayer",
      description:
        "Compose ton pourfendeur idéal catégorie par catégorie. Chaque choix verrouille une stat et re-mélange le reste. Score sur 1000, du simple Mizunoto au rang de Pilier.",
      tags: ["tap game", "roster KNY", "score"],
      previewImage: "/assets/builder-kny.png",
    },
    ranking: {
      title: "KNY Pyramid",
      description:
        "Classe 8 personnages du plus fort au plus faible selon la consigne. Les bonnes positions se verrouillent, les fausses reviennent. 4 tentatives, jusqu'à 10 000 points.",
      tags: ["ranking", "drag & drop", "roster KNY"],
      previewImage: "/assets/pyramid-kny.png",
    },
    "jujutsu-draft": {
      title: "Hashira Draft",
      description:
        "Drafte 1 pourfendeur par catégorie sous budget, place chacun au bon poste, puis affronte une série de démons de plus en plus redoutables. Va le plus loin possible.",
      tags: ["draft", "combat", "roster KNY"],
    },
    battle: {
      title: "KNY Random Battle",
      description:
        "Affronte un ami en 1v1 : drafte une carte tirée au hasard à tour de rôle (garde-la ou refile-la), compose ton escouade de 5, puis laisse parler les lames Nichirin. Le cumul le plus fort gagne.",
      tags: ["1v1", "multijoueur", "draft", "roster KNY"],
      previewImage: "/assets/battle-screen-kny.png",
    },
    guesswho: {
      title: "Qui est-ce ?",
      description:
        "Affronte un ami en 1v1 : une grille de 25 personnages, un secret pour chacun. Pose des questions, élimine des cartes et devine le perso secret de l'adversaire avant lui. Un mauvais guess et c'est perdu.",
      tags: ["1v1", "multijoueur", "déduction", "roster KNY"],
      previewImage: "/assets/guesswho-kny.png",
    },
    codenames: {
      title: "KNY Codenames",
      description:
        "En équipe (4 à 6 joueurs, rouge vs violet) : les maîtres-espions donnent des indices, les agents révèlent les bons personnages d'une grille de 36. Évitez l'assassin, révélez vos 8 cartes avant l'équipe adverse.",
      tags: ["multijoueur", "2-6", "déduction", "roster KNY"],
    },
    jjkdle: {
      title: "KNYdle",
      description:
        "Devine le personnage Demon Slayer mystère du jour. Chaque proposition révèle des indices par attribut (espèce, souffle, grade, arc…) avec des flèches ↑/↓. Un perso par jour, essais illimités.",
      tags: ["quotidien", "déduction", "roster KNY"],
      previewImage: "/assets/idle-screen-kny.png",
    },
    "higher-lower": {
      title: "KNY Higher/Lower",
      description:
        "Plus ou moins puissant ? Compare deux personnages du roster, devine si celui de droite dépasse celui de gauche en puissance et enchaîne les bonnes réponses le plus loin possible.",
      tags: ["quickfire", "déduction", "roster KNY"],
      previewImage: "/assets/higher-lower-kny.png",
    },
    tower: {
      title: "La Forteresse Infinie",
      description:
        "Grimpe 20 étages avec une escouade de 3 que tu constitues en route. Les combats se résolvent seuls : à toi de déclencher les souffles au bon moment, quand un démon charge son attaque. Un mort reste mort.",
      tags: ["roguelike", "combat", "quotidien", "roster KNY"],
    },
  },
  // Higher/Lower compare la « Puissance » (attribut NUMERIC). KNY n'a pas
  // d'équivalent canonique de l'énergie occulte : l'échelle retenue est celle du
  // « CE » de kimetsudle.net (57 → 905 700), comme AOT reprend celle d'aotdle
  // (cf. lib/universes/kny-attributes.ts).
  // ⚠️ L'attribut `knypower` doit exister en base pour cet univers : sans lui, le
  // jeu n'a rien à comparer.
  higherLower: { attributeKey: "knypower" },
  /**
   * Tour de Demon Slayer.
   *
   * Demon Slayer n'a AUCUN attribut booléen : l'ultime s'ouvre donc sur le
   * GRADE, et le palier est le rang de Pilier — le seuil que l'œuvre elle-même
   * traite comme un changement de nature, pas de degré. Les Lunes Supérieures
   * le franchissent côté démons.
   */
  tower: {
    arcAttributeKey: "knyAppearanceArc",
    ultimateAttributeKey: "knyrank",
    ultimateAttributeValues: ["HASHIRA"],
    energyAttributeKey: "knypower",
    categoryArchetypes: {
      "kny-souffle": "technique",
      "kny-speed": "swift",
      "kny-lunes": "beast",
      "kny-battle-iq": "tactician",
      "kny-force-physique": "brute",
      "kny-pouvoir-sanguinaire": "channeler",
      "kny-piliers": "domain",
      "kny-nouvelle-generation": "adaptive",
      "kny-corps-des-pourfendeurs": "stalwart",
    },
  },
  labels: {
    tagline:
      "Une collection de mini-jeux nerveux pour tester ta connaissance de l'univers et graver ton nom au rang de Pilier.",
    arcadeLead: "La salle d'arcade au fil de la lame, dédiée à",
    ctaTitle: "Prêt à dégainer ta lame Nichirin ?",
    maintenanceTitle: "Affûtage des lames en cours",
    gamesHeading: "Les jeux du Souffle",
    gamesLead: "Choisis ton défi et pousse ta concentration à son maximum.",
    // 鬼 = démon (le 鬼 de Kimetsu no Yaiba).
    heroKanji: "鬼",
    // 鬼滅之刃 (le titre), 全集中 (concentration totale), 呼吸法 (technique de
    // respiration), 柱 (les Piliers).
    kanjiColumns: ["鬼滅之刃", "全集中", "呼吸法", "柱"],
  },
  booru: {
    seriesTag: "kimetsu_no_yaiba",
    // La clé de l'attribut de sexe est propre à l'univers (« gender » en JJK,
    // « csmgender » en CSM, « aotgender » en AOT) : ici « knygender ».
    filter: { attributeKey: "knygender", value: "FEMALE" },
  },
};
