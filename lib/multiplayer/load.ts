import "server-only";
import { getCategories, getRoster } from "@/lib/content/queries";
import type { Character } from "@/data/roster/characters";
import type { CategoryConfig } from "@/data/roster/categories";
import type { SerializedLobby } from "./events";
import { serializeLobby } from "./state";
import { findLobby } from "./store";

/** Données nécessaires au rendu d'une page de lobby (état initial + contenu). */
export interface LobbyView {
  lobby: SerializedLobby;
  categories: CategoryConfig[];
  roster: Character[];
}

/** Charge l'état initial d'un lobby pour le Server Component (null si absent). */
export async function loadLobbyView(code: string): Promise<LobbyView | null> {
  const [lobby, categories, roster] = await Promise.all([
    findLobby(code),
    getCategories(),
    getRoster(),
  ]);
  if (!lobby) return null;
  return {
    lobby: serializeLobby(lobby, categories.length),
    categories,
    roster,
  };
}
