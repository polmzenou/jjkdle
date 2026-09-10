import { describe, it, expect } from "vitest";
import {
  DRAFT_POOL_SIZE,
  TIER_BANDS,
  TIER_ORDER,
  TIER_SHARE,
  generatePool,
  statsFor,
  tierCounts,
} from "./generate";
import type { DraftTier } from "./types";

const total = (c: Record<DraftTier, number>) =>
  TIER_ORDER.reduce((sum, t) => sum + c[t], 0);

describe("tierCounts", () => {
  it("répartit un pool complet en 2 S / 3 A / 5 B / 5 C", () => {
    expect(tierCounts(DRAFT_POOL_SIZE)).toEqual({ S: 2, A: 3, B: 5, C: 5 });
  });

  it("tronque au-delà de la taille de pool", () => {
    expect(tierCounts(40)).toEqual({ S: 2, A: 3, B: 5, C: 5 });
  });

  it("place exactement `count` personnages en dessous de la taille de pool", () => {
    for (let n = 0; n <= DRAFT_POOL_SIZE; n++) {
      expect(total(tierCounts(n)), `n=${n}`).toBe(n);
    }
  });

  it("ne dépasse jamais la part cible d'un tier", () => {
    for (let n = 0; n <= DRAFT_POOL_SIZE; n++) {
      const counts = tierCounts(n);
      for (const tier of TIER_ORDER) {
        expect(counts[tier], `${tier} @${n}`).toBeLessThanOrEqual(
          TIER_SHARE[tier],
        );
      }
    }
  });

  it("garantit une carte bon marché dès 4 personnages notés", () => {
    // Sans un tier C, le forward-checking du budget peut rendre la ligne
    // entièrement injouable : c'est le garde-fou le plus important.
    for (let n = 4; n <= DRAFT_POOL_SIZE; n++) {
      expect(tierCounts(n).C, `n=${n}`).toBeGreaterThanOrEqual(1);
    }
  });

  it("reproduit le quota historique sur une ligne de 5 (1 S, 1 A, 1 B, 2 C)", () => {
    expect(tierCounts(5)).toEqual({ S: 1, A: 1, B: 1, C: 2 });
  });

  it("ne rend rien pour un pool vide ou négatif", () => {
    expect(total(tierCounts(0))).toBe(0);
    expect(total(tierCounts(-3))).toBe(0);
  });
});

describe("statsFor", () => {
  it("donne le haut de la bande au mieux noté du tier", () => {
    expect(statsFor("S", 0, 2)).toEqual({ statValue: 25, cost: 28 });
    expect(statsFor("C", 0, 5)).toEqual({ statValue: 9, cost: 6 });
  });

  it("donne le bas de la bande au dernier du tier", () => {
    expect(statsFor("S", 1, 2)).toEqual({ statValue: 22, cost: 22 });
    expect(statsFor("C", 4, 5)).toEqual({ statValue: 6, cost: 3 });
  });

  it("donne le haut de la bande à un tier d'un seul membre", () => {
    expect(statsFor("A", 0, 1)).toEqual({ statValue: 19, cost: 18 });
  });

  it("reste dans les bornes de la bande, quel que soit le rang", () => {
    for (const tier of TIER_ORDER) {
      const band = TIER_BANDS[tier];
      for (let size = 1; size <= 5; size++) {
        for (let i = 0; i < size; i++) {
          const { statValue, cost } = statsFor(tier, i, size);
          expect(statValue, `${tier} stat ${i}/${size}`).toBeGreaterThanOrEqual(
            band.stat[0],
          );
          expect(statValue).toBeLessThanOrEqual(band.stat[1]);
          expect(cost, `${tier} cost ${i}/${size}`).toBeGreaterThanOrEqual(
            band.cost[0],
          );
          expect(cost).toBeLessThanOrEqual(band.cost[1]);
        }
      }
    }
  });
});

describe("generatePool", () => {
  it("rend une place par personnage, du meilleur au moins bon", () => {
    const pool = generatePool(DRAFT_POOL_SIZE);
    expect(pool).toHaveLength(DRAFT_POOL_SIZE);
    expect(pool.map((s) => s.tier)).toEqual([
      "S", "S",
      "A", "A", "A",
      "B", "B", "B", "B", "B",
      "C", "C", "C", "C", "C",
    ]);
  });

  it("ne remonte jamais en coût quand on descend le classement", () => {
    for (let n = 1; n <= DRAFT_POOL_SIZE; n++) {
      const pool = generatePool(n);
      for (let i = 1; i < pool.length; i++) {
        expect(pool[i].cost, `n=${n} rang ${i}`).toBeLessThanOrEqual(
          pool[i - 1].cost,
        );
        expect(pool[i].statValue).toBeLessThanOrEqual(pool[i - 1].statValue);
      }
    }
  });

  it("laisse une équipe de 8 finançable sous le budget", () => {
    // Huit lignes courtes (8 notés chacune) : la carte la moins chère de chaque
    // ligne doit permettre de remplir les 8 slots sous BUDGET = 110.
    const cheapest = generatePool(8).at(-1)!.cost;
    expect(cheapest * 8).toBeLessThanOrEqual(110);
  });
});
