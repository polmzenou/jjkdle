import { describe, it, expect } from "vitest";
import { pickDraw, DRAW_PER_CATEGORY } from "./draw";
import { seededRng } from "@/lib/draw/draw";
import { DRAFT_CATEGORIES } from "./categories";
import type { DraftTier } from "./types";

function tierCounts(line: { tier: DraftTier }[]) {
  const t: Record<DraftTier, number> = { S: 0, A: 0, B: 0, C: 0 };
  for (const c of line) t[c.tier]++;
  return t;
}

describe("quotas de tier du tirage", () => {
  it("chaque ligne contient exactement DRAW_PER_CATEGORY cartes", () => {
    for (let s = 0; s < 500; s++) {
      const d = pickDraw(seededRng(s));
      for (const cat of DRAFT_CATEGORIES) {
        expect(d[cat.id].length, cat.id).toBe(DRAW_PER_CATEGORY);
      }
    }
  });

  it("respecte le quota par défaut (1 S, 1 A, 1 B, 2 C)", () => {
    const std = DRAFT_CATEGORIES.filter(
      (c) => c.id !== "black-flash" && c.id !== "domain-expansion",
    );
    for (let s = 0; s < 500; s++) {
      const d = pickDraw(seededRng(s));
      for (const cat of std) {
        const t = tierCounts(d[cat.id]);
        expect(t.S, `${cat.id} S @${s}`).toBeGreaterThanOrEqual(1);
        expect(t.A, `${cat.id} A @${s}`).toBeGreaterThanOrEqual(1);
        expect(t.B, `${cat.id} B @${s}`).toBeGreaterThanOrEqual(1);
        expect(t.C, `${cat.id} C @${s}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("black-flash garantit au moins 1 S", () => {
    for (let s = 0; s < 500; s++) {
      const d = pickDraw(seededRng(s));
      expect(tierCounts(d["black-flash"]).S, `@${s}`).toBeGreaterThanOrEqual(1);
    }
  });

  it("domain-expansion garantit 1 S, 2 B et autant de A que possible", () => {
    for (let s = 0; s < 500; s++) {
      const d = pickDraw(seededRng(s));
      const t = tierCounts(d["domain-expansion"]);
      expect(t.S, `S @${s}`).toBeGreaterThanOrEqual(1);
      expect(t.B, `B @${s}`).toBeGreaterThanOrEqual(2);
      // Roster maître n'a qu'un A en domain-expansion → best-effort.
      expect(t.A, `A @${s}`).toBeGreaterThanOrEqual(1);
    }
  });
});
