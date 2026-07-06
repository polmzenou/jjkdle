import { describe, expect, it } from "vitest";
import { computeCorrect, xpForScore } from "./types";

describe("computeCorrect", () => {
  it("valide « higher » quand la droite est supérieure", () => {
    expect(computeCorrect(30, 50, "higher")).toBe(true);
    expect(computeCorrect(30, 50, "lower")).toBe(false);
  });

  it("valide « lower » quand la droite est inférieure", () => {
    expect(computeCorrect(80, 20, "lower")).toBe(true);
    expect(computeCorrect(80, 20, "higher")).toBe(false);
  });

  it("accepte les deux réponses en cas d'égalité (garde-fou)", () => {
    expect(computeCorrect(40, 40, "higher")).toBe(true);
    expect(computeCorrect(40, 40, "lower")).toBe(true);
  });
});

describe("xpForScore", () => {
  it("est proportionnelle au score avec bonus par palier de 5", () => {
    expect(xpForScore(0)).toBe(0);
    expect(xpForScore(3)).toBe(30); // 3*10 + floor(3/5)*25
    expect(xpForScore(5)).toBe(75); // 5*10 + 1*25
    expect(xpForScore(12)).toBe(170); // 12*10 + 2*25
  });

  it("borne les entrées négatives / fractionnaires", () => {
    expect(xpForScore(-4)).toBe(0);
    expect(xpForScore(5.9)).toBe(75);
  });
});
