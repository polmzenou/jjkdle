import type { TowerEvent } from "@/lib/games/tower/events";

/**
 * Évènements de la Tour, univers Tokyo Ghoul.
 *
 * Mêmes règles d'écriture que `jjk-events` : aucune option gratuite, et le
 * libellé dit l'intention, jamais le résultat.
 */
export const TG_EVENTS: TowerEvent[] = [
  {
    slug: "tg-mallette",
    title: "Une mallette de quinque",
    text: "Une mallette du CCG abandonnée dans une ruelle. Le verrou a lâché, et quelque chose remue à l'intérieur.",
    choices: [
      {
        label: "L'ouvrir",
        outcome: {
          text: "Tu en tires un objet encore tiède. La quinque, elle, a eu le temps de lacérer toute l'escouade.",
          item: "any",
          healPct: -12,
        },
      },
      {
        label: "La revendre sans l'ouvrir",
        outcome: {
          text: "Un receleur la prend sans poser de questions.",
          fragments: 35,
        },
      },
    ],
  },
  {
    slug: "tg-goule-affamee",
    title: "Une goule affamée",
    text: "Une goule recroquevillée contre un mur, les yeux rouges, tremblante de faim. Elle ne vous attaque pas. Pas encore.",
    choices: [
      {
        label: "Partager vos réserves",
        outcome: {
          text: "Elle vous laisse tout ce qu'elle avait sur elle. Vos réserves, elles, y sont passées.",
          fragments: 60,
          healPct: -8,
        },
      },
      {
        label: "Passer votre chemin",
        outcome: {
          text: "Vous vous éloignez sans bruit, et reprenez votre souffle plus loin.",
          healPct: 15,
        },
      },
    ],
  },
  {
    slug: "tg-murmure",
    title: "Un murmure dans le crâne",
    text: "Une voix féminine rit doucement dans ta tête. Elle te promet la force, si tu la laisses parler assez longtemps.",
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
        label: "La faire taire",
        outcome: {
          text: "La voix se tait. Rien gagné, rien perdu.",
        },
      },
    ],
  },
  {
    slug: "tg-receleur",
    title: "Un receleur du 20e arrondissement",
    text: "Dans l'arrière-boutique d'un masquier, un homme étale des objets récupérés sur des enquêteurs. « Tout doit partir. »",
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
    slug: "tg-cochlea",
    title: "Une cellule de Cochlea",
    text: "Une porte blindée, un numéro effacé. Derrière, quelque chose frappe la paroi avec une patience terrifiante.",
    choices: [
      {
        label: "Ouvrir la cellule",
        outcome: {
          text: "Ce qui en sort vous coûte cher — mais laisse une relique en tombant.",
          item: "EPIC",
          healPct: -30,
        },
      },
      {
        label: "La verrouiller et partir",
        outcome: {
          text: "Vous doublez les verrous. La sérénité vaut bien le détour.",
          healPct: 20,
        },
      },
    ],
  },
  {
    slug: "tg-cafe",
    title: "Un café à l'abri",
    text: "Un petit café discret, une odeur de grains torréfiés. Le gérant vous fait signe d'entrer sans poser de questions.",
    choices: [
      {
        label: "S'y poser longuement",
        outcome: {
          text: "L'escouade repart d'aplomb. L'addition, elle, est salée.",
          healPct: 45,
          fragments: -25,
        },
      },
      {
        label: "Un café à emporter",
        outcome: {
          text: "Un peu de répit, sans plus.",
          healPct: 15,
        },
      },
    ],
  },
  {
    slug: "tg-restaurant",
    title: "Une invitation au Restaurant",
    text: "Un homme élégant vous tend un carton d'invitation. « Un jeu entre gourmets. Le gagnant repart avec un trésor. »",
    choices: [
      {
        label: "Miser gros",
        outcome: {
          text: "Vous gagnez — à sa façon : le trésor est bon, la morsure aussi.",
          fragments: -70,
          item: "EPIC",
        },
      },
      {
        label: "Décliner l'invitation",
        outcome: {
          text: "Il s'éloigne, déçu. Vous ramassez ce qu'il a laissé tomber.",
          fragments: 20,
        },
      },
    ],
  },
  {
    slug: "tg-barrage",
    title: "Un barrage du CCG",
    text: "Des enquêteurs bloquent la rue, quinques à la main. On peut forcer le passage — ou filer par les égouts.",
    choices: [
      {
        label: "Forcer le barrage",
        outcome: {
          text: "Le barrage cède. Ce qu'ils gardaient vous retombe dessus, et entre les mains.",
          item: "RARE",
          healPct: -15,
          fragments: 25,
        },
      },
      {
        label: "Passer par les égouts",
        outcome: {
          text: "Vous passez sans faire de vagues. L'escouade récupère un peu de son calme.",
          healPct: 12,
        },
      },
    ],
  },
];
