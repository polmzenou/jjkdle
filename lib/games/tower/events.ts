import type { ItemRarity } from "./items";

/**
 * Nœuds d'ÉVÈNEMENT — module PUR.
 *
 * Un évènement est un texte et deux issues. C'est le seul contenu de la Tour
 * qui soit vraiment écrit à la main, et c'est assumé : le reste du jeu se
 * dérive du roster, mais une situation ne se dérive pas.
 *
 * Le catalogue lui-même est de la DONNÉE D'UNIVERS (`lib/universes/jjk-events`),
 * comme les objets : un anime a ses propres situations. Seule la grammaire des
 * conséquences vit ici, et elle est volontairement étroite — quatre leviers,
 * tous déjà utilisés ailleurs dans le jeu. Un évènement ne peut donc rien faire
 * que le reste du jeu ne sache déjà faire, ce qui interdit les cas particuliers.
 */

export interface EventOutcome {
  /** Ce que le joueur lit une fois son choix fait. */
  text: string;
  /** Fragments gagnés (négatif = perdus, plafonné au solde). */
  fragments?: number;
  /** Soin de l'escouade en % des PV max. Négatif = blessure. */
  healPct?: number;
  /** Objet offert : une rareté précise, ou n'importe laquelle. */
  item?: ItemRarity | "any";
}

export interface EventChoice {
  /** Libellé du bouton. Doit dire l'intention, pas le résultat. */
  label: string;
  outcome: EventOutcome;
}

export interface TowerEvent {
  slug: string;
  title: string;
  /** La situation, 1 à 3 phrases. */
  text: string;
  /** Exactement deux. Un choix à une branche n'est pas un choix. */
  choices: [EventChoice, EventChoice];
}

/**
 * L'évènement d'un nœud, choisi par la graine que l'étage porte
 * (`FloorPlan.eventIndex`).
 *
 * Indexer modulo la taille du catalogue plutôt que de stocker un slug : on peut
 * ajouter des évènements en admin ou en code sans invalider les runs en cours,
 * et le tirage reste reproductible pour une graine donnée.
 */
export function eventFor(
  catalog: readonly TowerEvent[],
  eventIndex: number,
): TowerEvent | null {
  if (catalog.length === 0) return null;
  const index = Math.abs(Math.trunc(eventIndex)) % catalog.length;
  return catalog[index];
}

/** Une issue est-elle exploitable ? (garde de lecture, comme pour les objets) */
export function isValidEvent(event: TowerEvent): boolean {
  return (
    Boolean(event.slug) &&
    Boolean(event.title) &&
    Array.isArray(event.choices) &&
    event.choices.length === 2 &&
    event.choices.every((c) => Boolean(c.label) && Boolean(c.outcome?.text))
  );
}
