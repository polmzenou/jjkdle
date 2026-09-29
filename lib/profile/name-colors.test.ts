import { describe, expect, it } from "vitest";
import {
  NAME_COLORS,
  completionPercent,
  isNameColorKey,
  isNameColorUnlocked,
} from "./name-colors";

describe("couleurs de pseudo", () => {
  it("un palier par tranche de 10 % à partir de 50 %", () => {
    expect(NAME_COLORS.map((c) => c.threshold)).toEqual([50, 60, 70, 80, 90, 100]);
  });

  it("arrondit la complétion à l'inférieur", () => {
    expect(completionPercent(499, 1000)).toBe(49);
    expect(completionPercent(99, 100)).toBe(99);
    expect(completionPercent(100, 100)).toBe(100);
    expect(completionPercent(0, 0)).toBe(0);
  });

  it("débloque selon le palier", () => {
    expect(isNameColorUnlocked("lime", 49)).toBe(false);
    expect(isNameColorUnlocked("lime", 50)).toBe(true);
    expect(isNameColorUnlocked("scarlet", 89)).toBe(false);
    expect(isNameColorUnlocked("rainbow", 99)).toBe(false);
    expect(isNameColorUnlocked("rainbow", 100)).toBe(true);
  });

  it("les admins ignorent les paliers, pas les clés inconnues", () => {
    expect(isNameColorUnlocked("rainbow", 0, true)).toBe(true);
    expect(isNameColorUnlocked("gold", 100, true)).toBe(false);
    expect(isNameColorKey("gold")).toBe(false);
  });
});
