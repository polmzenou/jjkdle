import type { ItemSeed } from "./item-seed";

/**
 * Équipement de L'Attaque des Titans — amorçage de « The Culling Tower ».
 *
 * Calque exact de `jjk-items.ts` : mêmes 24 emplacements, mêmes raretés, mêmes
 * effets, dans le même ordre (vérifié par `rewards.test.ts`). Seuls le nom, la
 * description et l'image changent.
 *
 * Images : wiki anglais (attackontitan.fandom.com), pages « (Anime) » de
 * préférence — leur infobox montre le rendu de l'anime plutôt que du manga.
 */
export const AOT_ITEMS: ItemSeed[] = [
  // ── Communs ────────────────────────────────────────────────────────────
  {
    slug: "lames-acier-ultradur",
    name: "Lames en acier ultradur",
    description:
      "Des lames de rechange taillées pour la nuque des Titans. Elles tranchent mieux qu'elles ne protègent.",
    rarity: "COMMON",
    effectKind: "FRAPPE_PCT",
    effectValue: 12,
    effectKind2: "PV_MAX_PCT",
    effectValue2: -8,
    wikiImage: "Ultrahard steel (Anime)",
  },
  {
    slug: "fusee-de-signalisation",
    name: "Fusée de signalisation",
    description:
      "Un tir coloré qui relaie l'alerte dans toute la formation : chaque contre réussi profite au groupe.",
    rarity: "COMMON",
    effectKind: "CONTRE_GAIN",
    effectValue: 8,
    wikiImage: { file: "Signal_Flare_Gun.png" },
  },
  {
    slug: "arme-de-capture",
    name: "Arme de capture spéciale",
    description:
      "Des dizaines de câbles tirés d'un coup : de quoi figer le premier élan d'un géant, le temps d'un souffle.",
    rarity: "COMMON",
    effectKind: "ANNULE_PREMIER_TELEGRAPHE",
    effectValue: 1,
    wikiImage: "Special target restraining weapon (Anime)",
  },
  {
    slug: "insigne-de-la-garnison",
    name: "Insigne de la Garnison",
    description:
      "Les roses de ceux qui tiennent les Murs. Chaque blessure encaissée devient une raison de tenir.",
    rarity: "COMMON",
    effectKind: "ABSORPTION",
    effectValue: 15,
    wikiImage: "Garrison Regiment (Anime)",
  },
  {
    slug: "monture-d-eclaireur",
    name: "Monture d'éclaireur",
    description:
      "Un cheval dressé hors les Murs. On reprend son souffle en selle, entre deux Titans abattus.",
    rarity: "COMMON",
    effectKind: "SOIN_PAR_KILL_PCT",
    effectValue: 5,
    wikiImage: "Horse (Anime)",
  },
  {
    slug: "pierre-de-glace",
    name: "Pierre de glace",
    description:
      "Le minerai qui alimente les bonbonnes de gaz. Un éclat suffit à accélérer la recharge.",
    rarity: "COMMON",
    effectKind: "FLUX_PCT",
    effectValue: 15,
    wikiImage: "Iceburst stone",
  },
  {
    slug: "equipement-tridimensionnel",
    name: "Équipement tridimensionnel",
    description: "Lourd à harnacher, mais il rend chaque appui plus vif.",
    rarity: "COMMON",
    effectKind: "CELERITE_PCT",
    effectValue: 10,
    wikiImage: "Omni-directional mobility gear (Anime)",
  },
  {
    slug: "canon-des-murs",
    name: "Canon des Murs",
    description: "Une salve chargée d'avance, tirée dès le premier échange.",
    rarity: "COMMON",
    effectKind: "ENERGIE_DEPART",
    effectValue: 20,
    wikiImage: "Wall-mounted artillery (Anime)",
  },
  {
    slug: "cle-du-sous-sol",
    name: "Clé du sous-sol",
    description:
      "Elle ouvre bien plus qu'une porte : chaque Titan abattu livre un peu plus de ses secrets.",
    rarity: "COMMON",
    effectKind: "FRAGMENTS_PCT",
    effectValue: 25,
    wikiImage: "Basement (Anime)",
  },
  {
    slug: "armes-a-feu",
    name: "Armes à feu",
    description: "Un fusil de la Brigade spéciale, chargé avant l'assaut.",
    rarity: "COMMON",
    effectKind: "FRAPPE_PCT",
    effectValue: 10,
    wikiImage: "Firearms (Anime)",
  },
  {
    slug: "pierre-des-murs",
    name: "Pierre des Murs",
    description: "Un éclat des remparts de l'humanité. Il endurcit sans jamais alourdir.",
    rarity: "COMMON",
    effectKind: "PV_MAX_PCT",
    effectValue: 12,
    wikiImage: "Walls (Anime)",
  },
  {
    slug: "ailes-de-la-liberte",
    name: "Ailes de la Liberté",
    description:
      "L'emblème du Bataillon d'exploration. Il allège un peu le coût de chaque manœuvre.",
    rarity: "COMMON",
    effectKind: "COUT_TECHNIQUE",
    effectValue: -5,
    wikiImage: "Scout Regiment (Anime)",
  },

  // ── Rares ──────────────────────────────────────────────────────────────
  {
    slug: "armure-du-cuirasse",
    name: "Armure du Cuirassé",
    description:
      "Une carapace durcie qui ne se contente pas d'encaisser : elle retourne la douleur en ressource.",
    rarity: "RARE",
    effectKind: "ABSORPTION",
    effectValue: 35,
    wikiImage: "Armored Titan (Anime)",
  },
  {
    slug: "instinct-ackerman",
    name: "Instinct Ackerman",
    description:
      "Un éveil hérité du sang. Les intentions adverses se lisent une éternité à l'avance.",
    rarity: "RARE",
    effectKind: "FENETRE_PCT",
    effectValue: 25,
    wikiImage: "Ackermann family (Anime)",
  },
  {
    slug: "serum-de-titan",
    name: "Sérum de Titan",
    description:
      "Une seule injection, un seul élu. Le premier des tiens à tomber se relève, une fois.",
    rarity: "RARE",
    effectKind: "REVIVE_UNE_FOIS",
    effectValue: 30,
    wikiImage: "Titan injection (Anime)",
  },
  {
    slug: "equipement-anti-personnel",
    name: "Équipement anti-personnel",
    description:
      "Le harnais des brigades de Kenny : tout dans la vitesse, rien dans la garde.",
    rarity: "RARE",
    effectKind: "CELERITE_PCT",
    effectValue: 20,
    effectKind2: "PV_MAX_PCT",
    effectValue2: -10,
    wikiImage: "Anti-Personnel omni-directional mobility gear (Anime)",
  },
  {
    slug: "les-chemins",
    name: "Les Chemins",
    description:
      "Le réseau invisible qui relie tous les Eldiens et alimente l'escouade sans discontinuer.",
    rarity: "RARE",
    effectKind: "FLUX_PCT",
    effectValue: 35,
    wikiImage: "Path (Anime)",
  },
  {
    slug: "regeneration-titanesque",
    name: "Régénération titanesque",
    description:
      "La vapeur s'élève des plaies et recoud les chairs entre deux échanges.",
    rarity: "RARE",
    effectKind: "SOIN_PAR_KILL_PCT",
    effectValue: 10,
    wikiImage: "Power of the Titans (Anime)",
  },
  {
    slug: "titan-assaillant",
    name: "Titan Assaillant",
    description:
      "Il avance, toujours : la transformation éclate bien avant que le corps n'ait tout encaissé.",
    rarity: "RARE",
    effectKind: "ULTIME_SEUIL_PCT",
    effectValue: -25,
    wikiImage: "Attack Titan (Anime)",
  },
  {
    slug: "artillerie-anti-titan",
    name: "Artillerie anti-Titan",
    description: "Chaque assaut repoussé recharge les pièces d'une part de sa violence.",
    rarity: "RARE",
    effectKind: "CONTRE_GAIN",
    effectValue: 18,
    wikiImage: "Anti-Titan Artillery (Anime)",
  },

  // ── Épiques ────────────────────────────────────────────────────────────
  {
    slug: "le-grondement",
    name: "Le Grondement",
    description:
      "Une puissance qu'on ne déclenche pas impunément : elle attire aussi ce qui rôde.",
    rarity: "EPIC",
    effectKind: "FRAPPE_PCT",
    effectValue: 30,
    effectKind2: "ENNEMI_SUPP",
    effectValue2: 1,
    wikiImage: "Rumbling (Anime)",
  },
  {
    slug: "titan-marteau-d-armes",
    name: "Titan Marteau d'Armes",
    description:
      "Le cristal forge n'importe quelle arme, mais il se taille dans ta propre chair.",
    rarity: "EPIC",
    effectKind: "COUT_TECHNIQUE",
    effectValue: -18,
    effectKind2: "PV_MAX_PCT",
    effectValue2: -15,
    wikiImage: "War Hammer Titan (Anime)",
  },
  {
    slug: "lance-foudroyante",
    name: "Lance foudroyante",
    description: "Une charge explosive au bout d'un câble : la frappe et la vitesse d'un seul geste.",
    rarity: "EPIC",
    effectKind: "FRAPPE_PCT",
    effectValue: 25,
    effectKind2: "CELERITE_PCT",
    effectValue2: 15,
    wikiImage: "Thunder Spear (Anime)",
  },
  {
    slug: "titan-originel",
    name: "Titan Originel",
    description:
      "La Coordonnée voit tout, partout, à la fois — et l'énergie ne se gaspille plus jamais.",
    rarity: "EPIC",
    effectKind: "FENETRE_PCT",
    effectValue: 40,
    effectKind2: "FLUX_PCT",
    effectValue2: 25,
    wikiImage: "Founding Titan (Anime)",
  },
];
