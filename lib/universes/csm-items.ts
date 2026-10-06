import type { ItemSeed } from "./item-seed";

/**
 * Contrats et reliques de Chainsaw Man — amorçage de « The Culling Tower ».
 *
 * Calque exact de `jjk-items.ts` : mêmes 24 emplacements, mêmes raretés, mêmes
 * effets, dans le même ordre (vérifié par `rewards.test.ts`). Seuls le nom, la
 * description et l'image changent.
 *
 * Dans cet univers, un pouvoir s'obtient par CONTRAT avec un démon : la plupart
 * des objets en sont donc.
 *
 * Images : wiki anglais (chainsaw-man.fandom.com). Plusieurs pages ont pour
 * infobox une scène plutôt que l'objet : le fichier est alors épinglé.
 */
export const CSM_ITEMS: ItemSeed[] = [
  // ── Communs ────────────────────────────────────────────────────────────
  {
    slug: "contrat-demon-du-feu",
    name: "Contrat du Démon du Feu",
    description:
      "Il brûle ce que tu lui offres pour embraser tes coups. Ça frappe fort, et ça se paie en chair.",
    rarity: "COMMON",
    effectKind: "FRAPPE_PCT",
    effectValue: 12,
    effectKind2: "PV_MAX_PCT",
    effectValue2: -8,
    wikiImage: "Fire Devil",
  },
  {
    slug: "contrat-demon-fantome",
    name: "Contrat du Démon Fantôme",
    description:
      "Une main invisible saisit ce qui t'a visé et rend l'énergie à celui qui a su parer.",
    rarity: "COMMON",
    effectKind: "CONTRE_GAIN",
    effectValue: 8,
    wikiImage: "Ghost Devil",
  },
  {
    slug: "contrat-demon-serpent",
    name: "Contrat du Démon Serpent",
    description: "Il avale tout rond le premier élan d'un adversaire, le temps d'un souffle.",
    rarity: "COMMON",
    effectKind: "ANNULE_PREMIER_TELEGRAPHE",
    effectValue: 1,
    wikiImage: "Snake Devil",
  },
  {
    slug: "contrat-demon-concombre-de-mer",
    name: "Contrat du Démon Concombre de mer",
    description: "Mou, inoffensif en apparence : il transforme les premières blessures en énergie.",
    rarity: "COMMON",
    effectKind: "ABSORPTION",
    effectValue: 15,
    wikiImage: "Sea Cucumber Devil",
  },
  {
    slug: "contrat-demon-sangsue",
    name: "Contrat du Démon Sangsue",
    description: "Il boit le sang des vaincus et referme tes plaies à mesure qu'ils tombent.",
    rarity: "COMMON",
    effectKind: "SOIN_PAR_KILL_PCT",
    effectValue: 5,
    wikiImage: "Leech Devil",
  },
  {
    slug: "contrat-demon-typhon",
    name: "Contrat du Démon Typhon",
    description: "Une bourrasque qui ne retombe jamais et accélère la remontée d'énergie.",
    rarity: "COMMON",
    effectKind: "FLUX_PCT",
    effectValue: 15,
    wikiImage: "Typhoon Devil",
  },
  {
    slug: "contrat-demon-chauve-souris",
    name: "Contrat du Démon Chauve-souris",
    description: "Des ailes prêtées pour la nuit : chaque appui devient plus vif.",
    rarity: "COMMON",
    effectKind: "CELERITE_PCT",
    effectValue: 10,
    wikiImage: "Bat Devil",
  },
  {
    slug: "cordon-de-demarrage",
    name: "Cordon de démarrage",
    description: "Une traction sèche, et la tronçonneuse rugit dès le premier échange.",
    rarity: "COMMON",
    effectKind: "ENERGIE_DEPART",
    effectValue: 20,
    wikiImage: "Pochita",
  },
  {
    slug: "prime-du-demon-tomate",
    name: "Prime du Démon Tomate",
    description:
      "De quoi éponger une dette : chaque démon abattu rapporte un peu plus qu'à l'ordinaire.",
    rarity: "COMMON",
    effectKind: "FRAGMENTS_PCT",
    effectValue: 25,
    wikiImage: "Tomato Devil",
  },
  {
    slug: "contrat-demon-renard",
    name: "Contrat du Démon Renard",
    description: "Une mâchoire géante surgit à l'appel du chasseur. Elle mord avant l'assaut.",
    rarity: "COMMON",
    effectKind: "FRAPPE_PCT",
    effectValue: 10,
    wikiImage: "Fox Devil",
  },
  {
    slug: "contrat-demon-zombie",
    name: "Contrat du Démon Zombie",
    description: "Une chair qui refuse de tomber. Elle endurcit sans jamais alourdir.",
    rarity: "COMMON",
    effectKind: "PV_MAX_PCT",
    effectValue: 12,
    wikiImage: "Zombie Devil",
  },
  {
    slug: "contrat-demon-de-la-pierre",
    name: "Contrat du Démon de la Pierre",
    description: "Un pacte modeste, aux clauses usées, qui fait fuir un peu du coût de chaque technique.",
    rarity: "COMMON",
    effectKind: "COUT_TECHNIQUE",
    effectValue: -5,
    wikiImage: "Stone Devil",
  },

  // ── Rares ──────────────────────────────────────────────────────────────
  {
    slug: "demon-de-l-eternite",
    name: "Démon de l'Éternité",
    description:
      "Rien ne finit jamais vraiment dans son ventre : retourner la douleur en ressource devient naturel.",
    rarity: "RARE",
    effectKind: "ABSORPTION",
    effectValue: 35,
    wikiImage: "Eternity Devil",
  },
  {
    slug: "contrat-demon-du-futur",
    name: "Contrat du Démon du Futur",
    description:
      "Il loge dans ton œil et te montre les secondes à venir. Les intentions adverses se lisent à l'avance.",
    rarity: "RARE",
    effectKind: "FENETRE_PCT",
    effectValue: 25,
    wikiImage: "Future Devil",
  },
  {
    slug: "coeur-de-pochita",
    name: "Cœur de Pochita",
    description:
      "Un démon devenu cœur, qui refuse de laisser mourir. Le premier des tiens à tomber se relève, une fois.",
    rarity: "RARE",
    effectKind: "REVIVE_UNE_FOIS",
    effectValue: 30,
    wikiImage: { file: "Pochita_as_Denji's_heart.png" },
  },
  {
    slug: "contact-du-demon-ange",
    name: "Contact du Démon Ange",
    description:
      "Des ailes rapides comme l'éclair, mais chaque contact te coûte des années : tout dans la vitesse, rien dans la garde.",
    rarity: "RARE",
    effectKind: "CELERITE_PCT",
    effectValue: 20,
    effectKind2: "PV_MAX_PCT",
    effectValue2: -10,
    wikiImage: "Angel Devil",
  },
  {
    slug: "centre-de-detention",
    name: "Centre de détention des démons",
    description:
      "Une réserve de démons enchaînés, prêts à signer, qui alimente l'escouade sans discontinuer.",
    rarity: "RARE",
    effectKind: "FLUX_PCT",
    effectValue: 35,
    wikiImage: "Tokyo Devil Detention Center",
  },
  {
    slug: "sang-d-hybride",
    name: "Sang d'hybride",
    description: "Une gorgée de sang et les membres repoussent : il recoud les chairs entre deux échanges.",
    rarity: "RARE",
    effectKind: "SOIN_PAR_KILL_PCT",
    effectValue: 10,
    wikiImage: "Hybrid",
  },
  {
    slug: "contrat-demon-du-chatiment",
    name: "Contrat du Démon du Châtiment",
    description:
      "Le châtiment n'attend pas : il s'abat bien avant que le corps n'ait tout encaissé.",
    rarity: "RARE",
    effectKind: "ULTIME_SEUIL_PCT",
    effectValue: -25,
    wikiImage: "Punishment Devil",
  },
  {
    slug: "contrat-demon-guillotine",
    name: "Contrat du Démon Guillotine",
    description: "Le couperet retombe sur qui t'a frappé et renvoie une part de l'énergie du coup.",
    rarity: "RARE",
    effectKind: "CONTRE_GAIN",
    effectValue: 18,
    wikiImage: "Guillotine Devil",
  },

  // ── Épiques ────────────────────────────────────────────────────────────
  {
    slug: "chair-du-demon-du-fusil",
    name: "Chair du Démon du Fusil",
    description:
      "Un morceau de la plus grande peur du monde. Une puissance qu'on ne porte pas impunément : elle attire aussi ce qui rôde.",
    rarity: "EPIC",
    effectKind: "FRAPPE_PCT",
    effectValue: 30,
    effectKind2: "ENNEMI_SUPP",
    effectValue2: 1,
    wikiImage: { file: "Gun_Devil_flesh.png" },
  },
  {
    slug: "clou-du-demon-de-la-malediction",
    name: "Clou du Démon de la Malédiction",
    description:
      "Trois coups et la cible meurt — mais le démon se paie sur ta vie. Le marché ne se renégocie pas.",
    rarity: "EPIC",
    effectKind: "COUT_TECHNIQUE",
    effectValue: -18,
    effectKind2: "PV_MAX_PCT",
    effectValue2: -15,
    wikiImage: { file: "Curse_Devil.png" },
  },
  {
    slug: "lame-des-tenebres",
    name: "Lame des Ténèbres",
    description: "Une lame taillée dans la peur originelle : la frappe et la vitesse d'un seul geste.",
    rarity: "EPIC",
    effectKind: "FRAPPE_PCT",
    effectValue: 25,
    effectKind2: "CELERITE_PCT",
    effectValue2: 15,
    wikiImage: { file: "Darkness_Devil's_dark_blade.png" },
  },
  {
    slug: "chaines-du-controle",
    name: "Chaînes du Contrôle",
    description:
      "Tout ce qui se croit inférieur obéit : plus rien ne t'échappe, et l'énergie ne se gaspille plus jamais.",
    rarity: "EPIC",
    effectKind: "FENETRE_PCT",
    effectValue: 40,
    effectKind2: "FLUX_PCT",
    effectValue2: 25,
    wikiImage: { file: "Makima's_multiple_chains.png" },
  },
];
