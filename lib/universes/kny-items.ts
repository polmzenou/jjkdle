import type { ItemSeed } from "./item-seed";

/**
 * Arsenal de Demon Slayer — amorçage de « The Culling Tower ».
 *
 * Calque exact de `jjk-items.ts` : mêmes 24 emplacements, mêmes raretés, mêmes
 * effets, dans le même ordre (vérifié par `rewards.test.ts`). Seuls le nom, la
 * description et l'image changent.
 *
 * Images : wiki anglais (kimetsu-no-yaiba.fandom.com).
 */
export const KNY_ITEMS: ItemSeed[] = [
  // ── Communs ────────────────────────────────────────────────────────────
  {
    slug: "lame-nichirin",
    name: "Lame Nichirin",
    description:
      "Forgée dans un acier qui absorbe le soleil. Elle tranche mieux qu'elle ne protège.",
    rarity: "COMMON",
    effectKind: "FRAPPE_PCT",
    effectValue: 12,
    effectKind2: "PV_MAX_PCT",
    effectValue2: -8,
    wikiImage: { file: "Tanjiro's_Nichirin_Sword.png" },
  },
  {
    slug: "corbeau-kasugai",
    name: "Corbeau Kasugai",
    description:
      "Un messager qui croasse l'ordre suivant à celui qui a su parer au bon moment.",
    rarity: "COMMON",
    effectKind: "CONTRE_GAIN",
    effectValue: 8,
    wikiImage: "Kasugai Crow",
  },
  {
    slug: "fleur-de-glycine",
    name: "Fleur de glycine",
    description:
      "Les démons ne supportent pas son parfum : leur premier élan s'étouffe, le temps d'un souffle.",
    rarity: "COMMON",
    effectKind: "ANNULE_PREMIER_TELEGRAPHE",
    effectValue: 1,
    wikiImage: "Wisteria",
  },
  {
    slug: "masque-protecteur",
    name: "Masque protecteur",
    description:
      "Un masque de renard sculpté par un ancien maître. Il convertit les premières blessures en volonté.",
    rarity: "COMMON",
    effectKind: "ABSORPTION",
    effectValue: 15,
    wikiImage: "Warding Mask",
  },
  {
    slug: "soins-des-kakushi",
    name: "Soins des Kakushi",
    description:
      "Les ombres du Corps passent après chaque combat et referment les plaies à mesure que les démons tombent.",
    rarity: "COMMON",
    effectKind: "SOIN_PAR_KILL_PCT",
    effectValue: 5,
    wikiImage: "Kakushi",
  },
  {
    slug: "souffle-de-l-eau",
    name: "Souffle de l'Eau",
    description: "Une respiration souple qui accélère la remontée d'énergie.",
    rarity: "COMMON",
    effectKind: "FLUX_PCT",
    effectValue: 15,
    wikiImage: "Water Breathing",
  },
  {
    slug: "souffle-de-la-foudre",
    name: "Souffle de la Foudre",
    description: "Tout se joue dans les jambes : chaque appui devient plus vif.",
    rarity: "COMMON",
    effectKind: "CELERITE_PCT",
    effectValue: 10,
    wikiImage: "Thunder Breathing",
  },
  {
    slug: "entrainement-de-readaptation",
    name: "Entraînement de réadaptation",
    description: "Des jours de souffrance au Domaine des Papillons, libérés dès le premier échange.",
    rarity: "COMMON",
    effectKind: "ENERGIE_DEPART",
    effectValue: 20,
    wikiImage: "Rehabilitation Training",
  },
  {
    slug: "solde-du-corps",
    name: "Solde du Corps",
    description:
      "Le Corps des pourfendeurs récompense chaque démon abattu, et un peu mieux que d'habitude.",
    rarity: "COMMON",
    effectKind: "FRAGMENTS_PCT",
    effectValue: 25,
    wikiImage: { file: "Demon_Slayer_Corps_Insignia.png" },
  },
  {
    slug: "souffle-de-la-bete",
    name: "Souffle de la Bête",
    description: "Une respiration sauvage, inventée seul, qui rend chaque coup plus mordant.",
    rarity: "COMMON",
    effectKind: "FRAPPE_PCT",
    effectValue: 10,
    wikiImage: "Beast Breathing",
  },
  {
    slug: "souffle-de-la-pierre",
    name: "Souffle de la Pierre",
    description: "Le corps devient roc. Il endurcit sans jamais alourdir.",
    rarity: "COMMON",
    effectKind: "PV_MAX_PCT",
    effectValue: 12,
    wikiImage: "Stone Breathing",
  },
  {
    slug: "souffle-de-la-brume",
    name: "Souffle de la Brume",
    description: "Des mouvements flous qui laissent fuir un peu du coût de chaque technique.",
    rarity: "COMMON",
    effectKind: "COUT_TECHNIQUE",
    effectValue: -5,
    wikiImage: "Mist Breathing",
  },

  // ── Rares ──────────────────────────────────────────────────────────────
  {
    slug: "concentration-totale",
    name: "Concentration totale",
    description:
      "La respiration tenue jour et nuit : retourner la douleur en ressource devient un réflexe.",
    rarity: "RARE",
    effectKind: "ABSORPTION",
    effectValue: 35,
    wikiImage: { file: "Tanjiro_doing_Total_Concentration_Breathing_throughout_the_night.png" },
  },
  {
    slug: "etat-d-abandon-de-soi",
    name: "État d'abandon de soi",
    description:
      "Plus d'intention, plus d'hésitation. Les attaques adverses se lisent une éternité à l'avance.",
    rarity: "RARE",
    effectKind: "FENETRE_PCT",
    effectValue: 25,
    wikiImage: "Selfless State",
  },
  {
    slug: "lys-araignee-bleu",
    name: "Lys araignée bleu",
    description:
      "La fleur que Muzan cherche depuis mille ans. Le premier des tiens à tomber se relève, une fois.",
    rarity: "RARE",
    effectKind: "REVIVE_UNE_FOIS",
    effectValue: 30,
    wikiImage: "Blue Spider Lily",
  },
  {
    slug: "souffle-de-l-insecte",
    name: "Souffle de l'Insecte",
    description:
      "Trop frêle pour décapiter, assez rapide pour piquer partout : tout dans la vitesse, rien dans la garde.",
    rarity: "RARE",
    effectKind: "CELERITE_PCT",
    effectValue: 20,
    effectKind2: "PV_MAX_PCT",
    effectValue2: -10,
    wikiImage: "Insect Breathing",
  },
  {
    slug: "souffle-de-la-flamme",
    name: "Souffle de la Flamme",
    description: "Un brasier intérieur qui alimente l'escouade sans discontinuer.",
    rarity: "RARE",
    effectKind: "FLUX_PCT",
    effectValue: 35,
    wikiImage: "Flame Breathing",
  },
  {
    slug: "regeneration-demoniaque",
    name: "Régénération démoniaque",
    description:
      "Le corps d'un démon se reconstitue en se nourrissant de ceux qui tombent autour de lui.",
    rarity: "RARE",
    effectKind: "SOIN_PAR_KILL_PCT",
    effectValue: 10,
    // L'infobox de la page est un GIF animé de 8 Mo : la page « Demon » montre
    // la même chose en image fixe.
    wikiImage: "Demon",
  },
  {
    slug: "lame-ecarlate",
    name: "Lame écarlate",
    description:
      "La lame rougit sous la poigne : la riposte décisive vient bien avant que le corps n'ait tout encaissé.",
    rarity: "RARE",
    effectKind: "ULTIME_SEUIL_PCT",
    effectValue: -25,
    wikiImage: "Bright Red Nichirin Sword",
  },
  {
    slug: "yoriichi-type-zero",
    name: "Yoriichi Type Zéro",
    description:
      "Un automate d'entraînement à six bras. Chaque parade contre lui rend une part de l'énergie du coup.",
    rarity: "RARE",
    effectKind: "CONTRE_GAIN",
    effectValue: 18,
    wikiImage: "Yoriichi Type Zero",
  },

  // ── Épiques ────────────────────────────────────────────────────────────
  {
    slug: "art-demoniaque-du-sang",
    name: "Art démoniaque du sang",
    description:
      "Le pouvoir que donne le sang de Muzan. On ne le porte pas impunément : il attire aussi ce qui rôde.",
    rarity: "EPIC",
    effectKind: "FRAPPE_PCT",
    effectValue: 30,
    effectKind2: "ENNEMI_SUPP",
    effectValue2: 1,
    wikiImage: "Blood Demon Art",
  },
  {
    slug: "marque-du-pourfendeur",
    name: "Marque du pourfendeur",
    description:
      "Elle décuple les techniques, mais elle brûle les années de celui qui la porte. Le marché ne se renégocie pas.",
    rarity: "EPIC",
    effectKind: "COUT_TECHNIQUE",
    effectValue: -18,
    effectKind2: "PV_MAX_PCT",
    effectValue2: -15,
    wikiImage: "Demon Slayer Mark",
  },
  {
    slug: "hinokami-kagura",
    name: "Hinokami Kagura",
    description: "La danse du dieu du feu, héritée du premier souffle : la frappe et la vitesse d'un seul geste.",
    rarity: "EPIC",
    effectKind: "FRAPPE_PCT",
    effectValue: 25,
    effectKind2: "CELERITE_PCT",
    effectValue2: 15,
    wikiImage: "Hinokami Kagura",
  },
  {
    slug: "monde-transparent",
    name: "Monde transparent",
    description:
      "Muscles, souffle, flux du sang : plus rien n'échappe, et l'énergie ne se gaspille plus jamais.",
    rarity: "EPIC",
    effectKind: "FENETRE_PCT",
    effectValue: 40,
    effectKind2: "FLUX_PCT",
    effectValue2: 25,
    wikiImage: { file: "Tanjiro_sees_Akaza's_anatomy_in_the_Transparent_World.png" },
  },
];
