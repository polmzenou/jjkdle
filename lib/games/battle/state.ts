import type { BattleState } from "./types";

/**
 * Parse le champ JSON `Lobby.gameState` en `BattleState`. Renvoie `null` si la
 * partie n'a pas encore démarré (gameState vide `{}` au stade WAITING).
 */
export function parseBattleState(value: unknown): BattleState | null {
  if (!value || typeof value !== "object") return null;
  const state = value as Partial<BattleState>;
  if (!state.phase || !state.decks) return null;
  // Compat. : anciens blobs sans `mode` → résolution cumulative par défaut.
  return { mode: "normal", ...state } as BattleState;
}
