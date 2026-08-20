import type { CategoryConfig } from "@/data/roster/categories";

/**
 * Catégories du builder « Build the Perfect Slayer » (Kimetsu no Yaiba).
 *
 * Amorçage d'un univers, pendant de `kny-attributes.ts` pour les attributs :
 * l'édition courante se fait ensuite via /admin (onglet Catégories) ou le
 * panneau admin de la vue du jeu. Ce fichier n'est que le point de départ, il
 * n'est PAS la source de vérité au runtime (c'est la table `Category`).
 *
 * Comme CSM, KNY mélange deux natures de catégories — des STATS (Force physique,
 * Battle IQ, Speed) et des APPARTENANCES (Piliers, Lunes, Corps des pourfendeurs,
 * Nouvelle génération, Sensei). Le moteur s'en fiche : une catégorie est une clé
 * de note, rien de plus.
 *
 * `id` : préfixé par l'univers, comme tout ce que crée `category-store` —
 * `Category.id` est une clé primaire GLOBALE, et c'est aussi la clé utilisée
 * dans le JSON `Character.ratings`, donc immuable après création.
 *
 * `weight` : même amplitude que JJK et CSM (0.9 → 1.6). Seuls les rapports
 * comptent — le score final est une MOYENNE pondérée renormalisée sur 1000, donc
 * ni le nombre de catégories ni la somme des poids ne déplacent l'échelle. KNY
 * en a DIX là où les autres univers en ont neuf : cela ne change pas le barème,
 * seulement la difficulté du sans-faute (une occasion de plus de mal tomber).
 *
 * ⚠️ Une catégorie sans aucun personnage noté BLOQUE le jeu : `drawOne` renvoie
 * `null`, la case ne peut pas se verrouiller, et la partie ne peut jamais
 * atteindre `lockedIds.length === categories.length`. Toute catégorie ajoutée ici
 * doit avoir des notes dans `data/ratings/kny.json` (garde-fou dans kny.test.ts).
 */
export const KNY_CATEGORIES: CategoryConfig[] = [
  {
    id: "kny-pouvoir-sanguinaire",
    label: "Pouvoir sanguinaire",
    description:
      "Puissance du pouvoir sanguinaire d'un démon : portée, létalité, capacité à renverser un combat.",
    weight: 1.4,
    drawCount: 4,
  },
  {
    id: "kny-souffle",
    label: "Souffle",
    description:
      "Maîtrise d'une école de souffle, de ses formes et de la concentration totale.",
    weight: 1.4,
    drawCount: 4,
  },
  {
    id: "kny-force-physique",
    label: "Force physique",
    description: "Puissance brute, endurance au choc et capacité à encaisser.",
    weight: 1.0,
    drawCount: 4,
  },
  {
    id: "kny-lunes",
    label: "Lunes",
    description:
      "Rang et valeur au sein des Douze Lunes démoniaques, supérieures comme inférieures.",
    weight: 1.3,
    drawCount: 4,
  },
  {
    id: "kny-corps-des-pourfendeurs",
    label: "Corps des pourfendeurs",
    description: "Poids réel au sein de l'armée des pourfendeurs de démons.",
    weight: 1.2,
    drawCount: 4,
  },
  {
    id: "kny-piliers",
    label: "Piliers",
    description:
      "Stature en tant que Pilier : le sommet de la hiérarchie des pourfendeurs.",
    weight: 1.6,
    drawCount: 4,
  },
  {
    id: "kny-nouvelle-generation",
    label: "Nouvelle génération",
    description:
      "Valeur parmi la jeune garde formée pendant le récit, et marge de progression.",
    weight: 1.2,
    drawCount: 4,
  },
  {
    id: "kny-sensei",
    label: "Sensei",
    description:
      "Qualité de maître : ce qu'il transmet, et ce que ses élèves deviennent.",
    weight: 0.9,
    drawCount: 4,
  },
  {
    id: "kny-battle-iq",
    label: "Battle IQ",
    description:
      "Lecture du combat, adaptation à un pouvoir inconnu, sang-froid sous pression.",
    weight: 1.2,
    drawCount: 4,
  },
  {
    id: "kny-speed",
    label: "Speed",
    description: "Vitesse de déplacement, de frappe et de réaction.",
    weight: 1.0,
    drawCount: 4,
  },
];
