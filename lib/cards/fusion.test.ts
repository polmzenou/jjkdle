import { describe, it, expect } from "vitest";
import { nextRarity, rollFusion, validateFusion } from "./fusion";
import type { CardRarity } from "./rarity";
import type { CardPool } from "./roll";

const rarityById = new Map<string, CardRarity>([
  ["r1", "rare"],
  ["r2", "rare"],
  ["r3", "rare"],
  ["e1", "epic"],
  ["x1", "exotic"],
]);
const pool: CardPool = { rare: ["r1", "r2", "r3"], epic: ["e1"], exotic: ["x1"] };

describe("nextRarity", () => {
  it("monte d'un cran", () => {
    expect(nextRarity("common")).toBe("uncommon");
    expect(nextRarity("legendary")).toBe("exotic");
  });
  it("null au sommet", () => {
    expect(nextRarity("exotic")).toBeNull();
  });
});

describe("validateFusion", () => {
  it("3 cartes de même rareté → rareté supérieure", () => {
    const counts = new Map([["r1", 2], ["r2", 2], ["r3", 2]]);
    const res = validateFusion(["r1", "r2", "r3"], counts, rarityById, pool);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.rarity).toBe("rare");
      expect(res.target).toBe("epic");
      expect(res.needed.get("r1")).toBe(1);
    }
  });

  it("3× le même perso s'il a au moins 3 exemplaires", () => {
    expect(validateFusion(["r1", "r1", "r1"], new Map([["r1", 3]]), rarityById, pool).ok).toBe(true);
    expect(validateFusion(["r1", "r1", "r1"], new Map([["r1", 2]]), rarityById, pool).ok).toBe(false);
  });

  it("peut consommer le dernier exemplaire", () => {
    const counts = new Map([["r1", 1], ["r2", 1], ["r3", 1]]);
    expect(validateFusion(["r1", "r2", "r3"], counts, rarityById, pool).ok).toBe(true);
  });

  it("refuse une carte non possédée", () => {
    const counts = new Map([["r1", 1], ["r2", 1]]);
    expect(validateFusion(["r1", "r2", "r3"], counts, rarityById, pool).ok).toBe(false);
  });

  it("refuse des raretés mélangées", () => {
    const counts = new Map([["r1", 2], ["r2", 2], ["e1", 2]]);
    expect(validateFusion(["r1", "r2", "e1"], counts, rarityById, pool).ok).toBe(false);
  });

  it("refuse un nombre de cartes ≠ 3", () => {
    const counts = new Map([["r1", 5]]);
    expect(validateFusion(["r1", "r1"], counts, rarityById, pool).ok).toBe(false);
  });

  it("refuse l'exotic (sommet)", () => {
    const counts = new Map([["x1", 4]]);
    expect(validateFusion(["x1", "x1", "x1"], counts, rarityById, pool).ok).toBe(false);
  });

  it("refuse si la rareté cible est vide dans l'univers", () => {
    const counts = new Map([["r1", 2], ["r2", 2], ["r3", 2]]);
    const noEpic: CardPool = { rare: ["r1", "r2", "r3"] };
    expect(validateFusion(["r1", "r2", "r3"], counts, rarityById, noEpic).ok).toBe(false);
  });

  it("refuse une carte inconnue", () => {
    const counts = new Map([["zz", 5]]);
    expect(validateFusion(["zz", "zz", "zz"], counts, rarityById, pool).ok).toBe(false);
  });
});

describe("rollFusion", () => {
  it("tire dans le pool cible", () => {
    expect(rollFusion(pool, "epic", () => 0.99)).toBe("e1");
    expect(rollFusion(pool, "rare", () => 0)).toBe("r1");
  });
  it("null si pool vide", () => {
    expect(rollFusion({}, "epic")).toBeNull();
  });
});
