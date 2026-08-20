import type { UniverseConfig } from "./types";

/**
 * Univers Attack on Titan — servi sous le préfixe `/aot`.
 *
 * Même forme exacte que `jjk.ts` / `csm.ts` : aucun code métier n'est propre à un
 * anime, un univers n'est QUE cette config (branding, palette, libellés, SEO)
 * plus des données taggées `universeId`, saisies via /admin.
 *
 * ⚠️ Le logo est un PLACEHOLDER (`public/logo-aot.png`) : à remplacer par le
 * visuel définitif, sans rien changer d'autre ici que `logo.src`.
 */
export const aot: UniverseConfig = {
  slug: "aot",
  name: "AOT Arcade",
  sourceWork: "Attack on Titan",
  title: "AOT Arcade — Mini-jeux Attack on Titan",
  description:
    "L'arcade fan dédiée à Attack on Titan : une collection de mini-jeux gratuits (devinette du jour, Qui est-ce ?, quiz, draft, tier list…) pour tester ta connaissance de l'univers AOT. Sans compte, jouable dans le navigateur.",
  // Vestigial comme pour JJK et CSM : le routage se fait par préfixe de chemin.
  // Ne sert que de repli si un domaine dédié est branché un jour.
  domains: ["aot-arcade.com"],
  locale: "fr_FR",
  keywords: [
    "Attack on Titan",
    "AOT",
    "Shingeki no Kyojin",
    "SNK",
    "jeux Attack on Titan",
    "quiz Attack on Titan",
    "qui est-ce Attack on Titan",
    "tier list Attack on Titan",
    "jeux anime",
    "jeux anime gratuits",
    "Eren",
    "Mikasa",
    "Levi",
    "Titan",
  ],
  logo: {
    src: "/logo-aot.png",
    alt: "AOT Arcade",
  },
  // Palette « Ailes de la Liberté » : vert de la cape du Bataillon d'exploration
  // en accent principal, ocre du cuir des harnais en secondaire, surfaces noires
  // légèrement terreuses (la pierre des Murs).
  theme: {
    primary: "#4d7c0f",
    primaryLight: "#a3e635",
    primaryDark: "#2f4c07",
    accent: "#b45309",
    accentLight: "#f0b429",
    accentDark: "#7c3d0a",
    surface: {
      DEFAULT: "#0a0b08",
      s900: "#0a0b08",
      s800: "#141610",
      s700: "#1e2118",
      s600: "#2b2e22",
    },
    // Le vert de cape est trop sombre pour se voir sur un fond quasi noir : le
    // halo est tiré de `primaryLight`, contrairement à JJK/CSM dont l'accent
    // principal est déjà lumineux.
    glow: "0 0 20px rgba(163, 230, 53, 0.40)",
    glowAccent: "0 0 20px rgba(180, 83, 9, 0.45)",
  },
  // Textes des jeux côté AOT : mêmes jeux, vocabulaire Attack on Titan. Bloc
  // COMPLET (les 8 jeux, description et tags inclus) — sans quoi le registre
  // retomberait sur ses valeurs par défaut, qui sont celles de JJK.
  //
  // `previewImage` suit la même règle : une capture montre le roster de l'anime,
  // celle du registre montre donc des persos JJK. Les 4 jeux sans capture AOT
  // (Scout Draft, AOT Random Battle, Qui est-ce ?, AOT Codenames) gardent
  // temporairement celle de JJK — ajouter le PNG dans `public/assets/` puis le
  // champ ici dès que les visuels existent.
  gameCopy: {
    builder: {
      title: "Build the Perfect Soldier",
      description:
        "Compose ton soldat idéal catégorie par catégorie. Chaque choix verrouille une stat et re-mélange le reste. Score sur 1000, de la simple recrue au rang S.",
      tags: ["tap game", "roster AOT", "score"],
      previewImage: "/assets/builder-aot.png",
    },
    ranking: {
      title: "AOT Pyramid",
      description:
        "Classe 8 personnages du plus fort au plus faible selon la consigne. Les bonnes positions se verrouillent, les fausses reviennent. 4 tentatives, jusqu'à 10 000 points.",
      tags: ["ranking", "drag & drop", "roster AOT"],
      previewImage: "/assets/pyramid-aot.png",
    },
    "jujutsu-draft": {
      title: "Scout Draft",
      description:
        "Drafte 1 soldat par catégorie sous budget, place chacun au bon poste, puis affronte une série de titans de plus en plus colossaux. Va le plus loin possible.",
      tags: ["draft", "combat", "roster AOT"],
    },
    battle: {
      title: "AOT Random Battle",
      description:
        "Affronte un ami en 1v1 : drafte une carte tirée au hasard à tour de rôle (garde-la ou refile-la), compose ton escouade de 5, puis laisse parler les lames. Le cumul le plus fort gagne.",
      tags: ["1v1", "multijoueur", "draft", "roster AOT"],
    },
    guesswho: {
      title: "Qui est-ce ?",
      description:
        "Affronte un ami en 1v1 : une grille de 25 personnages, un secret pour chacun. Pose des questions, élimine des cartes et devine le perso secret de l'adversaire avant lui. Un mauvais guess et c'est perdu.",
      tags: ["1v1", "multijoueur", "déduction", "roster AOT"],
    },
    codenames: {
      title: "AOT Codenames",
      description:
        "En équipe (4 à 6 joueurs, rouge vs violet) : les maîtres-espions donnent des indices, les agents révèlent les bons personnages d'une grille de 36. Évitez l'assassin, révélez vos 8 cartes avant l'équipe adverse.",
      tags: ["multijoueur", "2-6", "déduction", "roster AOT"],
    },
    jjkdle: {
      title: "AOTdle",
      description:
        "Devine le personnage Attack on Titan mystère du jour. Chaque proposition révèle des indices par attribut (espèce, bataillon, pouvoir de titan, arc…) avec des flèches ↑/↓. Un perso par jour, essais illimités.",
      tags: ["quotidien", "déduction", "roster AOT"],
      previewImage: "/assets/idle-screen-aot.png",
    },
    "higher-lower": {
      title: "AOT Higher/Lower",
      description:
        "Plus ou moins puissant ? Compare deux personnages du roster, devine si celui de droite dépasse celui de gauche en puissance et enchaîne les bonnes réponses le plus loin possible.",
      tags: ["quickfire", "déduction", "roster AOT"],
      previewImage: "/assets/higher-lower-aot.png",
    },
  },
  // Higher/Lower compare la « Puissance » (attribut ORDINAL) plutôt qu'une jauge
  // chiffrée — AOT n'a pas d'équivalent de l'énergie occulte. Les ex æquo de rang
  // sont départagés par `battleValue` (cf. lib/games/higher-lower).
  // ⚠️ L'attribut `aotpower` doit exister en base pour cet univers (créé via
  // /admin) : sans lui, le jeu n'a rien à comparer.
  higherLower: { attributeKey: "aotpower" },
  labels: {
    tagline:
      "Une collection de mini-jeux nerveux pour tester ta connaissance de l'univers et mériter tes ailes de la liberté.",
    arcadeLead: "La salle d'arcade derrière les Murs, dédiée à",
    ctaTitle: "Prêt à franchir les Murs ?",
    maintenanceTitle: "Réparation des Murs en cours",
    gamesHeading: "Les jeux du Bataillon",
    gamesLead: "Choisis ton défi et offre ton cœur.",
    // 進 = avancer (le 進 de Shingeki no Kyojin).
    heroKanji: "進",
    // 進撃之巨人 (le titre), 自由之翼 (les ailes de la liberté), 調査兵団 (le
    // Bataillon d'exploration), 心臓を捧げよ → 献身 (offrir son cœur).
    kanjiColumns: ["進撃巨人", "自由之翼", "調査兵団", "献身"],
  },
  booru: {
    seriesTag: "shingeki_no_kyojin",
    // La clé de l'attribut de sexe est propre à l'univers (« gender » en JJK,
    // « csmgender » en CSM) : ici « aotgender », à créer via /admin comme le
    // reste des attributs AOT.
    filter: { attributeKey: "aotgender", value: "FEMALE" },
  },
};
