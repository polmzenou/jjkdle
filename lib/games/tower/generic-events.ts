import type { TowerEvent } from "./events";

/**
 * Évènements NEUTRES, sans référence à un anime : catalogue de secours pour un
 * univers qui n'a pas (encore) le sien. Sans lui, un nœud « Rencontre » sur un
 * tel univers ouvrait un écran vide et bloquait la run.
 */
export const GENERIC_EVENTS: TowerEvent[] = [
  {
    slug: "generic-coffre",
    title: "Un coffre piégé",
    text: "Un coffre cerclé de fer au milieu de la salle. Les dalles tout autour sont noircies.",
    choices: [
      {
        label: "L'ouvrir quand même",
        outcome: {
          text: "Le piège se déclenche, mais tu repars avec ce qu'il gardait.",
          item: "any",
          healPct: -12,
        },
      },
      {
        label: "Récupérer les ferrures",
        outcome: {
          text: "Le métal se revend bien.",
          fragments: 35,
        },
      },
    ],
  },
  {
    slug: "generic-blesse",
    title: "Un combattant à terre",
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
    slug: "generic-voix",
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
    slug: "generic-colporteur",
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
    slug: "generic-porte",
    title: "Une porte scellée",
    text: "Des chaînes barrent une lourde porte. Derrière, on entend respirer.",
    choices: [
      {
        label: "Briser les chaînes",
        outcome: {
          text: "Ce qui dormait derrière vous coûte cher — mais laisse une relique en tombant.",
          item: "EPIC",
          healPct: -30,
        },
      },
      {
        label: "Renforcer la porte et s'éloigner",
        outcome: {
          text: "Vous consolidez les chaînes. La sérénité vaut bien le détour.",
          healPct: 20,
        },
      },
    ],
  },
  {
    slug: "generic-source",
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
    slug: "generic-pari",
    title: "Un joueur masqué",
    text: "Une silhouette masquée vous barre le passage, des dés à la main. « Un jeu. Tu mises, je donne. »",
    choices: [
      {
        label: "Miser gros",
        outcome: {
          text: "Il tient parole, à sa façon : l'objet est bon, mais vos poches sont vides.",
          fragments: -70,
          item: "EPIC",
        },
      },
      {
        label: "Refuser de jouer",
        outcome: {
          text: "Il s'efface en haussant les épaules. Vous ramassez ce qu'il laisse tomber.",
          fragments: 20,
        },
      },
    ],
  },
  {
    slug: "generic-atelier",
    title: "Un atelier abandonné",
    text: "Des outils rouillent sur un établi. Presque tout est inutilisable.",
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
];
