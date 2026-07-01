import { describe, it, expect } from "vitest";
import { xpForLevel, xpToLevel, levelToMinXp } from "./xp";

describe("xpToLevel / levelToMinXp", () => {
  it("0 XP = niveau 1", () => {
    expect(xpToLevel(0).level).toBe(1);
  });

  it("le seuil exact d'un niveau fait basculer au niveau suivant", () => {
    const min2 = levelToMinXp(2); // = xpForLevel(1)
    expect(min2).toBe(xpForLevel(1));
    expect(xpToLevel(min2).level).toBe(2);
    expect(xpToLevel(min2 - 1).level).toBe(1);
  });

  it("levelToMinXp est l'inverse de xpToLevel aux bornes", () => {
    for (let lvl = 1; lvl <= 10; lvl++) {
      const minXp = levelToMinXp(lvl);
      expect(xpToLevel(minXp).level).toBe(lvl);
    }
  });

  it("current + paliers consommés = XP totale", () => {
    const total = 5000;
    const { level, current } = xpToLevel(total);
    const consumed = levelToMinXp(level);
    expect(consumed + current).toBe(total);
  });
});
