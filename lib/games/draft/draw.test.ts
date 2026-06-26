import { describe, it, expect } from "vitest";
import { pickDraw, DRAW_PER_CATEGORY } from "./draw";
import { DRAFT_CATEGORIES } from "./categories";
import { DRAFT_ROSTER_BY_ID } from "./roster";
import { seededRng } from "@/lib/draw/draw";

describe("pickDraw", () => {
  const seeds = [1, 7, 42, 1337, 99999];

  it("propose DRAW_PER_CATEGORY persos valides par catégorie", () => {
    for (const seed of seeds) {
      const draw = pickDraw(seededRng(seed));
      for (const cat of DRAFT_CATEGORIES) {
        const line = draw[cat.id];
        expect(line, `${cat.id}@${seed}`).toHaveLength(DRAW_PER_CATEGORY);
        for (const c of line) {
          expect(DRAFT_ROSTER_BY_ID[c.id]).toBeDefined();
        }
      }
    }
  });

  it("ne propose QUE des persos de la catégorie (cloisonnement)", () => {
    for (const seed of seeds) {
      const draw = pickDraw(seededRng(seed));
      for (const cat of DRAFT_CATEGORIES) {
        for (const c of draw[cat.id]) {
          expect(c.excellenceCategory, `${c.id}@${cat.id}`).toBe(cat.id);
        }
      }
    }
  });

  it("ne propose jamais deux fois le même perso sur tout le plateau", () => {
    for (const seed of seeds) {
      const draw = pickDraw(seededRng(seed));
      const all = DRAFT_CATEGORIES.flatMap((c) => draw[c.id].map((x) => x.id));
      expect(new Set(all).size).toBe(all.length);
    }
  });

  it("garantit au moins une carte Tier C par catégorie (budget tenable)", () => {
    for (const seed of seeds) {
      const draw = pickDraw(seededRng(seed));
      for (const cat of DRAFT_CATEGORIES) {
        const hasCheap = draw[cat.id].some((c) => c.tier === "C");
        expect(hasCheap, `${cat.id}@${seed}`).toBe(true);
      }
    }
  });

  it("le pire choix possible (carte C la moins chère par catégorie) tient dans 100", () => {
    for (const seed of seeds) {
      const draw = pickDraw(seededRng(seed));
      const minTotal = DRAFT_CATEGORIES.reduce((sum, cat) => {
        const cheapest = Math.min(...draw[cat.id].map((c) => c.cost));
        return sum + cheapest;
      }, 0);
      expect(minTotal).toBeLessThanOrEqual(100);
    }
  });
});
