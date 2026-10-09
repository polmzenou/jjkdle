import { isValidEvent, type TowerEvent } from "./events";
import { GENERIC_EVENTS } from "./generic-events";
import { JJK_EVENTS } from "@/lib/universes/jjk-events";
import { CSM_EVENTS } from "@/lib/universes/csm-events";
import { AOT_EVENTS } from "@/lib/universes/aot-events";
import { KNY_EVENTS } from "@/lib/universes/kny-events";
import { TG_EVENTS } from "@/lib/universes/tg-events";
import { BLEACH_EVENTS } from "@/lib/universes/bleach-events";

/** Catalogue d'évènements par slug d'univers. */
export const EVENT_CATALOGS: Record<string, TowerEvent[]> = {
  jjk: JJK_EVENTS,
  csm: CSM_EVENTS,
  aot: AOT_EVENTS,
  kny: KNY_EVENTS,
  tg: TG_EVENTS,
  bleach: BLEACH_EVENTS,
};

/**
 * Évènements d'un univers.
 *
 * En CODE et non en base, contrairement aux objets : un évènement est un texte
 * de trois lignes et deux issues, il n'y a rien à y régler au quotidien.
 *
 * ⚠️ Jamais de liste vide : un nœud « Rencontre » sans catalogue ouvrait un
 * écran blanc et bloquait la run (c'était le cas de tous les univers hors JJK).
 * Un univers sans catalogue propre retombe sur `GENERIC_EVENTS`.
 */
export function eventsFor(slug: string): TowerEvent[] {
  const own = (EVENT_CATALOGS[slug] ?? []).filter(isValidEvent);
  return own.length > 0 ? own : GENERIC_EVENTS;
}
