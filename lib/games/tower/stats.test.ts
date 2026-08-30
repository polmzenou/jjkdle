import { describe, expect, it } from "vitest";
import { ROSTER, type Character } from "@/data/roster/characters";
import { archetypeOf, excellenceCategory } from "./abilities";
import { JJK_TOWER_CONFIG } from "./config";
import {
  FALLBACK_ENERGY,
  FALLBACK_SPEED_RATING,
  booleanAttribute,
  deriveStats,
  numericAttribute,
  ratingOf,
  toFighterSpec,
} from "./stats";
import { ARCHETYPES } from "./types";

/**
 * Le garde-fou n°1 du jeu.
 *
 * `Character.ratings` est PARTIEL par construction et les attributs ne sont
 * remplis qu'en base : sur le roster de seed, 36 personnages sur 45 n'ont
 * aucune note de vitesse et AUCUN n'a d'attribut. Une formule sans repli
 * enverrait donc la moitié du roster en combat avec une célérité `NaN`, et le
 * symptôme n'apparaîtrait qu'en production, sur un personnage au hasard.
 *
 * Ce fichier fait passer le roster ENTIER dans la dérivation et échoue sur la
 * moindre valeur non finie.
 */

const config = JJK_TOWER_CONFIG;

function character(overrides: Partial<Character> = {}): Character {
  return {
    id: "test",
    name: "Test",
    title: "Test",
    tier: "3",
    ratings: {},
    ...overrides,
  };
}

describe("robustesse sur le roster réel", () => {
  it("le roster de seed est bien lacunaire (sinon ce fichier ne teste rien)", () => {
    const withoutSpeed = ROSTER.filter((c) => c.ratings?.speed === undefined);
    expect(withoutSpeed.length).toBeGreaterThan(0);
  });

  it.each(ROSTER.map((c) => [c.id, c] as const))(
    "%s produit quatre stats finies et positives",
    (_id, c) => {
      const stats = deriveStats(c, config);

      for (const value of Object.values(stats)) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThan(0);
      }
    },
  );

  it("chaque personnage du roster reçoit un archétype connu", () => {
    for (const c of ROSTER) {
      expect(ARCHETYPES).toContain(archetypeOf(c, config.categoryArchetypes));
    }
  });

  it("chaque personnage du roster se convertit en combattant jouable", () => {
    for (const c of ROSTER) {
      const spec = toFighterSpec(c, "squad", config);
      expect(spec.id).toBe(c.id);
      expect(spec.side).toBe("squad");
      expect(typeof spec.hasDomain).toBe("boolean");
    }
  });
});

describe("replis", () => {
  it("une note absente retombe sur le repli, pas sur NaN", () => {
    expect(ratingOf(character(), "speed", FALLBACK_SPEED_RATING)).toBe(
      FALLBACK_SPEED_RATING,
    );
    expect(ratingOf(character(), null, FALLBACK_SPEED_RATING)).toBe(
      FALLBACK_SPEED_RATING,
    );
  });

  it("un attribut absent retombe sur le repli", () => {
    expect(numericAttribute(character(), "cursedEnergy", FALLBACK_ENERGY)).toBe(
      FALLBACK_ENERGY,
    );
  });

  it("un attribut numérique écrit en chaîne reste lisible", () => {
    const c = character({ attributes: { cursedEnergy: "75" } });
    expect(numericAttribute(c, "cursedEnergy", FALLBACK_ENERGY)).toBe(75);
  });

  it("une note hors barème ne fait pas sortir la célérité de son intervalle", () => {
    const low = deriveStats(character({ ratings: { speed: -500 } }), config);
    const high = deriveStats(character({ ratings: { speed: 5000 } }), config);

    expect(low.speed).toBe(40);
    expect(high.speed).toBe(100);
  });

  it("l'attribut d'ultime absent vaut faux (pas d'ultime offert par erreur)", () => {
    expect(booleanAttribute(character(), "hasDomain")).toBe(false);
    expect(
      booleanAttribute(character({ attributes: { hasDomain: "true" } }), "hasDomain"),
    ).toBe(true);
    expect(
      booleanAttribute(character({ attributes: { hasDomain: "false" } }), "hasDomain"),
    ).toBe(false);
  });
});

describe("catégorie d'excellence", () => {
  it("retient la note la plus haute", () => {
    const c = character({
      ratings: { speed: 40, "battle-iq": 90, endurance: 60 },
    });
    expect(excellenceCategory(c)).toBe("battle-iq");
  });

  it("tranche les ex æquo de façon STABLE (sinon serveur et client divergent)", () => {
    const c = character({ ratings: { speed: 80, endurance: 80 } });
    const first = excellenceCategory(c);

    for (let i = 0; i < 10; i += 1) {
      expect(excellenceCategory(c)).toBe(first);
    }
    expect(first).toBe("endurance"); // ordre alphabétique
  });

  it("sans aucune note, renvoie null et l'archétype par défaut s'applique", () => {
    const c = character({ ratings: {} });
    expect(excellenceCategory(c)).toBeNull();
    expect(archetypeOf(c, config.categoryArchetypes)).toBe("brute");
  });

  it("une catégorie non mappée retombe sur l'archétype par défaut", () => {
    const c = character({ ratings: { "categorie-inconnue": 99 } });
    expect(archetypeOf(c, config.categoryArchetypes)).toBe("brute");
  });
});

describe("échelle", () => {
  it("un personnage plus fort a plus de PV et de frappe", () => {
    const weak = deriveStats(character({ battleValue: 10 }), config);
    const strong = deriveStats(character({ battleValue: 90 }), config);

    expect(strong.maxHp).toBeGreaterThan(weak.maxHp);
    expect(strong.strike).toBeGreaterThan(weak.strike);
  });

  it("la célérité se lit dans la catégorie qui mappe `swift`, pas dans une clé codée en dur", () => {
    const jjk = deriveStats(character({ ratings: { speed: 100 } }), config);
    const other = deriveStats(character({ ratings: { "csm-speed": 100 } }), {
      ...config,
      categoryArchetypes: { "csm-speed": "swift" },
    });

    expect(jjk.speed).toBe(100);
    expect(other.speed).toBe(100);
  });
});
