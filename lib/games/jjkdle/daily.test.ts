import { describe, it, expect } from "vitest";
import type { Character } from "@/data/roster/characters";
import { eligibleRoster, pickDailyTarget, todayKey } from "./daily";

/** Fabrique un perso complet (éligible) avec un id donné. */
function complete(id: string): Character {
  return {
    id,
    name: id,
    title: "",
    tier: "3",
    ratings: {},
    race: "HUMAN",
    gender: "MALE",
    grade: "GRADE_3",
    affiliation: "TOKYO_SCHOOL",
    clan: "NONE",
    appearanceArc: "FEARSOME_WOMB",
    hasDomain: false,
    cursedEnergy: 50,
  };
}

const pool = ["a", "b", "c", "d", "e", "f", "g", "h"].map(complete);

describe("eligibleRoster", () => {
  it("exclut les persos incomplets et trie par id", () => {
    const incomplete: Character = { ...complete("z"), race: undefined };
    const roster = [complete("c"), incomplete, complete("a"), complete("b")];
    expect(eligibleRoster(roster).map((c) => c.id)).toEqual(["a", "b", "c"]);
  });
});

describe("pickDailyTarget", () => {
  it("déterministe : même date → même cible", () => {
    const a = pickDailyTarget("2026-06-29", pool);
    const b = pickDailyTarget("2026-06-29", pool);
    expect(a?.id).toBe(b?.id);
  });

  it("anti-répétition : toute fenêtre de n jours consécutifs est sans doublon", () => {
    // n = 8 ; on balaie 30 jours et on vérifie chaque fenêtre glissante de 8.
    const base = Date.UTC(2026, 5, 1);
    const picks: (string | undefined)[] = [];
    for (let i = 0; i < 30; i++) {
      const key = new Date(base + i * 86_400_000).toISOString().slice(0, 10);
      picks.push(pickDailyTarget(key, pool)?.id);
    }
    for (let i = 0; i + pool.length <= picks.length; i++) {
      const window = picks.slice(i, i + pool.length);
      expect(new Set(window).size).toBe(pool.length);
    }
  });

  it("renvoie null si pool vide", () => {
    expect(pickDailyTarget("2026-06-29", [])).toBeNull();
  });
});

describe("todayKey", () => {
  it("format YYYY-MM-DD", () => {
    expect(todayKey(new Date("2026-06-29T10:00:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
