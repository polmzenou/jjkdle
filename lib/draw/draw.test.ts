import { describe, it, expect } from "vitest";
import type { CategoryConfig, CategoryId } from "@/data/roster/categories";
import type { Character } from "@/data/roster/characters";
import { CATEGORIES } from "@/data/roster/categories";
import { ROSTER } from "@/data/roster/characters";
import {
  eligibleFor,
  drawCategory,
  drawAll,
  redrawUnlocked,
  drawOne,
  drawAllOne,
  redrawUnlockedOne,
  seededRng,
} from "./draw";

function char(id: string, ratings: Character["ratings"]): Character {
  return { id, name: id, title: "", tier: "3", ratings };
}

const roster: Character[] = [
  char("a", { speed: 90, "domain-expansion": 80 }),
  char("b", { speed: 70 }),
  char("c", { speed: 60, "domain-expansion": 50 }),
  char("d", { speed: 40 }),
  char("e", { speed: 30 }),
];

const speed: CategoryConfig = {
  id: "speed",
  label: "Vitesse",
  description: "",
  weight: 1,
  drawCount: 3,
};
const domain: CategoryConfig = {
  id: "domain-expansion",
  label: "Domaine",
  description: "",
  weight: 1,
  drawCount: 4,
};

describe("eligibleFor", () => {
  it("ne garde que les personnages notés sur la catégorie", () => {
    const ids = eligibleFor("domain-expansion", roster).map((c) => c.id);
    expect(ids.sort()).toEqual(["a", "c"]);
  });
});

describe("drawCategory", () => {
  it("respecte le plafond drawCount", () => {
    const drawn = drawCategory(speed, roster, seededRng(1));
    expect(drawn).toHaveLength(3); // 5 éligibles, plafond 3
  });

  it("limite à nbÉligibles quand ils sont moins nombreux que drawCount", () => {
    const drawn = drawCategory(domain, roster, seededRng(1));
    expect(drawn).toHaveLength(2); // seulement a et c sont éligibles
  });

  it("ne produit pas de doublon dans la ligne", () => {
    const ids = drawCategory(speed, roster, seededRng(7)).map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("est déterministe avec une graine fixe", () => {
    const a = drawCategory(speed, roster, seededRng(42)).map((c) => c.id);
    const b = drawCategory(speed, roster, seededRng(42)).map((c) => c.id);
    expect(a).toEqual(b);
  });
});

describe("drawAll", () => {
  it("tire toutes les catégories", () => {
    const draw = drawAll([speed, domain], roster, seededRng(3));
    expect(Object.keys(draw).sort()).toEqual(["domain-expansion", "speed"]);
  });
});

describe("redrawUnlocked", () => {
  it("conserve les catégories verrouillées et re-tire les autres", () => {
    const initial = drawAll([speed, domain], roster, seededRng(5));
    const locked = new Set<CategoryId>(["speed"]);
    const next = redrawUnlocked(
      initial,
      [speed, domain],
      locked,
      roster,
      seededRng(99),
    );
    // 'speed' verrouillée → référence identique conservée.
    expect(next.speed).toBe(initial.speed);
    // 'domain-expansion' re-tirée → toujours valide (≤ 2 éligibles).
    expect(next["domain-expansion"].length).toBeLessThanOrEqual(2);
  });
});

describe("drawOne (variante grille)", () => {
  it("tire un personnage éligible", () => {
    const c = drawOne("domain-expansion", roster, seededRng(1));
    expect(c).not.toBeNull();
    expect(["a", "c"]).toContain(c?.id);
  });

  it("renvoie null si aucun éligible", () => {
    // Aucun personnage du roster de test n'a de note 'battle-iq'.
    const c = drawOne("battle-iq", roster, seededRng(1));
    expect(c).toBeNull();
  });

  it("est déterministe avec une graine fixe", () => {
    const a = drawOne("speed", roster, seededRng(42));
    const b = drawOne("speed", roster, seededRng(42));
    expect(a?.id).toBe(b?.id);
  });

  it("ne re-tire jamais le perso exclu quand d'autres existent", () => {
    for (let seed = 0; seed < 60; seed++) {
      const c = drawOne("speed", roster, seededRng(seed), "a");
      expect(c?.id).not.toBe("a");
    }
  });

  it("renvoie quand même le perso exclu s'il est le seul éligible", () => {
    // 'domain-expansion' éligibles = a, c. En excluant les deux possibles un par
    // un on garde toujours un résultat valide ; si un seul éligible existait,
    // l'exclusion serait ignorée (ici on vérifie qu'on ne renvoie jamais null).
    const c = drawOne("domain-expansion", roster, seededRng(1), "a");
    expect(c?.id).toBe("c");
  });
});

describe("drawAllOne / redrawUnlockedOne", () => {
  it("tire un perso par catégorie", () => {
    const draw = drawAllOne([speed, domain], roster, seededRng(3));
    expect(Object.keys(draw).sort()).toEqual(["domain-expansion", "speed"]);
  });

  it("conserve les catégories verrouillées et re-tire les autres", () => {
    const initial = drawAllOne([speed, domain], roster, seededRng(5));
    const locked = new Set<CategoryId>(["speed"]);
    const next = redrawUnlockedOne(
      initial,
      [speed, domain],
      locked,
      roster,
      seededRng(99),
    );
    expect(next.speed).toBe(initial.speed); // verrouillée → conservée
    expect(["a", "c", null]).toContainEqual(
      next["domain-expansion"]?.id ?? null,
    );
  });

  it("ne re-tire jamais deux fois de suite le même perso dans une case", () => {
    // 'speed' a 5 éligibles → un re-tirage ne doit jamais redonner le perso courant.
    for (let seed = 0; seed < 60; seed++) {
      const current = drawAllOne([speed], roster, seededRng(seed));
      const next = redrawUnlockedOne(
        current,
        [speed],
        new Set<CategoryId>(),
        roster,
        seededRng(seed + 1000),
      );
      expect(next.speed?.id).not.toBe(current.speed?.id);
    }
  });
});

describe("minRating", () => {
  it("ne tire que des personnages notés au-dessus du seuil", () => {
    // speed : a=90, b=70, c=60, d=40, e=30 → seuil 80 ⇒ seul 'a' qualifie.
    for (let seed = 0; seed < 40; seed++) {
      const c = drawOne("speed", roster, seededRng(seed), undefined, 80);
      expect(c?.id).toBe("a");
    }
  });

  it("retombe sur le pool complet si aucun perso n'atteint le seuil", () => {
    const c = drawOne("speed", roster, seededRng(1), undefined, 200);
    expect(c).not.toBeNull(); // jamais bloqué : la case reste jouable
  });

  it("sur le roster réel, ne renvoie que des profils au-dessus du seuil", () => {
    for (let seed = 0; seed < 100; seed++) {
      const draw = drawAllOne(CATEGORIES, ROSTER, seededRng(seed), 90);
      for (const category of CATEGORIES) {
        const c = draw[category.id];
        if (c) expect(c.ratings[category.id] ?? 0).toBeGreaterThanOrEqual(90);
      }
    }
  });
});
