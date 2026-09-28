import { describe, expect, it } from "vitest";
import { BOOSTERS } from "./boosters";
import { boosterOdds, formatOdds } from "./odds";
import { CARD_RARITIES } from "./rarity";

const ALL = CARD_RARITIES;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("boosterOdds", () => {
  it("les taux par carte somment à 100 pour chaque booster", () => {
    for (const def of Object.values(BOOSTERS)) {
      const { odds } = boosterOdds(def, ALL);
      expect(sum(odds.map((o) => o.perCard))).toBeCloseTo(100, 6);
    }
  });

  it("le doré garantit une EPIC ou une LEGENDARY", () => {
    const { odds, guarantee } = boosterOdds(BOOSTERS.gold, ALL);
    const epic = odds.find((o) => o.rarity === "epic")!.atLeastOne;
    const legendary = odds.find((o) => o.rarity === "legendary")!.atLeastOne;
    // Le slot garanti est certain d’être l’un des deux : P(A) + P(B) ≥ P(A ∪ B) = 100 %.
    expect(epic + legendary).toBeGreaterThanOrEqual(100);
    expect(guarantee).toBe("1 carte EPIC+ garantie");
  });

  it("le bronze a une garantie UNCOMMON+, le simple aucune", () => {
    expect(boosterOdds(BOOSTERS.bronze, ALL).guarantee).toBe(
      "1 carte UNCOMMON+ garantie",
    );
    expect(boosterOdds(BOOSTERS.simple, ALL).guarantee).toBeNull();
  });

  it("une rareté absente du roster est masquée et redistribuée", () => {
    const available = ALL.filter((r) => r !== "common");
    const { odds } = boosterOdds(BOOSTERS.simple, available);
    expect(odds.map((o) => o.rarity)).not.toContain("common");
    expect(sum(odds.map((o) => o.perCard))).toBeCloseTo(100, 6);
    const uncommon = odds.find((o) => o.rarity === "uncommon")!.perCard;
    expect(uncommon).toBeGreaterThan(27);
  });

  it("atLeastOne est toujours ≥ perCard (plusieurs slots)", () => {
    for (const def of Object.values(BOOSTERS)) {
      for (const o of boosterOdds(def, ALL).odds) {
        expect(o.atLeastOne + 1e-9).toBeGreaterThanOrEqual(o.perCard);
      }
    }
  });
});

describe("formatOdds", () => {
  it("formate en français", () => {
    expect(formatOdds(46)).toBe("46 %");
    expect(formatOdds(3.5)).toBe("3,5 %");
    expect(formatOdds(0.05)).toBe("< 0,1 %");
    expect(formatOdds(100)).toBe("100 %");
  });
});
