import type { TowerEvent } from "@/lib/games/tower/events";

/**
 * Évènements de la Tour, univers JJK.
 *
 * Écrits à la main — c'est le seul contenu du jeu qui ne se dérive pas du
 * roster, parce qu'une situation ne se dérive pas.
 *
 * Deux règles de conception tenues partout ici :
 *  1. **Aucune option n'est gratuite.** Un évènement dont une branche est
 *     strictement meilleure n'est pas un choix, c'est un couloir. Chaque
 *     branche prend quelque chose ou parie quelque chose.
 *  2. **Le libellé dit l'intention, pas le résultat.** « Plonger la main dans
 *     la cuve » et non « Gagner 60 fragments » : sinon il n'y a plus de risque,
 *     juste une addition.
 */
export const JJK_EVENTS: TowerEvent[] = [
  {
    slug: "cuve-scellee",
    title: "Une cuve scellée",
    text: "Un bac de fer suinte une énergie qu'aucun de vous ne reconnaît. Le sceau a lâché depuis longtemps, mais quelque chose brille au fond.",
    choices: [
      {
        label: "Plonger la main dedans",
        outcome: {
          text: "Tes doigts se referment sur un objet froid. Le liquide, lui, ronge la peau de toute l'escouade.",
          item: "any",
          healPct: -12,
        },
      },
      {
        label: "Renverser la cuve et passer",
        outcome: {
          text: "Le contenu se répand et se cristallise. Vous ramassez ce qu'il en reste.",
          fragments: 35,
        },
      },
    ],
  },
  {
    slug: "exorciste-blesse",
    title: "Un exorciste à terre",
    text: "Il tient encore debout contre un mur, une main sur le flanc. Il vous voit et tend l'autre.",
    choices: [
      {
        label: "Le soigner avec vos réserves",
        outcome: {
          text: "Il repart en vous laissant sa besace. Vos réserves, elles, y sont passées.",
          fragments: 60,
          healPct: -8,
        },
      },
      {
        label: "Le laisser où il est",
        outcome: {
          text: "Vous continuez sans un mot. L'escouade souffle un moment de plus qu'elle ne devrait.",
          healPct: 15,
        },
      },
    ],
  },
  {
    slug: "salle-des-voix",
    title: "La salle des voix",
    text: "L'étage entier murmure. Les voix promettent la puissance à qui les écoutera assez longtemps.",
    choices: [
      {
        label: "Écouter jusqu'au bout",
        outcome: {
          text: "Ce que vous entendez laisse une trace. Et un savoir.",
          item: "RARE",
          healPct: -18,
        },
      },
      {
        label: "Vous boucher les oreilles et courir",
        outcome: {
          text: "Vous traversez sans rien entendre. Rien gagné, rien perdu.",
        },
      },
    ],
  },
  {
    slug: "marchand-presse",
    title: "Un colporteur pressé",
    text: "Il pousse une carriole grinçante et n'a pas l'air de vouloir s'attarder. « Tout doit partir. »",
    choices: [
      {
        label: "Vider vos poches pour son lot",
        outcome: {
          text: "Il empoche tout et vous laisse le paquet sans le déballer.",
          fragments: -50,
          item: "RARE",
        },
      },
      {
        label: "Marchander âprement",
        outcome: {
          text: "Il finit par céder une babiole pour presque rien, en grommelant.",
          fragments: -15,
          item: "COMMON",
        },
      },
    ],
  },
  {
    slug: "sceau-ancien",
    title: "Un sceau à demi effacé",
    text: "Des caractères anciens barrent une porte. Derrière, on entend respirer.",
    choices: [
      {
        label: "Briser le sceau",
        outcome: {
          text: "Ce qui dormait derrière vous coûte cher — mais laisse une relique en tombant.",
          item: "EPIC",
          healPct: -30,
        },
      },
      {
        label: "Le renforcer et s'éloigner",
        outcome: {
          text: "Vous consolidez le sceau. La sérénité vaut bien le détour.",
          healPct: 20,
        },
      },
    ],
  },
  {
    slug: "source-tiede",
    title: "Une source tiède",
    text: "De l'eau claire, au milieu de tout ça. C'est suspect, et vous êtes épuisés.",
    choices: [
      {
        label: "S'y reposer longuement",
        outcome: {
          text: "L'escouade repart d'aplomb. Vous avez perdu du temps — et ce qui traînait dans vos poches.",
          healPct: 45,
          fragments: -25,
        },
      },
      {
        label: "Se rincer et repartir",
        outcome: {
          text: "Un peu de répit, sans plus.",
          healPct: 15,
        },
      },
    ],
  },
  {
    slug: "pari-du-fleau",
    title: "Le pari du fléau",
    text: "Une petite chose ricanante vous barre le passage. « Un jeu. Tu mises, je donne. »",
    choices: [
      {
        label: "Miser gros",
        outcome: {
          text: "Il tient parole, à sa façon : l'objet est bon, la morsure aussi.",
          fragments: -70,
          item: "EPIC",
        },
      },
      {
        label: "Refuser de jouer",
        outcome: {
          text: "Il s'efface en crachant. Vous ramassez ce qu'il laisse tomber.",
          fragments: 20,
        },
      },
    ],
  },
  {
    slug: "atelier-abandonne",
    title: "Un atelier abandonné",
    text: "Des outils d'exorciste rouillent sur un établi. Presque tout est inutilisable.",
    choices: [
      {
        label: "Fouiller méthodiquement",
        outcome: {
          text: "Vous en tirez quelque chose d'utilisable, au prix d'un long moment à découvert.",
          item: "COMMON",
          healPct: -10,
        },
      },
      {
        label: "Emporter la ferraille",
        outcome: {
          text: "Rien de glorieux, mais ça se revend.",
          fragments: 45,
        },
      },
    ],
  },
  {
    slug: "voile-de-rideau",
    title: "Un Rideau mal tendu",
    text: "La barrière tremble. On peut la traverser — ou la déchirer pour récupérer ce qu'elle retient.",
    choices: [
      {
        label: "La déchirer",
        outcome: {
          text: "Le Rideau cède dans un claquement. Ce qu'il retenait vous retombe dessus, et entre les mains.",
          item: "RARE",
          healPct: -15,
          fragments: 25,
        },
      },
      {
        label: "Se glisser dessous",
        outcome: {
          text: "Vous passez sans faire de vagues. L'escouade récupère un peu de son calme.",
          healPct: 12,
        },
      },
    ],
  },
  {
    slug: "offrande",
    title: "Une offrande sur l'autel",
    text: "Quelqu'un est passé avant vous et a laissé de quoi acheter le silence de l'étage.",
    choices: [
      {
        label: "Prendre l'offrande",
        outcome: {
          text: "Vous empochez tout. L'étage se referme derrière vous en grinçant.",
          fragments: 70,
          healPct: -10,
        },
      },
      {
        label: "Ajouter la vôtre",
        outcome: {
          text: "Vous laissez quelques fragments. Quelque chose, quelque part, vous rend la pareille.",
          fragments: -30,
          item: "RARE",
        },
      },
    ],
  },
];
