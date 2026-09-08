import type { CategoryConfig } from "@/data/roster/categories";

/**
 * Catégories du builder « Build the Perfect Shinigami » (Bleach).
 *
 * Amorçage d'un univers, pendant de `bleach-attributes.ts` pour les attributs :
 * l'édition courante se fait ensuite via /admin (onglet Catégories) ou le
 * panneau admin de la vue du jeu. Ce fichier n'est que le point de départ, il
 * n'est PAS la source de vérité au runtime (c'est la table `Category`).
 *
 * Comme CSM, KNY et TG, Bleach mélange deux natures de catégories — des STATS
 * (Force physique, Battle IQ, Vitesse, Endurance, Reiatsu) et des APPARTENANCES
 * (Gotei 13, Hollows & Arrancar, Quincy). Le moteur s'en fiche : une catégorie
 * est une clé de note, rien de plus. Les appartenances portent ici une charge
 * supplémentaire : elles remplacent les hiérarchies de faction que la grille de
 * Bleachdle ne modélise pas (numéro d'Espada, lettre de Schrift) — cf. le
 * commentaire d'en-tête de `bleach-attributes.ts`.
 *
 * `id` : préfixé par l'univers, comme tout ce que crée `category-store` —
 * `Category.id` est une clé primaire GLOBALE, et c'est aussi la clé utilisée
 * dans le JSON `Character.ratings`, donc immuable après création.
 *
 * ⚠️ Les NEUF premières sont mappées sur les neuf archétypes de la Tour dans
 * `bleach.ts` (`tower.categoryArchetypes`). Renommer un id sans le reporter
 * là-bas ne lève AUCUNE erreur : tout le roster retombe simplement sur
 * l'archétype par défaut, et les neuf capacités disparaissent en silence
 * (garde-fou dans `lib/games/tower/config.test.ts`).
 *
 * `weight` : même amplitude que les autres univers (0.9 → 1.6). Seuls les
 * rapports comptent — le score final est une MOYENNE pondérée renormalisée sur
 * 1000, donc ni le nombre de catégories ni la somme des poids ne déplacent
 * l'échelle.
 *
 * ⚠️ Une catégorie sans aucun personnage noté BLOQUE le jeu : `drawOne` renvoie
 * `null`, la case ne peut pas se verrouiller, et la partie ne peut jamais
 * atteindre `lockedIds.length === categories.length`. Toute catégorie ajoutée ici
 * doit avoir des notes pour au moins `drawCount` personnages du roster Bleach.
 */
export const BLEACH_CATEGORIES: CategoryConfig[] = [
  {
    id: "bleach-zanpakuto",
    label: "Zanpakutō",
    description:
      "Puissance et polyvalence de la lame et de son shikai : portée, létalité, capacité à renverser un combat à elle seule.",
    weight: 1.4,
    drawCount: 4,
  },
  {
    id: "bleach-bankai",
    label: "Bankai",
    description:
      "Maîtrise de la libération ultime — bankai, Resurrección ou Vollständig : ce qui sort quand il n'y a plus rien à garder en réserve.",
    weight: 1.6,
    drawCount: 4,
  },
  {
    id: "bleach-reiatsu",
    label: "Reiatsu",
    description:
      "Volume et densité de la pression spirituelle : la réserve, et le poids qu'elle fait peser sur l'adversaire avant même le premier échange.",
    weight: 1.3,
    drawCount: 4,
  },
  {
    id: "bleach-kido",
    label: "Kidō",
    description:
      "Maîtrise des voies de destruction et d'entrave, incantations sautées comprises.",
    weight: 1.2,
    drawCount: 4,
  },
  {
    id: "bleach-vitesse",
    label: "Vitesse",
    description:
      "Shunpo, sonído, hirenkyaku : vitesse de déplacement, de frappe et de réaction.",
    weight: 1.0,
    drawCount: 4,
  },
  {
    id: "bleach-force-physique",
    label: "Force physique",
    description: "Puissance brute au corps à corps et capacité à encaisser.",
    weight: 1.0,
    drawCount: 4,
  },
  {
    id: "bleach-battle-iq",
    label: "Battle IQ",
    description:
      "Lecture du combat, adaptation à un pouvoir inconnu, sang-froid face à une illusion.",
    weight: 1.2,
    drawCount: 4,
  },
  {
    id: "bleach-endurance",
    label: "Endurance",
    description:
      "Ce qu'il faut infliger avant que le personnage tombe — et ce qu'il continue à faire après.",
    weight: 1.1,
    drawCount: 4,
  },
  {
    id: "bleach-hollows",
    label: "Hollows & Arrancar",
    description:
      "Stature dans la chaîne alimentaire du Hueco Mundo, du Menos à l'Espada — et, pour un shinigami, ce que son hollow intérieur lui apporte.",
    weight: 1.5,
    drawCount: 4,
  },
  {
    id: "bleach-gotei-13",
    label: "Gotei 13",
    description:
      "Poids réel au sein des treize divisions du Sereitei, capitaines comme officiers gradés.",
    weight: 1.3,
    drawCount: 4,
  },
  {
    id: "bleach-quincy",
    label: "Quincy",
    description:
      "Rang et valeur parmi les archers de reishi, des derniers survivants aux Sternritter du Wandenreich.",
    weight: 1.3,
    drawCount: 4,
  },
];
