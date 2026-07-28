import { describe, it, expect } from "vitest";
import { BOOSTER_KINDS } from "./boosters";
import {
  BOOSTER_PRICES,
  DAILY_EXOTIC_COUNT,
  boosterPrice,
  pickDailyExotics,
} from "./shop";

/** Pool factice de 9 exotics (la taille du roster JJK au moment de l'écriture). */
const pool = ["a", "b", "c", "d", "e", "f", "g", "h", "i"].map((id) => ({ id }));

/** Les `n` clés de jour consécutives à partir du 1er juin 2026. */
function days(n: number): string[] {
  const base = Date.UTC(2026, 5, 1);
  return Array.from({ length: n }, (_, i) =>
    new Date(base + i * 86_400_000).toISOString().slice(0, 10),
  );
}

describe("BOOSTER_PRICES", () => {
  it("chaque booster du catalogue a un prix strictement positif", () => {
    for (const kind of BOOSTER_KINDS) {
      expect(boosterPrice(kind)).toBeGreaterThan(0);
    }
    expect(Object.keys(BOOSTER_PRICES).sort()).toEqual([...BOOSTER_KINDS].sort());
  });

  it("le prix croît avec la rareté de l'enveloppe", () => {
    const prices = BOOSTER_KINDS.map(boosterPrice);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThan(prices[i - 1]!);
    }
  });
});

describe("pickDailyExotics", () => {
  it("déterministe : même jour → même étal", () => {
    expect(pickDailyExotics("2026-06-29", pool)).toEqual(
      pickDailyExotics("2026-06-29", pool),
    );
  });

  it("sert 3 cartes DISTINCTES", () => {
    for (const day of days(20)) {
      const picks = pickDailyExotics(day, pool);
      expect(picks).toHaveLength(DAILY_EXOTIC_COUNT);
      expect(new Set(picks.map((c) => c.id)).size).toBe(DAILY_EXOTIC_COUNT);
    }
  });

  it("change tous les jours : aucune carte commune avec la veille", () => {
    const all = days(20).map((d) => pickDailyExotics(d, pool).map((c) => c.id));
    for (let i = 1; i < all.length; i++) {
      const overlap = all[i]!.filter((id) => all[i - 1]!.includes(id));
      expect(overlap).toEqual([]);
    }
  });

  it("anti-répétition : le pool entier défile avant qu'une carte revienne", () => {
    // 9 cartes servies 3 par jour → un cycle complet en 3 jours, sans doublon.
    const cycle = days(3).flatMap((d) => pickDailyExotics(d, pool).map((c) => c.id));
    expect(new Set(cycle).size).toBe(pool.length);
  });

  it("indépendant de l'ordre du pool reçu", () => {
    const shuffled = [...pool].reverse();
    expect(pickDailyExotics("2026-06-29", shuffled)).toEqual(
      pickDailyExotics("2026-06-29", pool),
    );
  });

  it("pool plus petit que l'étal : sert tout, sans doublon", () => {
    const small = pool.slice(0, 2);
    const picks = pickDailyExotics("2026-06-29", small);
    expect(picks).toHaveLength(2);
    expect(new Set(picks.map((c) => c.id)).size).toBe(2);
  });

  it("pool vide → étal vide (roster sans aucun tier s)", () => {
    expect(pickDailyExotics("2026-06-29", [])).toEqual([]);
  });
});
