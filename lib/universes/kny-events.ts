import type { TowerEvent } from "@/lib/games/tower/events";

/**
 * Évènements de la Tour, univers Demon Slayer.
 *
 * Mêmes règles d'écriture que `jjk-events` : aucune option gratuite, et le
 * libellé dit l'intention, jamais le résultat.
 */
export const KNY_EVENTS: TowerEvent[] = [
  {
    slug: "kny-maison-tambour",
    title: "Une pièce qui tourne",
    text: "Un tambour résonne quelque part et la pièce bascule sur le côté. Un coffret glisse vers vous, puis s'éloigne.",
    choices: [
      {
        label: "Plonger pour le rattraper",
        outcome: {
          text: "Tu refermes la main dessus. La pièce, elle, a projeté toute l'escouade contre les murs.",
          item: "any",
          healPct: -12,
        },
      },
      {
        label: "Ramasser ce qui traîne au sol",
        outcome: {
          text: "Quelques pièces de monnaie et un bracelet. Ça se revend.",
          fragments: 35,
        },
      },
    ],
  },
  {
    slug: "kny-pourfendeur-blesse",
    title: "Un pourfendeur à terre",
    text: "Un pourfendeur de démons, le haori déchiré, sa lame brisée à côté de lui. Son corbeau tourne au-dessus en criant.",
    choices: [
      {
        label: "Le soigner avec vos réserves",
        outcome: {
          text: "Il vous laisse sa bourse en remerciement. Vos réserves, elles, y sont passées.",
          fragments: 60,
          healPct: -8,
        },
      },
      {
        label: "Laisser les Kakushi s'en charger",
        outcome: {
          text: "Les Kakushi arrivent vite. Vous en profitez pour souffler un moment.",
          healPct: 15,
        },
      },
    ],
  },
  {
    slug: "kny-biwa",
    title: "Les notes d'un biwa",
    text: "Une mélodie lente traverse les cloisons. À chaque note, les couloirs se réarrangent autour de vous.",
    choices: [
      {
        label: "Suivre la musique",
        outcome: {
          text: "Elle vous mène à une salle oubliée, et à ce qu'elle cachait. Le chemin a laissé des traces.",
          item: "RARE",
          healPct: -18,
        },
      },
      {
        label: "Se boucher les oreilles et courir",
        outcome: {
          text: "Vous traversez sans rien entendre. Rien gagné, rien perdu.",
        },
      },
    ],
  },
  {
    slug: "kny-forgeron",
    title: "Un forgeron masqué",
    text: "Un homme au masque de hyottoko aiguise une lame au bord du chemin. « Je vends. Mais je ne négocie pas volontiers. »",
    choices: [
      {
        label: "Lui confier votre bourse",
        outcome: {
          text: "Il empoche tout et vous tend son ouvrage sans un mot.",
          fragments: -50,
          item: "RARE",
        },
      },
      {
        label: "Marchander âprement",
        outcome: {
          text: "Il finit par céder une babiole, en vous menaçant de son marteau.",
          fragments: -15,
          item: "COMMON",
        },
      },
    ],
  },
  {
    slug: "kny-demon-enchaine",
    title: "Un démon enchaîné",
    text: "Des chaînes de glycine retiennent un démon contre un pilier. L'aube approche, et il porte quelque chose autour du cou.",
    choices: [
      {
        label: "L'affronter maintenant",
        outcome: {
          text: "Il arrache ses chaînes avant de tomber. Ce qu'il portait est à vous.",
          item: "EPIC",
          healPct: -30,
        },
      },
      {
        label: "Attendre le lever du soleil",
        outcome: {
          text: "Le soleil fait le travail. Vous en profitez pour vous reposer.",
          healPct: 20,
        },
      },
    ],
  },
  {
    slug: "kny-maison-glycine",
    title: "Une maison aux glycines",
    text: "Une vieille dame vous ouvre la porte en s'inclinant. Le bain est chaud, les futons sont prêts.",
    choices: [
      {
        label: "Y rester toute la nuit",
        outcome: {
          text: "L'escouade repart d'aplomb. Vous laissez une offrande généreuse en partant.",
          healPct: 45,
          fragments: -25,
        },
      },
      {
        label: "Une tasse de thé et on repart",
        outcome: {
          text: "Un peu de répit, sans plus.",
          healPct: 15,
        },
      },
    ],
  },
  {
    slug: "kny-offrande",
    title: "Un autel de montagne",
    text: "Un petit sanctuaire couvert de mousse. Quelqu'un y a déposé une bourse bien remplie.",
    choices: [
      {
        label: "Prendre l'offrande",
        outcome: {
          text: "Vous empochez tout. La montagne vous le fait payer sur le chemin.",
          fragments: 70,
          healPct: -10,
        },
      },
      {
        label: "Ajouter la vôtre",
        outcome: {
          text: "Vous laissez quelques pièces. Quelque chose, quelque part, vous rend la pareille.",
          fragments: -30,
          item: "RARE",
        },
      },
    ],
  },
  {
    slug: "kny-depot",
    title: "Un dépôt des Kakushi",
    text: "Des caisses de bandages, de remèdes et de lames émoussées. Presque tout a été pillé.",
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
        label: "Emporter les provisions",
        outcome: {
          text: "Rien de glorieux, mais ça se revend.",
          fragments: 45,
        },
      },
    ],
  },
];
