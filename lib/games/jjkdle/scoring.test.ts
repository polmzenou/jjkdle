import { describe, it, expect } from "vitest";
import type { Character } from "@/data/roster/characters";
import { JJK_CURSED_ENERGY_TOLERANCE } from "@/lib/universes/jjk-attributes";
import { compareGuess } from "./scoring";
import { JJK_SCHEMA } from "./__fixtures__/jjk-schema";

/** Attributs de la cible de référence (tous renseignés → perso « complet »). */
const TARGET_ATTRS: Record<string, string | number> = {
  race: "HUMAN",
  gender: "MALE",
  grade: "SPECIAL_GRADE",
  affiliation: "TOKYO_SCHOOL",
  clan: "GOJO",
  appearanceArc: "FEARSOME_WOMB",
  hasDomain: "true",
  cursedEnergy: 200,
};

const target: Character = {
  id: "gojo",
  name: "Satoru Gojo",
  title: "Grade Spécial",
  tier: "s",
  ratings: {},
  attributes: TARGET_ATTRS,
};

/** Proposition identique à la cible, sauf les attributs surchargés. */
function guess(overrides: Record<string, string | number> = {}): Character {
  return {
    ...target,
    id: "g",
    name: "G",
    attributes: { ...TARGET_ATTRS, ...overrides },
  };
}

/** Proposition à laquelle il MANQUE un attribut (≠ valeur différente). */
function guessWithout(key: string): Character {
  const attributes = { ...TARGET_ATTRS };
  delete attributes[key];
  return { ...target, id: "g", name: "G", attributes };
}

/** Cible dont un attribut est surchargé (pour tester les deux sens). */
function targetWith(overrides: Record<string, string | number>): Character {
  return { ...target, attributes: { ...TARGET_ATTRS, ...overrides } };
}

function hint(g: Character, key: string, t: Character = target) {
  return compareGuess(g, t, JJK_SCHEMA).hints.find((h) => h.key === key)!;
}

describe("compareGuess — colonnes", () => {
  it("produit un indice par attribut de l'univers, dans l'ordre du schéma", () => {
    const keys = compareGuess(guess(), target, JJK_SCHEMA).hints.map(
      (h) => h.key,
    );
    expect(keys).toEqual(JJK_SCHEMA.columns.map((c) => c.key));
  });
});

describe("compareGuess — attributs mono-valeur (CATEGORICAL/BOOLEAN)", () => {
  it("vert si identique", () => {
    expect(hint(guess(), "race").status).toBe("correct");
    expect(hint(guess(), "clan").status).toBe("correct");
    expect(hint(guess(), "hasDomain").status).toBe("correct");
  });

  it("rouge si différent, jamais de flèche", () => {
    const race = hint(guess({ race: "CURSED_SPIRIT" }), "race");
    expect(race.status).toBe("wrong");
    expect(race.direction).toBeNull();
    expect(hint(guess({ clan: "ZENIN" }), "clan").status).toBe("wrong");
    expect(hint(guess({ hasDomain: "false" }), "hasDomain").status).toBe("wrong");
  });

  it("affiche le libellé de l'option, pas sa valeur brute", () => {
    expect(hint(guess(), "race").display).toBe("Humain");
    expect(hint(guess(), "hasDomain").display).toBe("Oui");
    expect(hint(guess({ hasDomain: "false" }), "hasDomain").display).toBe("Non");
  });
});

describe("compareGuess — attributs ordonnés (flèche ↑/↓)", () => {
  it("grade : cible plus haute → up", () => {
    const h = hint(guess({ grade: "GRADE_2" }), "grade");
    expect(h.status).toBe("wrong");
    expect(h.direction).toBe("up"); // GRADE_2 < SPECIAL_GRADE
  });

  it("grade : cible plus basse → down", () => {
    const h = hint(
      guess({ grade: "SPECIAL_GRADE" }),
      "grade",
      targetWith({ grade: "GRADE_2" }),
    );
    expect(h.direction).toBe("down");
  });

  it("arc : cible plus tôt → down", () => {
    const h = hint(guess({ appearanceArc: "SHIBUYA_INCIDENT" }), "appearanceArc");
    expect(h.direction).toBe("down"); // SHIBUYA après FEARSOME_WOMB
  });

  it("grade exact → vert sans flèche", () => {
    const h = hint(guess(), "grade");
    expect(h.status).toBe("correct");
    expect(h.direction).toBeNull();
  });

  it("valeur NON ordonnée (« pas de grade ») vs vrai grade → wrong SANS flèche", () => {
    // `order: null` sur l'option ⇒ aucune comparaison possible, dans les 2 sens.
    const asGuess = hint(guess({ grade: "NO_GRADE" }), "grade");
    expect(asGuess.status).toBe("wrong");
    expect(asGuess.direction).toBeNull();

    const asTarget = hint(guess(), "grade", targetWith({ grade: "NO_GRADE" }));
    expect(asTarget.status).toBe("wrong");
    expect(asTarget.direction).toBeNull();
  });

  it("« pas de grade » des deux côtés → vert", () => {
    const h = hint(
      guess({ grade: "NO_GRADE" }),
      "grade",
      targetWith({ grade: "NO_GRADE" }),
    );
    expect(h.status).toBe("correct");
    expect(h.direction).toBeNull();
  });
});

describe("compareGuess — attribut NUMERIC", () => {
  it("exact → vert", () => {
    expect(hint(guess({ cursedEnergy: 200 }), "cursedEnergy").status).toBe(
      "correct",
    );
  });

  it("à la borne EXACTE de la tolérance → close (orange) + flèche", () => {
    const low = hint(
      guess({ cursedEnergy: 200 - JJK_CURSED_ENERGY_TOLERANCE }),
      "cursedEnergy",
    );
    expect(low.status).toBe("close");
    expect(low.direction).toBe("up");

    const high = hint(
      guess({ cursedEnergy: 200 + JJK_CURSED_ENERGY_TOLERANCE }),
      "cursedEnergy",
    );
    expect(high.status).toBe("close");
    expect(high.direction).toBe("down");
  });

  it("juste au-delà de la tolérance → wrong (mais garde la flèche)", () => {
    const h = hint(
      guess({ cursedEnergy: 200 - JJK_CURSED_ENERGY_TOLERANCE - 1 }),
      "cursedEnergy",
    );
    expect(h.status).toBe("wrong");
    expect(h.direction).toBe("up");
  });

  it("très loin → wrong", () => {
    const h = hint(guess({ cursedEnergy: 10 }), "cursedEnergy");
    expect(h.status).toBe("wrong");
    expect(h.direction).toBe("up");
  });

  it("affiche la valeur numérique telle quelle", () => {
    expect(hint(guess({ cursedEnergy: 42 }), "cursedEnergy").display).toBe("42");
  });
});

describe("compareGuess — proposition incomplète", () => {
  it("attribut manquant → wrong + display '?' + aucune flèche", () => {
    for (const key of ["race", "grade", "hasDomain", "cursedEnergy"]) {
      const h = hint(guessWithout(key), key);
      expect(h.status, key).toBe("wrong");
      expect(h.display, key).toBe("?");
      expect(h.direction, key).toBeNull();
    }
  });

  it("un attribut à `false` reste une VRAIE valeur (≠ manquant)", () => {
    // Piège classique : `false` est valide, seule l'absence vaut « non renseigné ».
    const h = hint(guess({ hasDomain: "false" }), "hasDomain");
    expect(h.display).toBe("Non");
    expect(h.status).toBe("wrong"); // la cible a "true"
  });
});
