import type { CategoryConfig } from "@/data/roster/categories";

/**
 * Catégories du builder « Build the Perfect Ghoul » (Tokyo Ghoul).
 *
 * Amorçage d'un univers, pendant de `tg-attributes.ts` pour les attributs :
 * l'édition courante se fait ensuite via /admin (onglet Catégories) ou le
 * panneau admin de la vue du jeu. Ce fichier n'est que le point de départ, il
 * n'est PAS la source de vérité au runtime (c'est la table `Category`).
 *
 * Comme CSM et KNY, TG mélange deux natures de catégories — des STATS (Force
 * physique, Battle IQ, Vitesse, Régénération, Mental) et des APPARTENANCES
 * (CCG, Arbre Aogiri, Anteiku, Semi-goules). Le moteur s'en fiche : une catégorie
 * est une clé de note, rien de plus.
 *
 * `id` : préfixé par l'univers, comme tout ce que crée `category-store` —
 * `Category.id` est une clé primaire GLOBALE, et c'est aussi la clé utilisée
 * dans le JSON `Character.ratings`, donc immuable après création.
 *
 * `weight` : même amplitude que JJK, CSM et KNY (0.9 → 1.6). Seuls les rapports
 * comptent — le score final est une MOYENNE pondérée renormalisée sur 1000, donc
 * ni le nombre de catégories ni la somme des poids ne déplacent l'échelle.
 *
 * ⚠️ Une catégorie sans aucun personnage noté BLOQUE le jeu : `drawOne` renvoie
 * `null`, la case ne peut pas se verrouiller, et la partie ne peut jamais
 * atteindre `lockedIds.length === categories.length`. Toute catégorie ajoutée ici
 * doit avoir des notes pour au moins `drawCount` personnages du roster TG.
 */
export const TG_CATEGORIES: CategoryConfig[] = [
  {
    id: "tg-kagune",
    label: "Kagune",
    description:
      "Puissance et polyvalence du kagune — ou de la quinque, pour un enquêteur : portée, létalité, capacité à renverser un combat.",
    weight: 1.4,
    drawCount: 4,
  },
  {
    id: "tg-regeneration",
    label: "Régénération",
    description:
      "Vitesse de guérison et réserve de cellules Rc : ce qu'il faut encaisser avant de tomber.",
    weight: 1.3,
    drawCount: 4,
  },
  {
    id: "tg-force-physique",
    label: "Force physique",
    description: "Puissance brute, endurance au choc et capacité à encaisser.",
    weight: 1.0,
    drawCount: 4,
  },
  {
    id: "tg-speed",
    label: "Vitesse",
    description: "Vitesse de déplacement, de frappe et de réaction.",
    weight: 1.0,
    drawCount: 4,
  },
  {
    id: "tg-battle-iq",
    label: "Battle IQ",
    description:
      "Lecture du combat, adaptation à un kagune inconnu, sang-froid sous pression.",
    weight: 1.2,
    drawCount: 4,
  },
  {
    id: "tg-semi-goules",
    label: "Semi-goules",
    description:
      "Stature parmi les hybrides — goules à un œil et transformés du CCG : le sommet de la chaîne alimentaire.",
    weight: 1.6,
    drawCount: 4,
  },
  {
    id: "tg-ccg",
    label: "CCG",
    description:
      "Poids réel au sein de la Commission de contre-mesures contre les goules.",
    weight: 1.3,
    drawCount: 4,
  },
  {
    id: "tg-aogiri",
    label: "Arbre Aogiri",
    description:
      "Rang et valeur au sein de l'organisation de l'Arbre Aogiri, cadres comme exécutants.",
    weight: 1.3,
    drawCount: 4,
  },
  {
    id: "tg-anteiku",
    label: "Anteiku",
    description:
      "Place dans le café du 20e arrondissement et dans la communauté qu'il abrite.",
    weight: 1.1,
    drawCount: 4,
  },
  {
    id: "tg-mental",
    label: "Mental",
    description:
      "Résistance à la faim, à la torture et à la perte : ce qui reste debout quand le corps lâche.",
    weight: 0.9,
    drawCount: 4,
  },
];
