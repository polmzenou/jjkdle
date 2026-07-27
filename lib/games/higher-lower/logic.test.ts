import { describe, expect, it } from "vitest";
import { compareHL, computeCorrect, xpForScore } from "./types";

/** Raccourci : une valeur comparée, avec son départage optionnel. */
const v = (value: number, tiebreak = 0) => ({ value, tiebreak });

describe("computeCorrect", () => {
  it("valide « higher » quand la droite est supérieure", () => {
    expect(computeCorrect(v(30), v(50), "higher")).toBe(true);
    expect(computeCorrect(v(30), v(50), "lower")).toBe(false);
  });

  it("valide « lower » quand la droite est inférieure", () => {
    expect(computeCorrect(v(80), v(20), "lower")).toBe(true);
    expect(computeCorrect(v(80), v(20), "higher")).toBe(false);
  });

  it("départage deux rangs identiques par le battleValue (CSM)", () => {
    // Deux « Puissant » (rang 3) : c'est le score de combat qui tranche.
    expect(computeCorrect(v(3, 40), v(3, 62), "higher")).toBe(true);
    expect(computeCorrect(v(3, 40), v(3, 62), "lower")).toBe(false);
    expect(computeCorrect(v(3, 62), v(3, 40), "lower")).toBe(true);
  });

  it("laisse le rang primer sur le départage", () => {
    // Rang 4 avec un petit battleValue passe devant un rang 3 mieux noté.
    expect(computeCorrect(v(3, 99), v(4, 1), "higher")).toBe(true);
  });

  it("accepte les deux réponses en cas d'égalité totale (garde-fou)", () => {
    expect(computeCorrect(v(40), v(40), "higher")).toBe(true);
    expect(computeCorrect(v(40), v(40), "lower")).toBe(true);
    expect(computeCorrect(v(3, 62), v(3, 62), "lower")).toBe(true);
  });
});

describe("compareHL", () => {
  it("ne renvoie 0 que si valeur ET départage sont identiques", () => {
    expect(compareHL(v(3, 62), v(3, 62))).toBe(0);
    expect(compareHL(v(3, 62), v(3, 61))).toBeGreaterThan(0);
    expect(compareHL(v(2, 99), v(3, 0))).toBeLessThan(0);
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
