import type { TowerEvent } from "@/lib/games/tower/events";

/**
 * Évènements de la Tour, univers L'Attaque des Titans.
 *
 * Mêmes règles d'écriture que `jjk-events` : aucune option gratuite, et le
 * libellé dit l'intention, jamais le résultat.
 */
export const AOT_EVENTS: TowerEvent[] = [
  {
    slug: "aot-caisse",
    title: "Une caisse de ravitaillement",
    text: "Une caisse du Bataillon gît au milieu d'un champ. Un titan rôde à quelques dizaines de mètres, le dos tourné.",
    choices: [
      {
        label: "L'ouvrir sur place",
        outcome: {
          text: "Tu mets la main sur quelque chose d'utile. Le titan s'est retourné avant que vous ne soyez loin.",
          item: "any",
          healPct: -12,
        },
      },
      {
        label: "La traîner jusqu'au mur",
        outcome: {
          text: "Le contenu est abîmé, mais la Garnison vous le rachète.",
          fragments: 35,
        },
      },
    ],
  },
  {
    slug: "aot-soldat-blesse",
    title: "Un soldat à terre",
    text: "Un soldat de la Garnison, la jambe prise sous une poutre. Ses bouteilles de gaz sont encore pleines.",
    choices: [
      {
        label: "Le dégager et le soigner",
        outcome: {
          text: "Il vous laisse sa solde en remerciement. Vos réserves, elles, y sont passées.",
          fragments: 60,
          healPct: -8,
        },
      },
      {
        label: "Tirer une fusée et continuer",
        outcome: {
          text: "Les secours arrivent. Vous en profitez pour souffler un moment.",
          healPct: 15,
        },
      },
    ],
  },
  {
    slug: "aot-chemins",
    title: "Le sable des Chemins",
    text: "Le sol se change en sable blanc sous un ciel d'étoiles. Une petite fille vous observe en silence, et des voix vous appellent.",
    choices: [
      {
        label: "Suivre les voix",
        outcome: {
          text: "Tu reviens avec un souvenir qui n'est pas le tien. Et un savoir.",
          item: "RARE",
          healPct: -18,
        },
      },
      {
        label: "Se forcer à se réveiller",
        outcome: {
          text: "Vous rouvrez les yeux au même endroit. Rien gagné, rien perdu.",
        },
      },
    ],
  },
  {
    slug: "aot-souterrain",
    title: "Un marchand de la ville souterraine",
    text: "Sous une lanterne, un homme maigre étale de l'équipement volé à la Brigade spéciale. « Pas de questions. »",
    choices: [
      {
        label: "Payer son prix",
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
    slug: "aot-titan-endormi",
    title: "Un titan endormi",
    text: "Un titan immense dort adossé à un mur, la nuque offerte. Quelque chose brille entre ses dents.",
    choices: [
      {
        label: "Viser la nuque",
        outcome: {
          text: "Il s'effondre dans un nuage de vapeur — après s'être débattu. La relique est à vous.",
          item: "EPIC",
          healPct: -30,
        },
      },
      {
        label: "Le contourner en silence",
        outcome: {
          text: "Vous passez sans un bruit, et prenez le temps de souffler.",
          healPct: 20,
        },
      },
    ],
  },
  {
    slug: "aot-ferme",
    title: "Une ferme intacte",
    text: "Une ferme debout, une cheminée encore chaude. Pas un titan à l'horizon. C'est trop calme.",
    choices: [
      {
        label: "Y passer la nuit",
        outcome: {
          text: "L'escouade repart d'aplomb. Le fermier, lui, vous a fait payer le gîte.",
          healPct: 45,
          fragments: -25,
        },
      },
      {
        label: "Se ravitailler et repartir",
        outcome: {
          text: "Un peu de répit, sans plus.",
          healPct: 15,
        },
      },
    ],
  },
  {
    slug: "aot-pari",
    title: "Un pari de caserne",
    text: "Des recrues jouent aux dés sur une caisse retournée. « Une partie ? Le gagnant repart avec le lot du capitaine. »",
    choices: [
      {
        label: "Miser gros",
        outcome: {
          text: "Vous raflez le lot — après avoir vidé vos poches pour rester à la table.",
          fragments: -70,
          item: "EPIC",
        },
      },
      {
        label: "Refuser de jouer",
        outcome: {
          text: "Un perdant vous glisse quelques pièces pour que vous gardiez le silence.",
          fragments: 20,
        },
      },
    ],
  },
  {
    slug: "aot-atelier",
    title: "Un atelier d'équipement",
    text: "Des harnais tridimensionnels pendent au plafond, rongés par la rouille. Presque tout est inutilisable.",
    choices: [
      {
        label: "Récupérer des pièces",
        outcome: {
          text: "Vous en tirez quelque chose d'utilisable, au prix d'un long moment à découvert.",
          item: "COMMON",
          healPct: -10,
        },
      },
      {
        label: "Emporter les bouteilles de gaz",
        outcome: {
          text: "Rien de glorieux, mais ça se revend.",
          fragments: 45,
        },
      },
    ],
  },
];
