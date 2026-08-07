import { describe, expect, it } from "vitest";
import { dealerShouldHit, playDealer } from "./dealer";

describe("dealerShouldHit", () => {
  it("tire à 16", () => {
    expect(dealerShouldHit(["TS", "6H"])).toBe(true);
  });

  it("reste à 17 dur", () => {
    expect(dealerShouldHit(["TS", "7H"])).toBe(false);
  });

  it("RESTE sur un 17 soft (règle de la maison retenue)", () => {
    // A+6 = 17 soft. La variante « hits soft 17 » tirerait ici ; la nôtre non.
    // Test explicite : c'est la règle verrouillée du casino.
    expect(dealerShouldHit(["AS", "6H"])).toBe(false);
  });

  it("tire sur un 16 soft", () => {
    expect(dealerShouldHit(["AS", "5H"])).toBe(true);
  });

  it("reste au-delà de 17", () => {
    expect(dealerShouldHit(["TS", "QH"])).toBe(false);
    expect(dealerShouldHit(["AS", "KH"])).toBe(false);
  });
});

describe("playDealer", () => {
  it("tire jusqu'à atteindre 17 au moins", () => {
    // 5+6 = 11, puis 2 → 13, puis 4 → 17 : s'arrête là.
    const { cards, shoe } = playDealer(["5S", "6H"], ["2C", "4D", "KS", "9H"]);
    expect(cards).toEqual(["5S", "6H", "2C", "4D"]);
    expect(shoe).toEqual(["KS", "9H"]);
  });

  it("consomme le sabot par l'avant, dans l'ordre", () => {
    const { cards } = playDealer(["2S", "3H"], ["4C", "5D", "6S", "AH"]);
    // 5 → 9 → 14 → 20, s'arrête.
    expect(cards).toEqual(["2S", "3H", "4C", "5D", "6S"]);
  });

  it("ne tire pas si la main est déjà à 17", () => {
    const { cards, shoe } = playDealer(["AS", "6H"], ["KS"]);
    expect(cards).toEqual(["AS", "6H"]);
    expect(shoe).toEqual(["KS"]);
  });

  it("peut sauter", () => {
    const { cards } = playDealer(["TS", "6H"], ["KC"]);
    expect(cards).toEqual(["TS", "6H", "KC"]); // 26
  });

  it("ne mute ni la main ni le sabot d'entrée", () => {
    const hand = ["5S", "6H"];
    const shoe = ["2C", "4D", "KS"];
    playDealer(hand, shoe);
    expect(hand).toEqual(["5S", "6H"]);
    expect(shoe).toEqual(["2C", "4D", "KS"]);
  });
});
