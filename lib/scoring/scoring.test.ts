import { describe, it, expect } from "vitest";
import type { CategoryConfig } from "@/data/roster/categories";
import type { Character } from "@/data/roster/characters";
import {
  computeCategoryScore,
  computeTotalScore,
  computeBreakdown,
  evaluateBuild,
  type Selection,
} from "./scoring";
import { getGrade, GRADE_TIERS } from "./grades";

// Catégories de test minimalistes (poids volontairement différents).
const cats: CategoryConfig[] = [
  { id: "speed", label: "Vitesse", description: "", weight: 1, drawCount: 4 },
  { id: "endurance", label: "Endurance", description: "", weight: 2, drawCount: 4 },
];

function makeChar(ratings: Character["ratings"]): Character {
  return { id: "x", name: "X", title: "", tier: "3", ratings };
}

describe("computeCategoryScore", () => {
  it("= rating × poids", () => {
    const char = makeChar({ speed: 50 });
    expect(computeCategoryScore(char, cats[0])).toBe(50); // 50 × 1
  });

  it("traite un rating absent comme 0", () => {
    const char = makeChar({ endurance: 80 });
    expect(computeCategoryScore(char, cats[0])).toBe(0); // pas de 'speed'
  });

  it("renvoie 0 pour un personnage null", () => {
    expect(computeCategoryScore(null, cats[0])).toBe(0);
  });
});

describe("computeTotalScore", () => {
  it("build vide = 0", () => {
    expect(computeTotalScore({}, cats)).toBe(0);
  });

  it("build parfait (toutes notes à 100) = 1000", () => {
    const perfect = makeChar({ speed: 100, endurance: 100 });
    const sel: Selection = { speed: perfect, endurance: perfect };
    expect(computeTotalScore(sel, cats)).toBe(1000);
  });

  it("respecte la pondération des catégories", () => {
    // earned = 100×1 (speed) + 0×2 (endurance) = 100
    // max    = 100×1 + 100×2 = 300  → 100/300 × 1000 = 333
    const sel: Selection = {
      speed: makeChar({ speed: 100 }),
      endurance: makeChar({ endurance: 0 }),
    };
    expect(computeTotalScore(sel, cats)).toBe(333);
  });

  it("renvoie 0 sans catégorie", () => {
    expect(computeTotalScore({}, [])).toBe(0);
  });
});

describe("computeBreakdown", () => {
  it("détaille chaque catégorie et la contribution normalisée", () => {
    const sel: Selection = {
      speed: makeChar({ speed: 100 }),
      endurance: makeChar({ endurance: 100 }),
    };
    const breakdown = computeBreakdown(sel, cats);
    expect(breakdown).toHaveLength(2);
    // speed: 100×1 / 300 × 1000 = 333 ; endurance: 200/300×1000 = 667
    expect(breakdown[0].normalized).toBe(333);
    expect(breakdown[1].normalized).toBe(667);
  });
});

describe("getGrade — bornes des paliers", () => {
  const cases: Array<[number, string]> = [
    [0, "4minus"],
    [499, "4minus"],
    [500, "4"],
    [599, "4"],
    [600, "3"],
    [699, "3"],
    [700, "2"],
    [899, "2"],
    [900, "1"],
    [979, "1"],
    [980, "s"],
    [1000, "s"],
  ];
  it.each(cases)("score %i → grade %s", (score, expectedId) => {
    expect(getGrade(score).id).toBe(expectedId);
  });

  it("score négatif retombe sur le grade le plus bas", () => {
    expect(getGrade(-50).id).toBe("4minus");
  });

  it("chaque palier a un label et une couleur", () => {
    for (const tier of GRADE_TIERS) {
      expect(tier.label).toBeTruthy();
      expect(tier.color).toMatch(/^#/);
    }
  });
});

describe("evaluateBuild", () => {
  it("combine score et grade", () => {
    const perfect = makeChar({ speed: 100, endurance: 100 });
    const { score, grade } = evaluateBuild(
      { speed: perfect, endurance: perfect },
      cats,
    );
    expect(score).toBe(1000);
    expect(grade.id).toBe("s");
  });
});
