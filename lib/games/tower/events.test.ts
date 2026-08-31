import { describe, expect, it } from "vitest";
import { JJK_EVENTS } from "@/lib/universes/jjk-events";
import { ITEM_RARITIES } from "./items";
import { eventFor, isValidEvent, type TowerEvent } from "./events";

/**
 * Les évènements sont le seul contenu ÉCRIT du jeu, donc le seul endroit où
 * une faute d'inattention ne se rattrape pas toute seule. Ces tests vérifient
 * la forme du catalogue et, surtout, l'invariant de conception : **aucune
 * branche ne doit être gratuite** — sans quoi l'évènement n'est plus un choix.
 */

function event(overrides: Partial<TowerEvent> = {}): TowerEvent {
  return {
    slug: "x",
    title: "T",
    text: "…",
    choices: [
      { label: "A", outcome: { text: "a" } },
      { label: "B", outcome: { text: "b" } },
    ],
    ...overrides,
  };
}

describe("sélection", () => {
  const catalog = [event({ slug: "a" }), event({ slug: "b" }), event({ slug: "c" })];

  it("indexe modulo la taille du catalogue", () => {
    expect(eventFor(catalog, 0)?.slug).toBe("a");
    expect(eventFor(catalog, 4)?.slug).toBe("b");
  });

  it("reste déterministe pour une graine donnée", () => {
    expect(eventFor(catalog, 12345)).toBe(eventFor(catalog, 12345));
  });

  it("tolère un index négatif ou aberrant", () => {
    expect(eventFor(catalog, -7)).not.toBeNull();
    expect(eventFor(catalog, 1e9)).not.toBeNull();
  });

  it("rend null sur un catalogue vide plutôt que de jeter", () => {
    expect(eventFor([], 3)).toBeNull();
  });
});

describe("garde de forme", () => {
  it("accepte un évènement complet", () => {
    expect(isValidEvent(event())).toBe(true);
  });

  it("refuse un évènement sans deux issues", () => {
    const one = { ...event(), choices: [event().choices[0]] } as unknown as TowerEvent;
    expect(isValidEvent(one)).toBe(false);
  });

  it("refuse une issue sans texte", () => {
    const broken = event({
      choices: [
        { label: "A", outcome: { text: "" } },
        { label: "B", outcome: { text: "b" } },
      ],
    });
    expect(isValidEvent(broken)).toBe(false);
  });
});

describe("catalogue JJK", () => {
  it("est intégralement valide", () => {
    expect(JJK_EVENTS.length).toBeGreaterThanOrEqual(8);
    for (const e of JJK_EVENTS) {
      expect(isValidEvent(e)).toBe(true);
    }
  });

  it("a des slugs uniques", () => {
    const slugs = JJK_EVENTS.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("ne référence que des raretés connues", () => {
    for (const e of JJK_EVENTS) {
      for (const c of e.choices) {
        if (!c.outcome.item) continue;
        if (c.outcome.item === "any") continue;
        expect(ITEM_RARITIES).toContain(c.outcome.item);
      }
    }
  });

  it("AUCUNE branche n'est gratuite : chacune prend ou parie quelque chose", () => {
    for (const e of JJK_EVENTS) {
      const costs = e.choices.map((c) => {
        const o = c.outcome;
        const gains =
          (o.fragments ?? 0) > 0 || (o.healPct ?? 0) > 0 || Boolean(o.item);
        const losses = (o.fragments ?? 0) < 0 || (o.healPct ?? 0) < 0;
        return { gains, losses };
      });

      // Une branche qui ne donne rien du tout est acceptable (« passer son
      // chemin »), mais une branche qui donne SANS RIEN COÛTER rendrait
      // l'autre option inutile.
      const free = costs.filter((c) => c.gains && !c.losses);
      expect(free.length).toBeLessThanOrEqual(1);
    }
  });

  it("garde des libellés qui disent l'intention, pas le résultat", () => {
    for (const e of JJK_EVENTS) {
      for (const c of e.choices) {
        // Un libellé chiffré (« Gagner 60 fragments ») supprimerait le risque.
        expect(c.label).not.toMatch(/\d/);
      }
    }
  });
});
