import { describe, it, expect } from "vitest";
import {
  scoreForAttempt,
  checkPlacement,
  isComplete,
  pickRandomCondition,
  shuffledPool,
  MAX_ATTEMPTS,
} from "./ranking";
import { CONDITIONS, SLOT_COUNT } from "@/data/ranking/conditions";
import { CHARACTER_BY_ID } from "@/data/roster/characters";
import { seededRng } from "@/lib/draw/draw";

const order = ["a", "b", "c", "d", "e", "f", "g", "h"];

describe("scoreForAttempt", () => {
  it("suit le barème par tentative", () => {
    expect(scoreForAttempt(1)).toBe(10000);
    expect(scoreForAttempt(2)).toBe(7500);
    expect(scoreForAttempt(3)).toBe(5000);
    expect(scoreForAttempt(4)).toBe(2500);
  });

  it("renvoie 0 au-delà des tentatives (échec)", () => {
    expect(scoreForAttempt(5)).toBe(0);
    expect(scoreForAttempt(0)).toBe(0);
  });
});

describe("checkPlacement", () => {
  it("marque true uniquement aux bonnes positions", () => {
    const proposed = ["a", "x", "c", null, "e", "f", "g", "z"];
    expect(checkPlacement(proposed, order)).toEqual([
      true, false, true, false, true, true, true, false,
    ]);
  });

  it("un placement parfait est tout true", () => {
    expect(checkPlacement(order, order).every(Boolean)).toBe(true);
  });
});

describe("isComplete", () => {
  it("true seulement si toutes les positions sont correctes", () => {
    expect(isComplete([true, true, true])).toBe(true);
    expect(isComplete([true, false, true])).toBe(false);
    expect(isComplete([])).toBe(false);
  });
});

describe("pickRandomCondition / shuffledPool", () => {
  it("tire une condition du pool", () => {
    const c = pickRandomCondition(seededRng(1));
    expect(CONDITIONS).toContain(c);
  });

  it("ne retombe jamais sur la condition exclue", () => {
    for (const excluded of CONDITIONS) {
      for (let seed = 0; seed < 50; seed++) {
        const c = pickRandomCondition(seededRng(seed), excluded.id);
        expect(c.id).not.toBe(excluded.id);
      }
    }
  });

  it("le pool mélangé garde exactement les mêmes 8 ids", () => {
    const c = CONDITIONS[0];
    const pool = shuffledPool(c, seededRng(3));
    expect(pool).toHaveLength(SLOT_COUNT);
    expect([...pool].sort()).toEqual([...c.order].sort());
  });
});

describe("intégrité des données", () => {
  it("MAX_ATTEMPTS = 4", () => {
    expect(MAX_ATTEMPTS).toBe(4);
  });

  it("chaque condition a 8 ids uniques et existants dans le roster", () => {
    for (const c of CONDITIONS) {
      expect(c.order).toHaveLength(SLOT_COUNT);
      expect(new Set(c.order).size).toBe(SLOT_COUNT);
      for (const id of c.order) {
        expect(CHARACTER_BY_ID[id], `${id} (condition ${c.id})`).toBeDefined();
      }
    }
  });
});
