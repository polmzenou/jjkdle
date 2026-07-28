import { describe, it, expect } from "vitest";
import { DECK_SIZE, deckMultipliers, sanitizeDeck } from "./deck";
import { CARD_RARITIES, cardRarityStyle, rarityOfTier } from "./rarity";

describe("rarityOfTier", () => {
  it("mappe les 6 tiers canoniques", () => {
    expect(rarityOfTier("4minus")).toBe("common");
    expect(rarityOfTier("4")).toBe("uncommon");
    expect(rarityOfTier("3")).toBe("rare");
    expect(rarityOfTier("2")).toBe("epic");
    expect(rarityOfTier("1")).toBe("legendary");
    expect(rarityOfTier("s")).toBe("exotic");
  });

  it("tolère les écritures alternatives (via normalizeTier)", () => {
    expect(rarityOfTier("S")).toBe("exotic");
    expect(rarityOfTier(" 4- ")).toBe("common");
    expect(rarityOfTier("4moins")).toBe("common");
  });

  it("retombe sur common plutôt que de jeter sur un tier illisible", () => {
    expect(rarityOfTier("")).toBe("common");
    expect(rarityOfTier(null)).toBe("common");
    expect(rarityOfTier("zzz")).toBe("common");
  });
});

describe("barème de rareté", () => {
  it("est strictement croissant en valeur de revente et en bonus d'XP", () => {
    for (let i = 1; i < CARD_RARITIES.length; i += 1) {
      const prev = cardRarityStyle(CARD_RARITIES[i - 1]!);
      const curr = cardRarityStyle(CARD_RARITIES[i]!);
      expect(curr.sellValue).toBeGreaterThan(prev.sellValue);
      expect(curr.deckXpPct).toBeGreaterThan(prev.deckXpPct);
    }
  });

  it("applique les valeurs de revente demandées", () => {
    expect(cardRarityStyle("common").sellValue).toBe(2);
    expect(cardRarityStyle("uncommon").sellValue).toBe(5);
    expect(cardRarityStyle("rare").sellValue).toBe(8);
    expect(cardRarityStyle("epic").sellValue).toBe(10);
    expect(cardRarityStyle("legendary").sellValue).toBe(15);
    expect(cardRarityStyle("exotic").sellValue).toBe(50);
  });

  it("ne colore que l'exotic en arc-en-ciel", () => {
    expect(cardRarityStyle("exotic").rainbow).toBe(true);
    for (const rarity of CARD_RARITIES.filter((r) => r !== "exotic")) {
      expect(cardRarityStyle(rarity).rainbow).toBe(false);
    }
  });
});

describe("deckMultipliers", () => {
  it("ne donne aucun bonus sur un deck vide", () => {
    expect(deckMultipliers([])).toEqual({ xp: 1, coin: 1, xpPct: 0, coinPct: 0 });
  });

  it("additionne les bonus des cartes", () => {
    const out = deckMultipliers(["rare", "epic", "legendary"]);
    expect(out.xpPct).toBe(4 + 7 + 12);
    expect(out.coinPct).toBe(2 + 5 + 10);
    expect(out.xp).toBeCloseTo(1.23, 6);
    expect(out.coin).toBeCloseTo(1.17, 6);
  });

  it("plafonne un deck plein d'EXOTIC à +75 %", () => {
    const out = deckMultipliers(["exotic", "exotic", "exotic"]);
    expect(out.xpPct).toBe(75);
    expect(out.coinPct).toBe(75);
    expect(out.xp).toBeCloseTo(1.75, 6);
  });

  it("ignore les cartes au-delà des 3 slots", () => {
    const four = deckMultipliers(["exotic", "exotic", "exotic", "exotic"]);
    expect(four.xpPct).toBe(75);
  });
});

describe("sanitizeDeck", () => {
  const owned = new Set(["gojo", "sukuna", "nobara", "megumi"]);

  it("garde l'ordre des slots", () => {
    expect(sanitizeDeck(["sukuna", "gojo"], owned)).toEqual(["sukuna", "gojo"]);
  });

  it("retire les cartes non possédées (vendues, ou d'un autre univers)", () => {
    expect(sanitizeDeck(["gojo", "denji", "nobara"], owned)).toEqual([
      "gojo",
      "nobara",
    ]);
  });

  it("déduplique", () => {
    expect(sanitizeDeck(["gojo", "gojo", "sukuna"], owned)).toEqual([
      "gojo",
      "sukuna",
    ]);
  });

  it("borne à la taille du deck", () => {
    const out = sanitizeDeck(["gojo", "sukuna", "nobara", "megumi"], owned);
    expect(out).toHaveLength(DECK_SIZE);
  });

  it("ignore les entrées non exploitables", () => {
    expect(
      sanitizeDeck(["", null as unknown as string, "gojo"], owned),
    ).toEqual(["gojo"]);
  });
});
