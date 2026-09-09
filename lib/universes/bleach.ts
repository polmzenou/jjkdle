import type { UniverseConfig } from "./types";

/**
 * Univers Bleach — servi sous le préfixe `/bleach`.
 *
 * Même forme exacte que `jjk.ts` / `csm.ts` / `aot.ts` / `kny.ts` / `tg.ts` :
 * aucun code métier n'est propre à un anime, un univers n'est QUE cette config
 * (branding, palette, libellés, SEO) plus des données taggées `universeId`,
 * saisies via /admin.
 *
 * ⚠️ Le logo est un PLACEHOLDER (`public/logo-bleach.svg`) : à remplacer par le
 * visuel définitif, sans rien changer d'autre ici que `logo.src`.
 */
export const bleach: UniverseConfig = {
  slug: "bleach",
  name: "Bleach Arcade",
  // Titre ORIGINAL de l'œuvre : c'est lui qui s'insère dans les phrases du site
  // (« l'arcade Bleach », « mini-jeux Bleach gratuits ») et dans le `isBasedOn`
  // du JSON-LD. Ici titre original et titre français coïncident.
  sourceWork: "Bleach",
  title: "Bleach Arcade — Mini-jeux Bleach (ブリーチ)",
  description:
    "L'arcade fan dédiée à Bleach : une collection de mini-jeux gratuits (devinette du jour, Qui est-ce ?, quiz, draft, tier list…) pour tester ta connaissance de l'univers Bleach. Sans compte, jouable dans le navigateur.",
  // Vestigial comme pour les cinq autres univers : le routage se fait par
  // préfixe de chemin. Ne sert que de repli si un domaine dédié est branché.
  domains: ["bleach-arcade.com"],
  locale: "fr_FR",
  keywords: [
    "Bleach",
    "Bleach TYBW",
    "Thousand-Year Blood War",
    "Guerre Sanglante Millénaire",
    "jeux Bleach",
    "quiz Bleach",
    "qui est-ce Bleach",
    "tier list Bleach",
    "jeux anime",
    "jeux anime gratuits",
    "Ichigo",
    "Rukia",
    "Aizen",
    "shinigami",
    "bankai",
  ],
  logo: {
    src: "/logo-bleach.png",
    alt: "Bleach Arcade",
  },
  // Palette du LOGO officiel. Le wordmark « BLEACH » est MONOCHROME depuis 2001
  // (lettres blanc os cernées de noir, couleur de remplissage variable d'un tome
  // à l'autre) ; le seul élément durablement coloré de la marque est le rouge
  // sang du sous-titre 千年血戦篇 de la Guerre Sanglante Millénaire, sur fond noir.
  // D'où : blanc os + rouge sang + noir d'encre, et rien d'autre.
  //
  // ⚠️ Fidèle, mais c'est le QUATRIÈME univers rouge (CSM, KNY, TG, et l'accent
  // de JJK). Le blanc en primaire aurait été plus distinctif ET plus proche du
  // wordmark, mais il est INUTILISABLE ici : `bg-domain` est associé à
  // `text-white` dans ~150 endroits du code (boutons, pastilles), un primaire
  // clair y rendrait le texte invisible. Le rouge passe donc en primaire et le
  // blanc os en secondaire — la structure exacte de KNY. Les trois écarts qui
  // séparent les deux palettes, à préserver si l'une des deux bouge :
  //   · le rouge tire vers le CARMIN sombre (#a4161a) là où KNY est un vermillon
  //     orangé (#e0231b) et CSM un rouge sang clair (#d62828) ;
  //   · les surfaces sont un noir d'encre strictement NEUTRE, quand KNY tire sur
  //     le brun chaud, CSM sur le brun, TG sur le bleu ;
  //   · le halo primaire est plus serré (la marque est nette, pas incandescente).
  //
  // Alternative écartée mais assumée : passer en argent/acier monochrome
  // (primary #5b7189, accent rouge sang) — plus fidèle au wordmark et plus
  // distinctif face à KNY, mais une arcade nettement plus terne. Basculer
  // demande de réécrire ce seul bloc.
  theme: {
    primary: "#a4161a",
    primaryLight: "#e5383b",
    primaryDark: "#660708",
    accent: "#e6e2d8",
    accentLight: "#f8f6f0",
    accentDark: "#8c8578",
    surface: {
      DEFAULT: "#08080a",
      s900: "#08080a",
      s800: "#131316",
      s700: "#1d1d21",
      s600: "#2a2a30",
    },
    glow: "0 0 18px rgba(164, 22, 26, 0.45)",
    glowAccent: "0 0 20px rgba(230, 226, 216, 0.22)",
  },
  // Textes des jeux côté Bleach : mêmes jeux, vocabulaire Bleach. Bloc COMPLET
  // (les 9 jeux, description et tags inclus) — sans quoi le registre retomberait
  // sur ses valeurs par défaut, qui sont celles de JJK.
  //
  // `previewImage` suit la même règle : une capture montre le roster de l'anime,
  // celle du registre montre donc des persos JJK. AUCUNE capture Bleach n'existe
  // encore — les neuf jeux gardent temporairement celle de JJK. Ajouter le PNG
  // dans `public/assets/` (suffixe `-bleach`) puis le champ ici dès que les
  // visuels existent (garde-fou dans `bleach.test.ts`).
  gameCopy: {
    builder: {
      title: "Build the Perfect Shinigami",
      description:
        "Compose ton shinigami idéal catégorie par catégorie. Chaque choix verrouille une stat et re-mélange le reste. Score sur 1000, du simple élève de l'Académie au Capitaine-commandant.",
      tags: ["tap game", "roster Bleach", "score"],
      previewImage: "/assets/builder-bleach.png",
    },
    ranking: {
      title: "Bleach Pyramid",
      description:
        "Classe 8 personnages du plus fort au plus faible selon la consigne. Les bonnes positions se verrouillent, les fausses reviennent. 4 tentatives, jusqu'à 10 000 points.",
      tags: ["ranking", "drag & drop", "roster Bleach"],
      previewImage: "/assets/pyramid-bleach.png",
    },
    "jujutsu-draft": {
      title: "Zanpakutō Draft",
      description:
        "Drafte 1 personnage par catégorie sous budget, place chacun au bon poste, puis affronte une série d'adversaires de plus en plus redoutables. Va le plus loin possible.",
      tags: ["draft", "combat", "roster Bleach"],
    },
    battle: {
      title: "Bleach Random Battle",
      description:
        "Affronte un ami en 1v1 : drafte une carte tirée au hasard à tour de rôle (garde-la ou refile-la), compose ton escouade de 5, puis laisse parler les lames. Le cumul le plus fort gagne.",
      tags: ["1v1", "multijoueur", "draft", "roster Bleach"],
    },
    guesswho: {
      title: "Qui est-ce ?",
      description:
        "Affronte un ami en 1v1 : une grille de 25 personnages, un secret pour chacun. Pose des questions, élimine des cartes et devine le perso secret de l'adversaire avant lui. Un mauvais guess et c'est perdu.",
      tags: ["1v1", "multijoueur", "déduction", "roster Bleach"],
    },
    codenames: {
      title: "Bleach Codenames",
      description:
        "En équipe (4 à 6 joueurs, rouge vs violet) : les maîtres-espions donnent des indices, les agents révèlent les bons personnages d'une grille de 36. Évitez l'assassin, révélez vos 8 cartes avant l'équipe adverse.",
      tags: ["multijoueur", "2-6", "déduction", "roster Bleach"],
    },
    jjkdle: {
      title: "Bleachdle",
      description:
        "Devine le personnage Bleach mystère du jour. Chaque proposition révèle des indices par attribut (espèce, libération, rang, arc…) avec des flèches ↑/↓. Un perso par jour, essais illimités.",
      tags: ["quotidien", "déduction", "roster Bleach"],
      previewImage: "/assets/idle-bleach.png",
    },
    "higher-lower": {
      title: "Bleach Higher/Lower",
      description:
        "Plus ou moins de reiatsu ? Compare deux personnages du roster, devine si celui de droite dépasse celui de gauche en puissance et enchaîne les bonnes réponses le plus loin possible.",
      tags: ["quickfire", "déduction", "roster Bleach"],
      previewImage: "/assets/higher-lower-bleach.png",
    },
    tower: {
      title: "La Tour du Repentir",
      description:
        "Grimpe 20 étages avec une escouade de 3 que tu constitues en route. Les combats se résolvent seuls : à toi de déclencher les libérations au bon moment, quand un adversaire charge son attaque. Un mort reste mort.",
      tags: ["roguelike", "combat", "quotidien", "roster Bleach"],
    },
  },
  // Higher/Lower compare le « Reiatsu » (attribut NUMERIC), comme CSM, KNY et TG.
  // ⚠️ L'attribut `bleachpower` doit exister en base pour cet univers : sans lui,
  // le jeu n'a rien à comparer (cf. lib/universes/bleach-attributes.ts).
  higherLower: { attributeKey: "bleachpower" },
  /**
   * Tour de Bleach.
   *
   * Comme Demon Slayer et Tokyo Ghoul, Bleach n'a pas d'attribut booléen :
   * l'ultime s'ouvre sur une LISTE de valeurs de `bleachrelease`, l'attribut qui
   * porte la libération la plus haute d'un personnage.
   *
   * Les quatre valeurs retenues sont les libérations FINALES de chaque faction —
   * Bankai (shinigami), Resurrección et sa Segunda Etapa (arrancar), Vollständig
   * (quincy). Sont volontairement exclues : `SHIKAI`, qui est la libération de
   * base et que possède presque tout le roster ; `HOLLOWFICATION`, qui est un
   * masque cumulable et non un palier ; et `FULLBRING`, dont les porteurs sont
   * des humains sans équivalent de rang. Retirer `RESURRECCION` de la liste
   * priverait d'ultime TOUS les Espada — c'est la faute symétrique de celle
   * corrigée sur Tokyo Ghoul, où le grade CCG ne décrivait aucune goule.
   *
   * `ultimateName` est « Bankai » : c'est le mot que le public associe à l'idée
   * même de libération ultime dans Bleach, y compris devant un arrancar. Même
   * arbitrage que « Kakuja » côté TG.
   */
  tower: {
    arcAttributeKey: "bleachAppearanceArc",
    ultimateAttributeKey: "bleachrelease",
    ultimateAttributeValues: [
      "BANKAI",
      "RESURRECCION",
      "SEGUNDA_ETAPA",
      "VOLLSTANDIG",
    ],
    ultimateName: "Bankai",
    energyAttributeKey: "bleachpower",
    categoryArchetypes: {
      "bleach-zanpakuto": "technique",
      "bleach-vitesse": "swift",
      "bleach-hollows": "beast",
      "bleach-battle-iq": "tactician",
      "bleach-force-physique": "brute",
      "bleach-reiatsu": "channeler",
      "bleach-bankai": "domain",
      "bleach-kido": "adaptive",
      "bleach-endurance": "stalwart",
    },
  },
  labels: {
    tagline:
      "Une collection de mini-jeux nerveux pour tester ta connaissance de l'univers et trancher avant même d'avoir dégainé.",
    arcadeLead: "La salle d'arcade de la Soul Society, dédiée à",
    ctaTitle: "Prêt à libérer ton Bankai ?",
    maintenanceTitle: "Ouverture du Senkaimon en cours",
    gamesHeading: "Les jeux de la Soul Society",
    gamesLead: "Choisis ton défi et laisse ton reiatsu parler pour toi.",
    // 死 = la mort (le 死 de 死神, shinigami).
    heroKanji: "死",
    // 死神 (shinigami), 斬魄刀 (zanpakutō), 卍解 (bankai), 尸魂界 (Soul Society).
    kanjiColumns: ["死神", "斬魄刀", "卍解", "尸魂界"],
  },
  booru: {
    seriesTag: "bleach",
    // La clé de l'attribut de sexe est propre à l'univers (« gender » en JJK,
    // « tggender » en TG) : ici « bleachgender ».
    filter: { attributeKey: "bleachgender", value: "FEMALE" },
  },
};
