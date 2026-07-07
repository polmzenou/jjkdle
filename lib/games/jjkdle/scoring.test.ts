import { describe, it, expect } from "vitest";
import type { Character } from "@/data/roster/characters";
import { compareGuess } from "./scoring";
import { CURSED_ENERGY_TOLERANCE } from "./attributes";

/** Cible complète de référence (tous attributs renseignés). */
const target: Character = {
  id: "gojo",
  name: "Satoru Gojo",
  title: "Grade Spécial",
  tier: "s",
  ratings: {},
  race: "HUMAN",
  gender: "MALE",
  grade: "SPECIAL_GRADE",
  affiliation: "TOKYO_SCHOOL",
  clan: "GOJO",
  appearanceArc: "FEARSOME_WOMB",
  hasDomain: true,
  cursedEnergy: 200,
};

function guess(overrides: Partial<Character>): Character {
  return { ...target, id: "g", name: "G", ...overrides };
}

function hint(g: Character, key: string) {
  return compareGuess(g, target).hints.find((h) => h.key === key)!;
}

describe("compareGuess — attributs mono-valeur", () => {
  it("vert si identique", () => {
    expect(hint(guess({}), "race").status).toBe("correct");
    expect(hint(guess({}), "clan").status).toBe("correct");
    expect(hint(guess({}), "hasDomain").status).toBe("correct");
  });

  it("rouge si différent", () => {
    expect(hint(guess({ race: "CURSED_SPIRIT" }), "race").status).toBe("wrong");
    expect(hint(guess({ clan: "ZENIN" }), "clan").status).toBe("wrong");
    expect(hint(guess({ hasDomain: false }), "hasDomain").status).toBe("wrong");
  });
});

describe("compareGuess — attributs ordonnés (flèche ↑/↓)", () => {
  it("grade : cible plus haute → up", () => {
    const h = hint(guess({ grade: "GRADE_2" }), "grade");
    expect(h.status).toBe("wrong");
    expect(h.direction).toBe("up"); // GRADE_2 < SPECIAL_GRADE
  });

  it("arc : cible plus tôt → down", () => {
    const h = hint(guess({ appearanceArc: "SHIBUYA_INCIDENT" }), "appearanceArc");
    expect(h.direction).toBe("down"); // SHIBUYA après FEARSOME_WOMB
  });

  it("grade exact → vert sans flèche", () => {
    const h = hint(guess({}), "grade");
    expect(h.status).toBe("correct");
    expect(h.direction).toBeNull();
  });

  it("grade NO_GRADE vs vrai grade → wrong SANS flèche (non ordonné)", () => {
    const h = hint(guess({ grade: "NO_GRADE" }), "grade");
    expect(h.status).toBe("wrong");
    expect(h.direction).toBeNull();
  });

  it("grade NO_GRADE vs NO_GRADE → vert", () => {
    const g = compareGuess(
      guess({ grade: "NO_GRADE" }),
      { ...target, grade: "NO_GRADE" },
    );
    const h = g.hints.find((x) => x.key === "grade")!;
    expect(h.status).toBe("correct");
    expect(h.direction).toBeNull();
  });
});

describe("compareGuess — cursedEnergy", () => {
  it("exact → vert", () => {
    expect(hint(guess({ cursedEnergy: 200 }), "cursedEnergy").status).toBe("correct");
  });

  it("dans la tolérance → close (orange) + flèche", () => {
    const h = hint(guess({ cursedEnergy: 200 - CURSED_ENERGY_TOLERANCE }), "cursedEnergy");
    expect(h.status).toBe("close");
    expect(h.direction).toBe("up");
  });

  it("hors tolérance → wrong", () => {
    const h = hint(guess({ cursedEnergy: 10 }), "cursedEnergy");
    expect(h.status).toBe("wrong");
    expect(h.direction).toBe("up");
  });
});

describe("compareGuess — proposition incomplète", () => {
  it("attribut manquant → wrong + display '?'", () => {
    const g = guess({ race: undefined });
    const h = hint(g, "race");
    expect(h.status).toBe("wrong");
    expect(h.display).toBe("?");
  });
});
