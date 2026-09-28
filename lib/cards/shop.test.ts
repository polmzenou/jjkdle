import { describe, it, expect } from "vitest";
import { BOOSTER_KINDS } from "./boosters";
import {
  BOOSTER_PRICES,
  DAILY_EXOTIC_COUNT,
  PACK_PREVIEW_COUNT,
  boosterPrice,
  pickDailyExotics,
  pickPackArt,
} from "./shop";
import type { CardRarity } from "./rarity";

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

describe("pickPackArt", () => {
  const card = (characterId: string, rarity: CardRarity, image = true) => ({
    characterId,
    rarity,
    ...(image ? { image: `/img/${characterId}.png` } : {}),
  });
  const roster = [
    card("a", "common"),
    card("b", "uncommon"),
    card("c", "rare"),
    card("d", "epic"),
    card("e", "legendary"),
    card("f", "exotic"),
    card("g", "exotic", false),
  ];

  it("la couverture prend la rareté vitrine du booster", () => {
    expect(pickPackArt("gold", "2026-09-28", roster).cover?.rarity).toBe("exotic");
    expect(pickPackArt("simple", "2026-09-28", roster).cover?.rarity).toBe("rare");
  });

  it("retombe sur la rareté inférieure, et ignore les persos sans image", () => {
    const noExoticArt = roster.filter((c) => c.rarity !== "exotic" || !c.image);
    expect(pickPackArt("gold", "2026-09-28", noExoticArt).cover?.rarity).toBe(
      "legendary",
    );
  });

  it("portraits distincts, sans la couverture, déterministes", () => {
    const art = pickPackArt("silver", "2026-09-28", roster);
    const ids = art.previews.map((c) => c.characterId);
    expect(ids).toHaveLength(PACK_PREVIEW_COUNT);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain(art.cover!.characterId);
    expect(pickPackArt("silver", "2026-09-28", roster)).toEqual(art);
  });

  it("roster sans image → rien", () => {
    expect(pickPackArt("gold", "2026-09-28", [card("x", "rare", false)])).toEqual({
      cover: null,
      previews: [],
    });
  });
});
