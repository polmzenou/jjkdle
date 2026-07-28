import { describe, it, expect } from "vitest";
import { BOOSTERS, BOOSTER_DROP_RATES, BOOSTER_KINDS } from "./boosters";
import { rollBooster, rollBoosterKind, sortByRarityAsc, type CardPool } from "./roll";
import { CARD_RARITIES, rarityRank, type CardRarity } from "./rarity";

/** PRNG déterministe (mulberry32) : mêmes tirages à chaque exécution. */
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pool complet : 5 personnages par rareté. */
const FULL_POOL: CardPool = Object.fromEntries(
  CARD_RARITIES.map((rarity) => [
    rarity,
    Array.from({ length: 5 }, (_, i) => `${rarity}-${i}`),
  ]),
);

const rarityOf = (id: string) => id.split("-")[0] as CardRarity;

describe("rollBoosterKind", () => {
  it("ne tire que des raretés de booster connues", () => {
    const rng = seeded(1);
    for (let i = 0; i < 500; i += 1) {
      expect(BOOSTER_KINDS).toContain(rollBoosterKind(rng));
    }
  });

  it("respecte grossièrement les taux (doré très rare)", () => {
    const rng = seeded(42);
    const counts: Record<string, number> = {};
    const runs = 20_000;
    for (let i = 0; i < runs; i += 1) {
      const kind = rollBoosterKind(rng);
      counts[kind] = (counts[kind] ?? 0) + 1;
    }
    for (const kind of BOOSTER_KINDS) {
      const observed = ((counts[kind] ?? 0) / runs) * 100;
      expect(observed).toBeCloseTo(BOOSTER_DROP_RATES[kind], 0);
    }
    expect(counts.gold!).toBeLessThan(counts.simple!);
  });
});

describe("rollBooster", () => {
  it("rend le bon nombre de cartes", () => {
    const rng = seeded(7);
    for (const kind of BOOSTER_KINDS) {
      const def = BOOSTERS[kind];
      expect(rollBooster(def, FULL_POOL, rng)).toHaveLength(def.cardCount);
    }
    expect(BOOSTERS.gold.cardCount).toBe(4);
  });

  it("ne met jamais deux fois le même personnage dans un booster", () => {
    const rng = seeded(99);
    for (let i = 0; i < 2000; i += 1) {
      const drawn = rollBooster(BOOSTERS.gold, FULL_POOL, rng);
      expect(new Set(drawn).size).toBe(drawn.length);
    }
  });

  it("garantit au moins une UNCOMMON+ dans un bronze", () => {
    const rng = seeded(1234);
    for (let i = 0; i < 3000; i += 1) {
      const drawn = rollBooster(BOOSTERS.bronze, FULL_POOL, rng);
      const best = Math.max(...drawn.map((id) => rarityRank(rarityOf(id))));
      expect(best).toBeGreaterThanOrEqual(rarityRank("uncommon"));
    }
  });

  it("garantit une EPIC ou une LEGENDARY dans un doré", () => {
    const rng = seeded(2024);
    let legendaries = 0;
    const runs = 5000;
    for (let i = 0; i < runs; i += 1) {
      const drawn = rollBooster(BOOSTERS.gold, FULL_POOL, rng);
      const rarities = drawn.map((id) => rarityOf(id));
      expect(
        rarities.some((r) => r === "epic" || r === "legendary" || r === "exotic"),
      ).toBe(true);
      if (rarities.includes("legendary")) legendaries += 1;
    }
    // Le slot garanti est legendary à 12 % ; la table boostée en ajoute un peu.
    expect(legendaries / runs).toBeGreaterThan(0.1);
    expect(legendaries / runs).toBeLessThan(0.3);
  });

  it("tient un roster incomplet : aucune rareté basse disponible", () => {
    // Roster JJK réel : ni 4minus (common) ni 4 (uncommon).
    const partial: CardPool = {
      rare: ["rare-1", "rare-2"],
      epic: ["epic-1", "epic-2"],
      legendary: ["legendary-1", "legendary-2"],
      exotic: ["exotic-1"],
    };
    const rng = seeded(5);
    for (let i = 0; i < 1000; i += 1) {
      const drawn = rollBooster(BOOSTERS.bronze, partial, rng);
      expect(drawn).toHaveLength(3);
      for (const id of drawn) {
        expect(["rare", "epic", "legendary", "exotic"]).toContain(rarityOf(id));
      }
    }
  });

  it("retombe sur la table normale si la rareté garantie n'existe pas", () => {
    // Aucun epic ni legendary : le slot garanti du doré doit quand même servir.
    const pool: CardPool = { common: ["c1", "c2", "c3", "c4", "c5"] };
    const drawn = rollBooster(BOOSTERS.gold, pool, seeded(3));
    expect(drawn).toHaveLength(4);
    expect(new Set(drawn).size).toBe(4);
  });

  it("rend un booster plus court plutôt qu'une erreur si le pool est trop petit", () => {
    // Le doré veut 4 cartes, le pool n'en a que 2 (l'ordre du tirage est libre).
    const drawn = rollBooster(BOOSTERS.gold, { rare: ["a", "b"] }, seeded(8));
    expect([...drawn].sort()).toEqual(["a", "b"]);
    expect(rollBooster(BOOSTERS.simple, {}, seeded(8))).toEqual([]);
  });

  it("ne tire jamais un exotic aussi souvent qu'un common (table de base)", () => {
    const rng = seeded(31337);
    const counts: Record<string, number> = {};
    for (let i = 0; i < 5000; i += 1) {
      for (const id of rollBooster(BOOSTERS.simple, FULL_POOL, rng)) {
        const r = rarityOf(id);
        counts[r] = (counts[r] ?? 0) + 1;
      }
    }
    expect(counts.common!).toBeGreaterThan(counts.epic!);
    expect(counts.epic!).toBeGreaterThan(counts.legendary!);
    expect(counts.legendary!).toBeGreaterThan(counts.exotic ?? 0);
  });
});

describe("sortByRarityAsc", () => {
  it("ordonne du plus commun au plus rare (la meilleure carte révélée en dernier)", () => {
    const cards = [
      { rarity: "legendary" as CardRarity },
      { rarity: "common" as CardRarity },
      { rarity: "epic" as CardRarity },
    ];
    expect(sortByRarityAsc(cards).map((c) => c.rarity)).toEqual([
      "common",
      "epic",
      "legendary",
    ]);
  });

  it("ne mute pas le tableau d'entrée", () => {
    const cards = [{ rarity: "exotic" as CardRarity }, { rarity: "rare" as CardRarity }];
    sortByRarityAsc(cards);
    expect(cards[0]!.rarity).toBe("exotic");
  });
});
