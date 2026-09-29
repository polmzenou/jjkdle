import { describe, expect, it } from "vitest";
import {
  FREE_SPIN_COOLDOWN_MS,
  ROULETTE_SLOTS,
  msUntilFreeSpin,
  pickSlot,
  slotIndex,
} from "./prizes";

describe("ROULETTE_SLOTS", () => {
  it("a 12 cases aux ids uniques", () => {
    expect(ROULETTE_SLOTS).toHaveLength(12);
    expect(new Set(ROULETTE_SLOTS.map((s) => s.id)).size).toBe(12);
  });

  it("des poids qui somment à 100 (ce sont les % affichés)", () => {
    expect(ROULETTE_SLOTS.reduce((sum, s) => sum + s.weight, 0)).toBe(100);
    for (const s of ROULETTE_SLOTS) expect(s.weight).toBeGreaterThan(0);
  });

  it("contient exactement les lots demandés", () => {
    const coins = ROULETTE_SLOTS.flatMap((s) =>
      s.kind === "coins" ? [s.amount] : [],
    ).sort((a, b) => a - b);
    expect(coins).toEqual([50, 75, 100, 300, 1000, 2000]);

    const boosters = ROULETTE_SLOTS.flatMap((s) =>
      s.kind === "booster" ? [s.booster] : [],
    ).sort();
    expect(boosters).toEqual(["bronze", "gold", "silver", "simple", "simple"]);

    expect(ROULETTE_SLOTS.filter((s) => s.kind === "card")).toHaveLength(1);
  });

  it("les deux boosters simples ne sont pas voisins sur la roue", () => {
    const idx = ROULETTE_SLOTS.flatMap((s, i) =>
      s.kind === "booster" && s.booster === "simple" ? [i] : [],
    );
    const [a, b] = idx as [number, number];
    const gap = Math.min(Math.abs(a - b), 12 - Math.abs(a - b));
    expect(gap).toBeGreaterThan(1);
  });
});

describe("pickSlot", () => {
  it("est déterministe avec un rng injecté", () => {
    expect(pickSlot(() => 0)).toBe(0);
    expect(pickSlot(() => 0.999999)).toBe(ROULETTE_SLOTS.length - 1);
    // 18 % (coins-50) puis 1 % (gold) : 0.185 tombe sur la case 1.
    expect(pickSlot(() => 0.185)).toBe(1);
  });

  it("respecte la distribution sur un grand nombre de tirages", () => {
    const counts = new Array(ROULETTE_SLOTS.length).fill(0) as number[];
    let seed = 42;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const N = 200_000;
    for (let i = 0; i < N; i++) counts[pickSlot(rng)]!++;
    ROULETTE_SLOTS.forEach((s, i) => {
      expect(counts[i]! / N).toBeCloseTo(s.weight / 100, 2);
    });
  });
});

describe("slotIndex / msUntilFreeSpin", () => {
  it("retrouve une case par id", () => {
    expect(slotIndex("card")).toBe(5);
    expect(slotIndex("nope")).toBe(-1);
  });

  it("calcule le délai avant le tour gratuit", () => {
    const now = 1_000_000_000_000;
    expect(msUntilFreeSpin(null, now)).toBe(0);
    expect(msUntilFreeSpin(new Date(now), now)).toBe(FREE_SPIN_COOLDOWN_MS);
    expect(msUntilFreeSpin(new Date(now - FREE_SPIN_COOLDOWN_MS - 1), now)).toBe(0);
  });
});
