import type { EffectKind } from "@/lib/games/tower/effects";
import type { ItemRarity } from "@/lib/games/tower/items";

/**
 * Objets maudits de JJK — données d'AMORÇAGE de « The Culling Tower ».
 *
 * Même statut que `lib/universes/jjk-attributes.ts` : la source de vérité au
 * runtime est la base (table `Item`, éditable depuis /admin, onglet Objets).
 * Ce fichier ne sert qu'au seed initial et aux tests.
 *
 * Aucune image n'est renseignée : elles se téléversent depuis l'admin, qui les
 * stocke en base et les sert via `/api/items/[id]/image`. Un objet sans visuel
 * s'affiche avec ses initiales, comme un personnage sans portrait.
 *
 * Répartition : 12 communs, 8 rares, 4 épiques. Les épiques ne tombent que sur
 * les élites et les boss (cf. `rewards.ts`).
 */

export interface ItemSeed {
  slug: string;
  name: string;
  description: string;
  rarity: ItemRarity;
  effectKind: EffectKind;
  effectValue: number;
  effectKind2?: EffectKind;
  effectValue2?: number;
}

export const JJK_ITEMS: ItemSeed[] = [
  // ── Communs ────────────────────────────────────────────────────────────
  {
    slug: "lame-de-toji",
    name: "Lame de Toji",
    description:
      "Une lame d'inversion héritée d'un tueur sans énergie occulte. Elle tranche mieux qu'elle ne protège.",
    rarity: "COMMON",
    effectKind: "FRAPPE_PCT",
    effectValue: 12,
    effectKind2: "PV_MAX_PCT",
    effectValue2: -8,
  },
  {
    slug: "coton-noir",
    name: "Coton noir",
    description:
      "Un tissu qui boit l'énergie des coups interceptés et la rend à celui qui a su viser juste.",
    rarity: "COMMON",
    effectKind: "CONTRE_GAIN",
    effectValue: 8,
  },
  {
    slug: "prison-souterraine",
    name: "Prison Souterraine",
    description:
      "Un sceau de retenue qui étouffe le premier élan d'un adversaire, le temps d'un souffle.",
    rarity: "COMMON",
    effectKind: "ANNULE_PREMIER_TELEGRAPHE",
    effectValue: 1,
  },
  {
    slug: "ofuda-use",
    name: "Ofuda usé",
    description:
      "Un talisman fatigué qui convertit les premières blessures en énergie plutôt qu'en douleur.",
    rarity: "COMMON",
    effectKind: "ABSORPTION",
    effectValue: 15,
  },
  {
    slug: "bandage-de-yuta",
    name: "Bandage de Yuta",
    description:
      "Enroulé serré, il referme les plaies à mesure que les adversaires tombent.",
    rarity: "COMMON",
    effectKind: "SOIN_PAR_KILL_PCT",
    effectValue: 5,
  },
  {
    slug: "grigri-de-kyoto",
    name: "Grigri de Kyoto",
    description: "Une babiole d'école rivale qui accélère la remontée d'énergie occulte.",
    rarity: "COMMON",
    effectKind: "FLUX_PCT",
    effectValue: 15,
  },
  {
    slug: "semelles-ferrees",
    name: "Semelles ferrées",
    description: "Lourdes à porter, mais elles rendent chaque appui plus vif.",
    rarity: "COMMON",
    effectKind: "CELERITE_PCT",
    effectValue: 10,
  },
  {
    slug: "reserve-scellee",
    name: "Réserve scellée",
    description: "Une poche d'énergie mise de côté, libérée dès le premier échange.",
    rarity: "COMMON",
    effectKind: "ENERGIE_DEPART",
    effectValue: 20,
  },
  {
    slug: "bourse-maudite",
    name: "Bourse maudite",
    description: "Elle attire les fragments d'âme laissés par les fléaux abattus.",
    rarity: "COMMON",
    effectKind: "FRAGMENTS_PCT",
    effectValue: 25,
  },
  {
    slug: "clou-d-hematite",
    name: "Clou d'hématite",
    description: "Un clou chargé d'énergie, glissé dans la paume avant l'assaut.",
    rarity: "COMMON",
    effectKind: "FRAPPE_PCT",
    effectValue: 10,
  },
  {
    slug: "ecorce-de-tengen",
    name: "Écorce de Tengen",
    description: "Un éclat de barrière vivante. Il endurcit sans jamais alourdir.",
    rarity: "COMMON",
    effectKind: "PV_MAX_PCT",
    effectValue: 12,
  },
  {
    slug: "talisman-fele",
    name: "Talisman fêlé",
    description: "Fendu par un usage de trop, il fait fuir un peu du coût de chaque sort.",
    rarity: "COMMON",
    effectKind: "COUT_TECHNIQUE",
    effectValue: -5,
  },

  // ── Rares ──────────────────────────────────────────────────────────────
  {
    slug: "inversion",
    name: "Inversion",
    description:
      "Le principe même de la technique inversée : retourner la douleur en ressource.",
    rarity: "RARE",
    effectKind: "ABSORPTION",
    effectValue: 35,
  },
  {
    slug: "oeil-de-six-yeux",
    name: "Œil de Six Yeux",
    description:
      "Un fragment de perception absolue. Les intentions adverses se lisent une éternité à l'avance.",
    rarity: "RARE",
    effectKind: "FENETRE_PCT",
    effectValue: 25,
  },
  {
    slug: "coeur-de-rika",
    name: "Cœur de Rika",
    description:
      "Un attachement qui refuse la mort. Le premier des tiens à tomber se relève, une fois.",
    rarity: "RARE",
    effectKind: "REVIVE_UNE_FOIS",
    effectValue: 30,
  },
  {
    slug: "chaine-de-kusakabe",
    name: "Chaîne de Kusakabe",
    description: "Un art du sabre dépouillé : tout dans la vitesse, rien dans la garde.",
    rarity: "RARE",
    effectKind: "CELERITE_PCT",
    effectValue: 20,
    effectKind2: "PV_MAX_PCT",
    effectValue2: -10,
  },
  {
    slug: "vase-de-kamo",
    name: "Vase de Kamo",
    description: "Une réserve de sang manipulé qui alimente l'escouade sans discontinuer.",
    rarity: "RARE",
    effectKind: "FLUX_PCT",
    effectValue: 35,
  },
  {
    slug: "coeur-vorace",
    name: "Cœur vorace",
    description: "Il se nourrit des fléaux abattus et recoud les chairs entre deux échanges.",
    rarity: "RARE",
    effectKind: "SOIN_PAR_KILL_PCT",
    effectValue: 10,
  },
  {
    slug: "sceau-brise",
    name: "Sceau brisé",
    description:
      "La retenue a cédé : le Territoire s'ouvre bien avant que le corps n'ait tout encaissé.",
    rarity: "RARE",
    effectKind: "ULTIME_SEUIL_PCT",
    effectValue: -25,
  },
  {
    slug: "echo-inverse",
    name: "Écho inversé",
    description: "Chaque contre réussi renvoie une part de l'énergie du coup annulé.",
    rarity: "RARE",
    effectKind: "CONTRE_GAIN",
    effectValue: 18,
  },

  // ── Épiques ────────────────────────────────────────────────────────────
  {
    slug: "doigt-de-sukuna",
    name: "Doigt de Sukuna",
    description:
      "Une puissance qu'on ne porte pas impunément : elle attire aussi ce qui rôde.",
    rarity: "EPIC",
    effectKind: "FRAPPE_PCT",
    effectValue: 30,
    effectKind2: "ENNEMI_SUPP",
    effectValue2: 1,
  },
  {
    slug: "serment-contraignant",
    name: "Serment contraignant",
    description:
      "Tu donnes ta chair, tu reçois ta technique. Le marché ne se renégocie pas.",
    rarity: "EPIC",
    effectKind: "COUT_TECHNIQUE",
    effectValue: -18,
    effectKind2: "PV_MAX_PCT",
    effectValue2: -15,
  },
  {
    slug: "sabre-de-kenjaku",
    name: "Sabre de Kenjaku",
    description: "Mille ans d'expérience volée, condensés dans un tranchant impatient.",
    rarity: "EPIC",
    effectKind: "FRAPPE_PCT",
    effectValue: 25,
    effectKind2: "CELERITE_PCT",
    effectValue2: 15,
  },
  {
    slug: "regard-des-six-yeux",
    name: "Regard des Six Yeux",
    description:
      "Plus rien ne va assez vite pour t'échapper, et l'énergie ne se gaspille plus jamais.",
    rarity: "EPIC",
    effectKind: "FENETRE_PCT",
    effectValue: 40,
    effectKind2: "FLUX_PCT",
    effectValue2: 25,
  },
];
