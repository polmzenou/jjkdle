import type { TowerEvent } from "@/lib/games/tower/events";

/**
 * Évènements de la Tour, univers Chainsaw Man.
 *
 * Mêmes règles d'écriture que `jjk-events` : aucune option gratuite, et le
 * libellé dit l'intention, jamais le résultat.
 */
export const CSM_EVENTS: TowerEvent[] = [
  {
    slug: "csm-carcasse",
    title: "Une carcasse de démon",
    text: "Le corps fume encore au milieu du couloir. Quelque chose brille entre ses côtes, là où le sang n'a pas encore séché.",
    choices: [
      {
        label: "Fouiller la carcasse",
        outcome: {
          text: "Tu en retires un objet poisseux. Le sang du démon, lui, brûle la peau de toute l'escouade.",
          item: "any",
          healPct: -12,
        },
      },
      {
        label: "La signaler à la Sécurité publique",
        outcome: {
          text: "La prime tombe sans un mot de remerciement. C'est toujours ça.",
          fragments: 35,
        },
      },
    ],
  },
  {
    slug: "csm-chasseur-blesse",
    title: "Un chasseur à terre",
    text: "Un chasseur de démons privé, adossé à un distributeur, le bras en charpie. Il vous tend sa carte de visite.",
    choices: [
      {
        label: "Lui donner vos bandages",
        outcome: {
          text: "Il vous laisse sa paie du jour en guise de merci. Vos réserves y sont passées.",
          fragments: 60,
          healPct: -8,
        },
      },
      {
        label: "Appeler une ambulance et filer",
        outcome: {
          text: "Vous profitez de l'attente pour reprendre votre souffle.",
          healPct: 15,
        },
      },
    ],
  },
  {
    slug: "csm-telephone",
    title: "Un téléphone qui sonne",
    text: "Une cabine au milieu de l'étage. Le téléphone sonne sans arrêt, et une voix douce attend que quelqu'un décroche.",
    choices: [
      {
        label: "Décrocher et écouter",
        outcome: {
          text: "La voix te souffle un secret et te laisse un cadeau. Elle a pris quelque chose en échange.",
          item: "RARE",
          healPct: -18,
        },
      },
      {
        label: "Arracher le fil",
        outcome: {
          text: "Le silence retombe. Rien gagné, rien perdu.",
        },
      },
    ],
  },
  {
    slug: "csm-trafiquant",
    title: "Un trafiquant de chair de démon",
    text: "Une valise ouverte sur le capot d'une voiture, des morceaux sous vide. « Ça se greffe très bien, promis. »",
    choices: [
      {
        label: "Payer son prix",
        outcome: {
          text: "Il compte les billets deux fois et vous tend son meilleur article.",
          fragments: -50,
          item: "RARE",
        },
      },
      {
        label: "Marchander âprement",
        outcome: {
          text: "Il finit par lâcher une babiole, en jurant qu'il y perd.",
          fragments: -15,
          item: "COMMON",
        },
      },
    ],
  },
  {
    slug: "csm-contrat",
    title: "Un contrat sur la table",
    text: "Un démon sans visage pousse un papier vers vous. La puissance qu'il propose est réelle. Le prix est écrit en tout petit.",
    choices: [
      {
        label: "Signer le contrat",
        outcome: {
          text: "Le pacte est scellé. La relique est à toi — et le démon a prélevé sa part sur chacun de vous.",
          item: "EPIC",
          healPct: -30,
        },
      },
      {
        label: "Déchirer le papier",
        outcome: {
          text: "Le démon s'évapore en ricanant. Vous repartez entiers, et étrangement apaisés.",
          healPct: 20,
        },
      },
    ],
  },
  {
    slug: "csm-planque",
    title: "Une planque de la Sécurité publique",
    text: "Un appartement banal, un frigo plein, trois futons. Personne n'est revenu ici depuis des jours.",
    choices: [
      {
        label: "Y dormir toute la nuit",
        outcome: {
          text: "L'escouade repart d'aplomb. Le loyer en retard, lui, a été prélevé sur vos poches.",
          healPct: 45,
          fragments: -25,
        },
      },
      {
        label: "Un café et on repart",
        outcome: {
          text: "Un peu de répit, sans plus.",
          healPct: 15,
        },
      },
    ],
  },
  {
    slug: "csm-pari",
    title: "Un démon joueur",
    text: "Une créature à tête de dé vous barre la route. « On joue ? Si tu gagnes, je te donne un truc génial. »",
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
          text: "Il s'en va vexé. Vous ramassez ce qu'il laisse tomber.",
          fragments: 20,
        },
      },
    ],
  },
  {
    slug: "csm-armurerie",
    title: "Une armurerie abandonnée",
    text: "Des caisses de munitions éventrées, des lames tordues. Presque tout est inutilisable.",
    choices: [
      {
        label: "Fouiller les caisses",
        outcome: {
          text: "Vous en tirez quelque chose d'utilisable, au prix d'un long moment à découvert.",
          item: "COMMON",
          healPct: -10,
        },
      },
      {
        label: "Revendre la ferraille",
        outcome: {
          text: "Rien de glorieux, mais ça se revend.",
          fragments: 45,
        },
      },
    ],
  },
];
