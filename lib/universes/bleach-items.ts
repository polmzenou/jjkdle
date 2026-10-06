import type { ItemSeed } from "./item-seed";

/**
 * Arsenal de Bleach — amorçage de « The Culling Tower ».
 *
 * Calque exact de `jjk-items.ts` : mêmes 24 emplacements, mêmes raretés, mêmes
 * effets, dans le même ordre (vérifié par `rewards.test.ts`). Seuls le nom, la
 * description et l'image changent.
 *
 * Images : wiki ANGLAIS (bleach.fandom.com), et non le wiki francophone qu'utilise
 * le roster : ses pages d'objets et de techniques sont bien mieux illustrées.
 * Orthographe des noms : ô/û comme le reste de l'univers (« Ryûken Ishida »).
 *
 * Beaucoup d'infobox y sont des GIF animés de 5 à 10 Mo que le wiki ne
 * redimensionne pas : une capture fixe est alors épinglée à la place.
 */
export const BLEACH_ITEMS: ItemSeed[] = [
  // ── Communs ────────────────────────────────────────────────────────────
  {
    slug: "zanpakuto",
    name: "Zanpakutô",
    description:
      "Le sabre qui reflète l'âme de son porteur. Il tranche mieux qu'il ne protège.",
    rarity: "COMMON",
    effectKind: "FRAPPE_PCT",
    effectValue: 12,
    effectKind2: "PV_MAX_PCT",
    effectValue2: -8,
    wikiImage: "Zanpakutō",
  },
  {
    slug: "bracelet-quincy",
    name: "Bracelet Quincy",
    description:
      "Il rassemble les particules des coups parés et les rend à celui qui a su viser juste.",
    rarity: "COMMON",
    effectKind: "CONTRE_GAIN",
    effectValue: 8,
    wikiImage: "Quincy Bangle",
  },
  {
    slug: "sekkiseki",
    name: "Sekkiseki",
    description:
      "La pierre qui bloque le reiatsu étouffe le premier élan d'un adversaire, le temps d'un souffle.",
    rarity: "COMMON",
    effectKind: "ANNULE_PREMIER_TELEGRAPHE",
    effectValue: 1,
    wikiImage: "Sekkiseki",
  },
  {
    slug: "gigai",
    name: "Gigai",
    description:
      "Un corps d'emprunt qui encaisse à ta place et convertit les premières blessures en énergie.",
    rarity: "COMMON",
    effectKind: "ABSORPTION",
    effectValue: 15,
    wikiImage: "Gigai",
  },
  {
    slug: "gikon",
    name: "Gikon",
    description: "Une pilule d'âme qui remet d'aplomb à mesure que les Hollows tombent.",
    rarity: "COMMON",
    effectKind: "SOIN_PAR_KILL_PCT",
    effectValue: 5,
    wikiImage: "Gikon",
  },
  {
    slug: "reishi",
    name: "Reishi",
    description: "Les particules spirituelles qui saturent l'air. Elles accélèrent la remontée d'énergie.",
    rarity: "COMMON",
    effectKind: "FLUX_PCT",
    effectValue: 15,
    wikiImage: { file: "Ep403LilleGathersReishi.png" },
  },
  {
    slug: "shunpo",
    name: "Shunpo",
    description: "Le pas éclair des Shinigami : chaque appui devient plus vif.",
    rarity: "COMMON",
    effectKind: "CELERITE_PCT",
    effectValue: 10,
    wikiImage: { file: "Ep42YoruichiBypassesByakuya.png" },
  },
  {
    slug: "ginto",
    name: "Gintô",
    description: "Un tube d'argent liquide chargé d'un sort, libéré dès le premier échange.",
    rarity: "COMMON",
    effectKind: "ENERGIE_DEPART",
    effectValue: 20,
    wikiImage: "Gintō",
  },
  {
    slug: "denreishinki",
    name: "Denreishinki",
    description: "Le téléphone des Shinigami. Il signale les Hollows — et les fragments qu'ils laissent derrière eux.",
    rarity: "COMMON",
    effectKind: "FRAGMENTS_PCT",
    effectValue: 25,
    wikiImage: "Denreishinki",
  },
  {
    slug: "cero",
    name: "Cero",
    description: "Un rayon de reiatsu concentré, chargé dans la paume avant l'assaut.",
    rarity: "COMMON",
    effectKind: "FRAPPE_PCT",
    effectValue: 10,
    wikiImage: { file: "271Ulquiorra's_Cero.png" },
  },
  {
    slug: "kido",
    name: "Kidô",
    description: "Une barrière incantée à la hâte. Elle endurcit sans jamais alourdir.",
    rarity: "COMMON",
    effectKind: "PV_MAX_PCT",
    effectValue: 12,
    wikiImage: { file: "Ep76RukiaKido.png" },
  },
  {
    slug: "gant-sanrei",
    name: "Gant Sanrei",
    description:
      "S'entraîner sous sa contrainte rend, une fois ôté, chaque technique un peu moins coûteuse.",
    rarity: "COMMON",
    effectKind: "COUT_TECHNIQUE",
    effectValue: -5,
    wikiImage: "Sanrei Glove",
  },

  // ── Rares ──────────────────────────────────────────────────────────────
  {
    slug: "blut",
    name: "Blut",
    description:
      "Le reishi coule dans les veines et durcit la peau : retourner la douleur en ressource.",
    rarity: "RARE",
    effectKind: "ABSORPTION",
    effectValue: 35,
    wikiImage: "Blut",
  },
  {
    slug: "papillon-de-l-enfer",
    name: "Papillon de l'Enfer",
    description:
      "Un messager noir qui annonce l'ennemi avant qu'il ne frappe. Ses intentions se lisent une éternité à l'avance.",
    rarity: "RARE",
    effectKind: "FENETRE_PCT",
    effectValue: 25,
    wikiImage: "Jigokuchō",
  },
  {
    slug: "soten-kisshun",
    name: "Sôten Kisshun",
    description:
      "Le bouclier qui rejette les événements eux-mêmes. Le premier des tiens à tomber se relève, une fois.",
    rarity: "RARE",
    effectKind: "REVIVE_UNE_FOIS",
    effectValue: 30,
    wikiImage: { file: "248Orihime_heals.png" },
  },
  {
    slug: "hirenkyaku",
    name: "Hirenkyaku",
    description: "Glisser sur un flux de reishi : tout dans la vitesse, rien dans la garde.",
    rarity: "RARE",
    effectKind: "CELERITE_PCT",
    effectValue: 20,
    effectKind2: "PV_MAX_PCT",
    effectValue2: -10,
    wikiImage: "Hirenkyaku",
  },
  {
    slug: "sklaverei",
    name: "Sklaverei",
    description: "Asservir tout le reishi alentour pour alimenter l'escouade sans discontinuer.",
    rarity: "RARE",
    effectKind: "FLUX_PCT",
    effectValue: 35,
    // Les infobox « Sklaverei » et « Quincy: Vollständig » du wiki sont croisées
    // (chacune montre l'autre technique) : fichiers épinglés.
    wikiImage: { file: "Ep389RobertSklaverei.png" },
  },
  {
    slug: "faim-de-hollow",
    name: "Faim de Hollow",
    description: "Elle se nourrit des âmes dévorées et recoud les chairs entre deux échanges.",
    rarity: "RARE",
    effectKind: "SOIN_PAR_KILL_PCT",
    effectValue: 10,
    wikiImage: { file: "Hollows_descending_from_the_sky.png" },
  },
  {
    slug: "hollowfication",
    name: "Hollowfication",
    description:
      "Le masque descend sur le visage : la puissance s'ouvre bien avant que le corps n'ait tout encaissé.",
    rarity: "RARE",
    effectKind: "ULTIME_SEUIL_PCT",
    effectValue: -25,
    wikiImage: { file: "222Ichigo's_Hollow_mask.png" },
  },
  {
    slug: "seele-schneider",
    name: "Seele Schneider",
    description: "Une lame qui découpe le reishi : chaque contre réussi renvoie une part de l'énergie du coup annulé.",
    rarity: "RARE",
    effectKind: "CONTRE_GAIN",
    effectValue: 18,
    wikiImage: "Seele Schneider",
  },

  // ── Épiques ────────────────────────────────────────────────────────────
  {
    slug: "hogyoku",
    name: "Hôgyoku",
    description:
      "Il exauce le désir de qui le porte. Une puissance qu'on ne garde pas impunément : elle attire aussi ce qui rôde.",
    rarity: "EPIC",
    effectKind: "FRAPPE_PCT",
    effectValue: 30,
    effectKind2: "ENNEMI_SUPP",
    effectValue2: 1,
    wikiImage: "Hōgyoku",
  },
  {
    slug: "letzt-stil",
    name: "Letzt Stil",
    description:
      "L'ultime forme Quincy : tu donnes tes pouvoirs, tu reçois tout d'un coup. Le marché ne se renégocie pas.",
    rarity: "EPIC",
    effectKind: "COUT_TECHNIQUE",
    effectValue: -18,
    effectKind2: "PV_MAX_PCT",
    effectValue2: -15,
    wikiImage: { file: "124Quincy_-_Letzt_Stil.png" },
  },
  {
    slug: "getsuga-tensho",
    name: "Getsuga Tenshô",
    description: "Le croc de lune céleste : la frappe et la vitesse d'un seul geste.",
    rarity: "EPIC",
    effectKind: "FRAPPE_PCT",
    effectValue: 25,
    effectKind2: "CELERITE_PCT",
    effectValue2: 15,
    wikiImage: { file: "Ep20GetsugaTenshō.png" },
  },
  {
    slug: "vollstandig",
    name: "Vollständig",
    description:
      "Des ailes de reishi pur : plus rien ne t'échappe, et l'énergie ne se gaspille plus jamais.",
    rarity: "EPIC",
    effectKind: "FENETRE_PCT",
    effectValue: 40,
    effectKind2: "FLUX_PCT",
    effectValue2: 25,
    wikiImage: { file: "Ep396UryuVollstandig.png" },
  },
];
