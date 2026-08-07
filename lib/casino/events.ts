import type { CasinoTableView } from "./types";

/**
 * Contrat temps réel du casino, partagé client/serveur (aucune dépendance
 * serveur-only ici). Même architecture que lib/multiplayer/events.ts : le
 * serveur est AUTORITAIRE et diffuse un snapshot complet à chaque changement.
 *
 * `tableCue` ne transporte aucune vérité — c'est un déclencheur d'animation
 * immédiat (une carte qui glisse, un jeton qui tombe) pour que le geste d'un
 * joueur se voie chez les autres sans attendre le snapshot. En cas de
 * désaccord, c'est TOUJOURS le snapshot qui fait foi.
 */

export const CASINO_EVENTS = {
  /** Snapshot complet de la table (mise, coup, phase, arrivée, départ). */
  tableState: "table-state",
  /** Cue d'animation. */
  tableCue: "table-cue",
} as const;

export interface TableStatePayload {
  table: CasinoTableView;
}

export interface TableCuePayload {
  kind: "bet" | "deal" | "hit" | "stand" | "double" | "settle";
  seat: number | null;
}

/**
 * Canal de présence d'une table (préfixe `presence-` requis par Pusher).
 *
 * Distinct de `lobbyChannel` (`presence-lobby-…`) et pas seulement par
 * cosmétique : la route d'auth Pusher autorise les canaux de lobby en vérifiant
 * l'appartenance via `findLobby`, qui FILTRE PAR UNIVERS. Le casino étant hors
 * univers, il lui faut son propre préfixe et sa propre vérification, sinon
 * aucune table ne serait jamais autorisée.
 */
export function casinoChannel(code: string): string {
  return `presence-casino-${code}`;
}
