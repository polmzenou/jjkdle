/**
 * ÉCHANGES de cartes entre amis — règles PURES (aucun accès base), partagées
 * par le serveur (création ET acceptation d'une offre) et le composeur client.
 *
 * - seuls des DOUBLONS circulent : `quantity ≤ count - 1` pour chaque carte ;
 * - 1 à `MAX_TRADE_CARDS` exemplaires de chaque côté (échange, pas un don) ;
 * - toutes les cartes appartiennent à l'univers de l'offre ;
 * - jamais de coins (pas de blanchiment de coins entre comptes).
 */

export const MAX_TRADE_CARDS = 5;
export const MAX_PENDING_TRADES = 10;
export const TRADE_MESSAGE_MAX = 200;

export interface TradeLineInput {
  characterId: string;
  quantity: number;
}

export type TradeLinesCheck =
  | { ok: true; lines: Map<string, number> }
  | { ok: false; error: string };

/**
 * Valide et NORMALISE un côté de l'offre (les lignes sur un même perso sont
 * additionnées).
 *
 * @param lines        lignes reçues (non fiables)
 * @param counts       exemplaires possédés par le propriétaire de ce côté
 * @param universeIds  personnages de l'univers de l'offre
 * @param who          « Tu » / le pseudo de l'ami, pour les messages d'erreur
 */
export function validateTradeLines(
  lines: readonly TradeLineInput[],
  counts: ReadonlyMap<string, number>,
  universeIds: ReadonlySet<string>,
  who: string,
): TradeLinesCheck {
  const merged = new Map<string, number>();
  for (const line of lines) {
    if (
      !line ||
      typeof line.characterId !== "string" ||
      !Number.isInteger(line.quantity) ||
      line.quantity < 1
    ) {
      return { ok: false, error: "Offre invalide." };
    }
    if (!universeIds.has(line.characterId)) {
      return { ok: false, error: "Carte hors de cet univers." };
    }
    merged.set(line.characterId, (merged.get(line.characterId) ?? 0) + line.quantity);
  }

  const total = [...merged.values()].reduce((a, b) => a + b, 0);
  if (total < 1) {
    return { ok: false, error: "Chaque côté de l'échange doit contenir au moins une carte." };
  }
  if (total > MAX_TRADE_CARDS) {
    return { ok: false, error: `${MAX_TRADE_CARDS} cartes maximum de chaque côté.` };
  }

  for (const [id, quantity] of merged) {
    if (quantity > (counts.get(id) ?? 0) - 1) {
      return {
        ok: false,
        error: `${who} n'${who === "Tu" ? "as" : "a"} pas assez de doublons pour cet échange.`,
      };
    }
  }
  return { ok: true, lines: merged };
}

/** Message optionnel joint à l'offre : trim, longueur max, vide → null. */
export function normalizeTradeMessage(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const msg = raw.trim().slice(0, TRADE_MESSAGE_MAX);
  return msg || null;
}
