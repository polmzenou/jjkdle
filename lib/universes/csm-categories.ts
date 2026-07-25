import type { CategoryConfig } from "@/data/roster/categories";

/**
 * Catégories du builder « Build the Perfect Devil » (Chainsaw Man).
 *
 * Amorçage d'un univers, pendant de `jjk-attributes.ts` pour les attributs :
 * l'édition courante se fait ensuite via /admin (onglet Catégories) ou le
 * panneau admin de la vue du jeu. Ce fichier n'est que le point de départ, il
 * n'est PAS la source de vérité au runtime (c'est la table `Category`).
 *
 * Différence assumée avec JJK, dont les 9 catégories sont toutes des axes de
 * STATS : CSM en mélange deux natures — des stats (Combat, Vitesse, Hax) et des
 * appartenances (Division 4, Devils, Devil Hunters, Antagonistes, Coéquipier).
 * Le moteur s'en fiche : une catégorie est une clé de note, rien de plus.
 *
 * `id` : préfixé par l'univers, comme tout ce que crée `category-store` —
 * `Category.id` est une clé primaire GLOBALE, et c'est aussi la clé utilisée
 * dans le JSON `Character.ratings`, donc immuable après création.
 *
 * `weight` : même amplitude que JJK (0.9 → 1.6). Seuls les rapports comptent —
 * le score final est une MOYENNE pondérée renormalisée sur 1000, donc ni le
 * nombre de catégories ni la somme des poids ne déplacent l'échelle.
 */
export const CSM_CATEGORIES: CategoryConfig[] = [
  {
    id: "csm-combat-overall",
    label: "Combat / Overall",
    description: "Niveau global au combat, toutes armes et contrats confondus.",
    weight: 1.6,
    drawCount: 4,
  },
  {
    id: "csm-hax",
    label: "Hax",
    description: "Pouvoirs qui contournent les règles plutôt que la puissance.",
    weight: 1.4,
    drawCount: 4,
  },
  {
    id: "csm-devils",
    label: "Devils",
    description: "Puissance en tant que démon (ou hybride assumant sa part).",
    weight: 1.3,
    drawCount: 4,
  },
  {
    id: "csm-devil-hunters",
    label: "Devil Hunters",
    description: "Efficacité comme chasseur de démons, sur le terrain.",
    weight: 1.2,
    drawCount: 4,
  },
  {
    id: "csm-antagonistes",
    label: "Antagonistes",
    description: "Menace représentée en tant qu'antagoniste.",
    weight: 1.2,
    drawCount: 4,
  },
  {
    id: "csm-speed",
    label: "Speed",
    description: "Vitesse de déplacement et de réaction au combat.",
    weight: 1.0,
    drawCount: 4,
  },
  {
    id: "csm-division-4",
    label: "Division 4",
    description: "Poids dans la 4e division des Chasseurs Publics.",
    weight: 1.0,
    drawCount: 4,
  },
  {
    id: "csm-hybrid",
    label: "Hybride",
    description: "Valeur en tant qu'hybride.",
    weight: 1.2,
    drawCount: 4,
  },
  {
    id: "csm-coequipier",
    label: "Coéquipier",
    description: "Valeur en équipe : fiabilité, synergie, sang-froid.",
    weight: 0.9,
    drawCount: 4,
  },
];
