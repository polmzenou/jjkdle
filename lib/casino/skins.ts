/**
 * Catalogue des DOS DE CARTE. Source de vérité = code, comme les cadres
 * (lib/frames/definitions.ts) et les titres : aucune table dédiée.
 *
 * C'est la SEULE couture d'abstraction du visuel des cartes. Tout le rendu passe
 * par `resolveCardBack(id)` : le jour où les dos deviennent uploadables depuis
 * l'admin, seule cette fonction change (elle ira lire une table au lieu de ce
 * registre) et aucun composant n'est touché.
 *
 * Un dos est 100 % CSS — pas d'image à héberger, pas de requête réseau, et il
 * suit la palette du casino sans retouche.
 */

export interface CardBackDefinition {
  id: string;
  label: string;
  description: string;
  /** Classes Tailwind appliquées à la face arrière d'une carte. */
  backClass: string;
  /** Motif optionnel superposé, en CSS inline (background/backgroundSize). */
  pattern?: { backgroundImage: string; backgroundSize: string };
}

/** Dos servi quand rien n'est configuré, ou quand l'id configuré est inconnu. */
export const DEFAULT_CARD_BACK = "classic";

export const CARD_BACKS: CardBackDefinition[] = [
  {
    id: DEFAULT_CARD_BACK,
    label: "Classique",
    description: "Dos rouge et blanc, la carte de casino de tout le monde.",
    backClass:
      "bg-gradient-to-br from-red-800 to-red-950 ring-1 ring-inset ring-white/25",
    pattern: {
      backgroundImage:
        "repeating-linear-gradient(45deg, rgb(255 255 255 / 0.14) 0 2px, transparent 2px 7px)",
      backgroundSize: "auto",
    },
  },
  {
    id: "felt",
    label: "Feutre",
    description: "Vert tapis, assorti à la table.",
    backClass:
      "bg-gradient-to-br from-domain-dark to-void-900 ring-1 ring-inset ring-domain-light/30",
    pattern: {
      backgroundImage:
        "radial-gradient(rgb(255 255 255 / 0.16) 1px, transparent 1px)",
      backgroundSize: "8px 8px",
    },
  },
  {
    id: "gold",
    label: "Or",
    description: "Liseré doré sur fond noir, pour les grosses mises.",
    backClass:
      "bg-gradient-to-br from-cursed-dark to-void ring-1 ring-inset ring-cursed-light/50",
    pattern: {
      backgroundImage:
        "repeating-linear-gradient(-45deg, rgb(250 204 21 / 0.18) 0 1px, transparent 1px 8px)",
      backgroundSize: "auto",
    },
  },
];

const BY_ID = new Map(CARD_BACKS.map((back) => [back.id, back]));

/**
 * Dos de carte correspondant à un id, avec repli sur le dos par défaut.
 *
 * Le repli n'est pas défensif pour rien : le dos configuré vit en base
 * (`AppConfig`), donc il peut survivre au retrait de sa définition du code. Une
 * table doit rester jouable dans ce cas.
 */
export function resolveCardBack(id: string | null | undefined): CardBackDefinition {
  return (id ? BY_ID.get(id) : undefined) ?? BY_ID.get(DEFAULT_CARD_BACK)!;
}
