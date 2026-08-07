import { describe, expect, it } from "vitest";
import { canDouble, handValue, isBlackjack, isBust } from "./hand";

describe("handValue", () => {
  it("compte les figures pour 10", () => {
    expect(handValue(["KS", "QH"]).total).toBe(20);
    expect(handValue(["TD", "JC"]).total).toBe(20);
  });

  it("compte l'as pour 11 quand la main tient", () => {
    const value = handValue(["AS", "9H"]);
    expect(value.total).toBe(20);
    expect(value.soft).toBe(true);
  });

  it("rétrograde l'as à 1 plutôt que de laisser sauter la main", () => {
    const value = handValue(["AS", "9H", "5C"]);
    expect(value.total).toBe(15);
    expect(value.soft).toBe(false);
  });

  it("ne rétrograde QU'AUTANT d'as que nécessaire", () => {
    // A + A + 9 : un as à 11, l'autre à 1 → 21, et la main reste soft.
    const value = handValue(["AS", "AH", "9C"]);
    expect(value.total).toBe(21);
    expect(value.soft).toBe(true);
  });

  it("durcit la main quand une carte de plus arrive", () => {
    // A + A + 9 + K : les deux as tombent à 1 → 21 dur.
    const value = handValue(["AS", "AH", "9C", "KD"]);
    expect(value.total).toBe(21);
    expect(value.soft).toBe(false);
  });

  it("gère trois as", () => {
    // 11 + 1 + 1 = 13, un as compte encore 11.
    const value = handValue(["AS", "AH", "AC"]);
    expect(value.total).toBe(13);
    expect(value.soft).toBe(true);
  });

  it("distingue le 17 soft du 17 dur", () => {
    expect(handValue(["AS", "6H"])).toEqual({ total: 17, soft: true });
    expect(handValue(["TS", "7H"])).toEqual({ total: 17, soft: false });
  });

  it("main vide = 0", () => {
    expect(handValue([])).toEqual({ total: 0, soft: false });
  });
});

describe("isBlackjack", () => {
  it("reconnaît 21 en deux cartes", () => {
    expect(isBlackjack(["AS", "KH"])).toBe(true);
    expect(isBlackjack(["TD", "AC"])).toBe(true);
  });

  it("refuse 21 en trois cartes — ce n'est pas un naturel", () => {
    expect(isBlackjack(["7S", "7H", "7C"])).toBe(false);
    expect(isBlackjack(["AS", "5H", "5C"])).toBe(false);
  });

  it("refuse une main de deux cartes qui ne fait pas 21", () => {
    expect(isBlackjack(["AS", "9H"])).toBe(false);
  });
});

describe("isBust", () => {
  it("détecte le dépassement", () => {
    expect(isBust(["KS", "QH", "5C"])).toBe(true);
  });

  it("ne saute pas tant qu'un as peut être rétrogradé", () => {
    expect(isBust(["AS", "KH", "5C"])).toBe(false); // 16
  });
});

describe("canDouble", () => {
  it("autorise le double sur les deux premières cartes", () => {
    expect(canDouble(["5S", "6H"], false)).toBe(true);
  });

  it("refuse au-delà de deux cartes", () => {
    expect(canDouble(["5S", "6H", "2C"], false)).toBe(false);
  });

  it("refuse un second double", () => {
    expect(canDouble(["5S", "6H"], true)).toBe(false);
  });

  it("refuse de doubler un blackjack — on troquerait un 3:2 contre un 1:1", () => {
    expect(canDouble(["AS", "KH"], false)).toBe(false);
  });
});
