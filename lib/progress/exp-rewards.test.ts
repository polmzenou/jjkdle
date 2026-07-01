import { describe, it, expect } from "vitest";
import {
  builderExp,
  rankingExp,
  draftExp,
  battleWinExp,
  jjkdleExp,
} from "./exp-rewards";

describe("builderExp", () => {
  it("attribue l'EXP de chaque grade", () => {
    expect(builderExp("4", false)).toBe(10);
    expect(builderExp("3", false)).toBe(15);
    expect(builderExp("2", false)).toBe(20);
    expect(builderExp("1", false)).toBe(30);
    expect(builderExp("s", false)).toBe(50);
    expect(builderExp("4minus", false)).toBe(0);
  });

  it("double l'EXP sur nouveau record", () => {
    expect(builderExp("s", true)).toBe(100);
    expect(builderExp("4", true)).toBe(20);
    // Grade 4− à 0 reste 0 même en record.
    expect(builderExp("4minus", true)).toBe(0);
  });
});

describe("rankingExp", () => {
  it("applique les paliers de points", () => {
    expect(rankingExp(10000)).toBe(100);
    expect(rankingExp(12000)).toBe(100);
    expect(rankingExp(7500)).toBe(75);
    expect(rankingExp(5000)).toBe(50);
    expect(rankingExp(2500)).toBe(25);
    expect(rankingExp(2499)).toBe(0);
    expect(rankingExp(0)).toBe(0);
  });
});

describe("draftExp", () => {
  it("suit la table 0→2000 boss", () => {
    expect(draftExp(0)).toBe(0);
    expect(draftExp(1)).toBe(10);
    expect(draftExp(2)).toBe(20);
    expect(draftExp(3)).toBe(100);
    expect(draftExp(4)).toBe(500);
    expect(draftExp(5)).toBe(1000);
    expect(draftExp(6)).toBe(2000);
  });

  it("clampe les valeurs hors bornes", () => {
    expect(draftExp(-3)).toBe(0);
    expect(draftExp(99)).toBe(2000);
  });
});

describe("battleWinExp", () => {
  it("vaut 25 pour une victoire", () => {
    expect(battleWinExp()).toBe(25);
  });
});

describe("jjkdleExp", () => {
  it("EXP de base selon les essais (streak 1 = ×2)", () => {
    expect(jjkdleExp(1, 1)).toBe(1000); // 500 × 2
    expect(jjkdleExp(2, 1)).toBe(200); // 100 × 2
    expect(jjkdleExp(4, 1)).toBe(200);
    expect(jjkdleExp(5, 1)).toBe(100); // 50 × 2
    expect(jjkdleExp(7, 1)).toBe(100);
    expect(jjkdleExp(8, 1)).toBe(20); // 10 × 2
    expect(jjkdleExp(50, 1)).toBe(20);
  });

  it("multiplicateur ×(streak+1), non plafonné", () => {
    expect(jjkdleExp(1, 3)).toBe(2000); // 500 × 4
    expect(jjkdleExp(1, 15)).toBe(8000); // 500 × 16
    expect(jjkdleExp(8, 2)).toBe(30); // 10 × 3
  });

  it("streak dégénéré (≤0) retombe sur ×1", () => {
    expect(jjkdleExp(1, 0)).toBe(500);
    expect(jjkdleExp(1, -5)).toBe(500);
  });
});
