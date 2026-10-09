import type { TowerEvent } from "@/lib/games/tower/events";

/**
 * Évènements de la Tour, univers Bleach.
 *
 * Mêmes règles d'écriture que `jjk-events` : aucune option gratuite, et le
 * libellé dit l'intention, jamais le résultat.
 */
export const BLEACH_EVENTS: TowerEvent[] = [
  {
    slug: "bleach-garganta",
    title: "Un Garganta entrouvert",
    text: "Le ciel se déchire sur une bouche noire. De l'autre côté, quelque chose brille dans le sable de Hueco Mundo.",
    choices: [
      {
        label: "Plonger la main dans la brèche",
        outcome: {
          text: "Tes doigts se referment sur un objet froid. Le reiatsu de l'autre monde, lui, écrase toute l'escouade.",
          item: "any",
          healPct: -12,
        },
      },
      {
        label: "Refermer la brèche",
        outcome: {
          text: "Le Garganta se referme et laisse derrière lui des éclats de reishi. Ça se revend.",
          fragments: 35,
        },
      },
    ],
  },
  {
    slug: "bleach-shinigami-blesse",
    title: "Un shinigami à terre",
    text: "Un shinigami de la 11e division, assis contre un mur, le shihakushō en lambeaux. Il sourit quand même.",
    choices: [
      {
        label: "Le soigner avec vos réserves",
        outcome: {
          text: "Il vous laisse sa solde en riant. Vos réserves, elles, y sont passées.",
          fragments: 60,
          healPct: -8,
        },
      },
      {
        label: "Appeler les secours de la division médicale",
        outcome: {
          text: "Les secours arrivent. Vous en profitez pour souffler un moment.",
          healPct: 15,
        },
      },
    ],
  },
  {
    slug: "bleach-zanpakuto",
    title: "La voix d'un zanpakutō",
    text: "Une lame plantée dans le sol murmure ton nom. Elle promet la puissance à qui l'écoutera assez longtemps.",
    choices: [
      {
        label: "L'écouter jusqu'au bout",
        outcome: {
          text: "Ce que tu entends laisse une trace. Et un savoir.",
          item: "RARE",
          healPct: -18,
        },
      },
      {
        label: "S'éloigner sans répondre",
        outcome: {
          text: "La lame se tait. Rien gagné, rien perdu.",
        },
      },
    ],
  },
  {
    slug: "bleach-boutique",
    title: "Une boutique de bonbons louche",
    text: "Un marchand en sandales et chapeau rayé s'évente devant sa boutique. « Articles très spéciaux, prix très spéciaux. »",
    choices: [
      {
        label: "Acheter son article phare",
        outcome: {
          text: "Il empoche tout en riant derrière son éventail et vous tend le paquet.",
          fragments: -50,
          item: "RARE",
        },
      },
      {
        label: "Marchander âprement",
        outcome: {
          text: "Il finit par céder une babiole, l'air ravi de la négociation.",
          fragments: -15,
          item: "COMMON",
        },
      },
    ],
  },
  {
    slug: "bleach-sceau-kido",
    title: "Un sceau de kidō",
    text: "Des bandes de kidō barrent une porte. Derrière, un reiatsu énorme respire lentement.",
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
    slug: "bleach-source",
    title: "Une source chaude souterraine",
    text: "Sous une salle d'entraînement secrète, une source fumante qui soigne les blessures. Le propriétaire n'est pas loin.",
    choices: [
      {
        label: "S'y baigner longuement",
        outcome: {
          text: "L'escouade repart d'aplomb. Le propriétaire, lui, vous a présenté la note.",
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
    slug: "bleach-pari",
    title: "Un pari au Rukongai",
    text: "Un vieil homme tient des paris à l'ombre d'un toit. « Tu mises, je donne. Ici, personne ne triche. Presque. »",
    choices: [
      {
        label: "Miser gros",
        outcome: {
          text: "Vous gagnez, à sa façon : l'objet est bon, mais vos poches sont vides.",
          fragments: -70,
          item: "EPIC",
        },
      },
      {
        label: "Refuser de jouer",
        outcome: {
          text: "Il hausse les épaules. Vous ramassez ce qu'un perdant a laissé tomber.",
          fragments: 20,
        },
      },
    ],
  },
  {
    slug: "bleach-senkaimon",
    title: "Un Senkaimon instable",
    text: "La porte entre les mondes tremble. On peut la traverser de force — ou attendre qu'elle se stabilise.",
    choices: [
      {
        label: "La traverser de force",
        outcome: {
          text: "Le Dangai vous recrache de l'autre côté, avec ce qu'il retenait entre les mains.",
          item: "RARE",
          healPct: -15,
          fragments: 25,
        },
      },
      {
        label: "Attendre qu'elle se calme",
        outcome: {
          text: "Vous passez sans faire de vagues. L'escouade récupère un peu de son calme.",
          healPct: 12,
        },
      },
    ],
  },
];
