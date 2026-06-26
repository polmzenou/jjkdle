import "server-only";
import { getRoster } from "@/lib/content/queries";
import type { Character } from "@/data/roster/characters";
import type { SerializedLobby } from "@/lib/multiplayer/events";
import { serializeLobby } from "@/lib/multiplayer/state";
import { findLobby } from "@/lib/multiplayer/store";
import { parseBattleState } from "./state";
import type { BattleState } from "./types";

/** Données initiales d'une page de lobby battle (état + état de jeu + roster). */
export interface BattleView {
  lobby: SerializedLobby;
  gameState: BattleState | null;
  roster: Character[];
}

/** Charge l'état initial d'un lobby « JJK Random Battle » (null si absent). */
export async function loadBattleView(code: string): Promise<BattleView | null> {
  const [lobby, roster] = await Promise.all([findLobby(code), getRoster()]);
  // Garde le mode : un lobby d'un autre jeu (builder) ne doit pas s'ouvrir ici.
  if (!lobby || lobby.gameId !== "battle") return null;
  return {
    // Pas de notion de manches en battle → totalRounds = 0.
    lobby: serializeLobby(lobby, 0),
    gameState: parseBattleState(lobby.gameState),
    roster,
  };
}
