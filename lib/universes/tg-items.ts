import type { ItemSeed } from "./item-seed";

/**
 * Arsenal de Tokyo Ghoul — amorçage de « The Culling Tower ».
 *
 * Calque exact de `jjk-items.ts` : mêmes 24 emplacements, mêmes raretés, mêmes
 * effets, dans le même ordre (vérifié par `rewards.test.ts`). Seuls le nom, la
 * description et l'image changent.
 *
 * Images : wiki anglais (tokyoghoul.fandom.com). Les deux camps y figurent —
 * quinques du CCG d'un côté, organes et lieux des goules de l'autre.
 */
export const TG_ITEMS: ItemSeed[] = [
  // ── Communs ────────────────────────────────────────────────────────────
  {
    slug: "yukimura-1-3",
    name: "Yukimura 1/3",
    description:
      "Une quinque-sabre taillée dans le kakuhou d'une goule. Elle tranche mieux qu'elle ne protège.",
    rarity: "COMMON",
    effectKind: "FRAPPE_PCT",
    effectValue: 12,
    effectKind2: "PV_MAX_PCT",
    effectValue2: -8,
    wikiImage: "Yukimura 1/3",
  },
  {
    slug: "kura",
    name: "Kura",
    description:
      "Une quinque massive qui pare autant qu'elle frappe, et rend la monnaie à qui a su viser juste.",
    rarity: "COMMON",
    effectKind: "CONTRE_GAIN",
    effectValue: 8,
    wikiImage: "Kura",
  },
  {
    slug: "grenade-a-gaz-rc",
    name: "Grenade à gaz Rc",
    description:
      "Un nuage qui inhibe les cellules Rc et étouffe le premier élan d'une goule, le temps d'un souffle.",
    rarity: "COMMON",
    effectKind: "ANNULE_PREMIER_TELEGRAPHE",
    effectValue: 1,
    wikiImage: "Control Rc gas grenade",
  },
  {
    slug: "cellules-rc",
    name: "Cellules Rc",
    description:
      "Elles circulent comme du sang et convertissent les premières blessures en énergie plutôt qu'en douleur.",
    rarity: "COMMON",
    effectKind: "ABSORPTION",
    effectValue: 15,
    wikiImage: "Rc cells",
  },
  {
    slug: "restaurant-des-goules",
    name: "Restaurant des goules",
    description:
      "Une table où l'on se nourrit des vaincus. Les plaies s'y referment à mesure que les proies tombent.",
    rarity: "COMMON",
    effectKind: "SOIN_PAR_KILL_PCT",
    effectValue: 5,
    wikiImage: "Ghoul Restaurant",
  },
  {
    slug: "cafe-de-l-anteiku",
    name: "Café de l'Anteiku",
    description: "Le seul breuvage que tolère une goule. Il accélère la remontée d'énergie.",
    rarity: "COMMON",
    effectKind: "FLUX_PCT",
    effectValue: 15,
    wikiImage: "Anteiku",
  },
  {
    slug: "taruhi",
    name: "Taruhi",
    description: "Une quinque légère qui suit le geste plutôt qu'elle ne le guide.",
    rarity: "COMMON",
    effectKind: "CELERITE_PCT",
    effectValue: 10,
    wikiImage: "Taruhi",
  },
  {
    slug: "masque-de-goule",
    name: "Masque de goule",
    description:
      "Le porter, c'est cesser de faire semblant : l'énergie contenue se libère dès le premier échange.",
    rarity: "COMMON",
    effectKind: "ENERGIE_DEPART",
    effectValue: 20,
    wikiImage: "Mask",
  },
  {
    slug: "oeuf-de-la-chevre-noire",
    name: "L'Œuf de la Chèvre noire",
    description:
      "Un roman à succès qui attire les lecteurs — et les fragments de ceux qui le lisent de trop près.",
    rarity: "COMMON",
    effectKind: "FRAGMENTS_PCT",
    effectValue: 25,
    wikiImage: "The Black Goat's Egg",
  },
  {
    slug: "ginkui",
    name: "Ginkui",
    description: "Une quinque de série, sortie de l'armurerie du CCG avant l'assaut.",
    rarity: "COMMON",
    effectKind: "FRAPPE_PCT",
    effectValue: 10,
    wikiImage: "Ginkui",
  },
  {
    slug: "portique-de-scan-rc",
    name: "Portique de scan Rc",
    description: "Un fragment des barrières du CCG. Il endurcit sans jamais alourdir.",
    rarity: "COMMON",
    effectKind: "PV_MAX_PCT",
    effectValue: 12,
    wikiImage: "Rc scan gate",
  },
  {
    slug: "suppresseurs-rc",
    name: "Suppresseurs Rc",
    description: "Une dose bien dosée qui fait fuir un peu du coût de chaque technique.",
    rarity: "COMMON",
    effectKind: "COUT_TECHNIQUE",
    effectValue: -5,
    wikiImage: "Rc suppressants",
  },

  // ── Rares ──────────────────────────────────────────────────────────────
  {
    slug: "kakuja",
    name: "Kakuja",
    description:
      "L'armure née du cannibalisme : elle ne se contente pas d'encaisser, elle retourne la douleur en ressource.",
    rarity: "RARE",
    effectKind: "ABSORPTION",
    effectValue: 35,
    wikiImage: "Kakuja",
  },
  {
    slug: "kakugan",
    name: "Kakugan",
    description:
      "L'œil rouge et noir d'une goule affamée. Les intentions adverses se lisent une éternité à l'avance.",
    rarity: "RARE",
    effectKind: "FENETRE_PCT",
    effectValue: 25,
    wikiImage: "Kakugan",
  },
  {
    slug: "hopital-kanou",
    name: "Hôpital général Kanou",
    description:
      "Une table d'opération qui refuse la mort. Le premier des tiens à tomber se relève, une fois — plus tout à fait le même.",
    rarity: "RARE",
    effectKind: "REVIVE_UNE_FOIS",
    effectValue: 30,
    wikiImage: "Kanou General Hospital",
  },
  {
    slug: "narukami",
    name: "Narukami",
    description: "Une quinque qui crache la foudre : tout dans la vitesse, rien dans la garde.",
    rarity: "RARE",
    effectKind: "CELERITE_PCT",
    effectValue: 20,
    effectKind2: "PV_MAX_PCT",
    effectValue2: -10,
    wikiImage: "Narukami",
  },
  {
    slug: "kagune",
    name: "Kagune",
    description: "Un organe prédateur qui pompe les cellules Rc et alimente l'escouade sans discontinuer.",
    rarity: "RARE",
    effectKind: "FLUX_PCT",
    effectValue: 35,
    wikiImage: "Kagune",
  },
  {
    slug: "fueguchi-one",
    name: "Fueguchi One",
    description: "Une quinque-fouet qui se repaît des goules abattues et recoud les chairs entre deux échanges.",
    rarity: "RARE",
    effectKind: "SOIN_PAR_KILL_PCT",
    effectValue: 10,
    wikiImage: "Fueguchi One",
  },
  {
    slug: "levee-des-frames",
    name: "Levée des frames",
    description:
      "Les verrous ont sauté : le kagune se déploie bien avant que le corps n'ait tout encaissé.",
    rarity: "RARE",
    effectKind: "ULTIME_SEUIL_PCT",
    effectValue: -25,
    wikiImage: "Frame release surgery",
  },
  {
    slug: "ixa",
    name: "IXA",
    description: "Une quinque-lance qui se fait bouclier. Chaque contre réussi renvoie une part du coup annulé.",
    rarity: "RARE",
    effectKind: "CONTRE_GAIN",
    effectValue: 18,
    wikiImage: "IXA",
  },

  // ── Épiques ────────────────────────────────────────────────────────────
  {
    slug: "goule-borgne",
    name: "Goule borgne",
    description:
      "Mi-humain, mi-goule : une puissance qu'on ne porte pas impunément, elle attire aussi ce qui rôde.",
    rarity: "EPIC",
    effectKind: "FRAPPE_PCT",
    effectValue: 30,
    effectKind2: "ENNEMI_SUPP",
    effectValue2: 1,
    wikiImage: { file: "One_eyed_owl_a.png" },
  },
  {
    slug: "implant-quinx",
    name: "Implant Quinx",
    description:
      "Un kakuhou greffé : tu donnes ta chair, tu reçois un kagune. Le marché ne se renégocie pas.",
    rarity: "EPIC",
    effectKind: "COUT_TECHNIQUE",
    effectValue: -18,
    effectKind2: "PV_MAX_PCT",
    effectValue2: -15,
    wikiImage: "Quinx Squad",
  },
  {
    slug: "kagune-chimere",
    name: "Kagune chimère",
    description: "Deux types de kagune fusionnés en un seul : la frappe et la vitesse d'un seul geste.",
    rarity: "EPIC",
    effectKind: "FRAPPE_PCT",
    effectValue: 25,
    effectKind2: "CELERITE_PCT",
    effectValue2: 15,
    wikiImage: "Chimera kagune",
  },
  {
    slug: "arata",
    name: "Arata",
    description:
      "Une armure-quinque qui épouse son porteur : plus rien ne t'échappe, et l'énergie ne se gaspille plus jamais.",
    rarity: "EPIC",
    effectKind: "FENETRE_PCT",
    effectValue: 40,
    effectKind2: "FLUX_PCT",
    effectValue2: 25,
    wikiImage: "Arata",
  },
];
