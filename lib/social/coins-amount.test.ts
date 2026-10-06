import { describe, expect, it } from "vitest";
import { parseCoinAmount } from "./coins-amount";

describe("parseCoinAmount", () => {
  it("accepte les entiers positifs (nombre ou chaîne)", () => {
    expect(parseCoinAmount(1)).toBe(1);
    expect(parseCoinAmount(250_000)).toBe(250_000);
    expect(parseCoinAmount(" 42 ")).toBe(42);
  });

  it("refuse zéro, les négatifs et les décimaux", () => {
    expect(parseCoinAmount(0)).toBeNull();
    expect(parseCoinAmount(-5)).toBeNull();
    expect(parseCoinAmount(1.5)).toBeNull();
    expect(parseCoinAmount("2.5")).toBeNull();
  });

  it("refuse le non numérique et les valeurs hors entier sûr", () => {
    expect(parseCoinAmount("")).toBeNull();
    expect(parseCoinAmount("abc")).toBeNull();
    expect(parseCoinAmount(null)).toBeNull();
    expect(parseCoinAmount(Number.NaN)).toBeNull();
    expect(parseCoinAmount(Number.POSITIVE_INFINITY)).toBeNull();
    expect(parseCoinAmount(2 ** 60)).toBeNull();
  });
});
