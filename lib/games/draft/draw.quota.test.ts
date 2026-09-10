import { describe, it, expect } from "vitest";
import { pickDraw, DRAW_PER_CATEGORY } from "./draw";
import { seededRng } from "@/lib/draw/draw";
import { DRAFT_CATEGORIES } from "./categories";
import { personOf, type DraftTier } from "./types";

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

  it("respecte le quota par défaut (1 S, 1 A, 1 B, 2 C) sur toutes les lignes", () => {
    for (let s = 0; s < 500; s++) {
      const d = pickDraw(seededRng(s));
      for (const cat of DRAFT_CATEGORIES) {
        const t = tierCounts(d[cat.id]);
        expect(t.S, `${cat.id} S @${s}`).toBeGreaterThanOrEqual(1);
        expect(t.A, `${cat.id} A @${s}`).toBeGreaterThanOrEqual(1);
        expect(t.B, `${cat.id} B @${s}`).toBeGreaterThanOrEqual(1);
        expect(t.C, `${cat.id} C @${s}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("ne propose jamais deux fois la même PERSONNE sur le plateau", () => {
    // Roster de test façon import : chaque personne alimente 3 catégories sous
    // des `id` différents mais un même `sourceId`.
    const roster = DRAFT_CATEGORIES.flatMap((cat, ci) =>
      Array.from({ length: 15 }, (_, i) => ({
        id: `${cat.id}-p${i}`,
        name: `P${i}`,
        excellenceCategory: cat.id,
        // 15 cartes par ligne mais seulement 40 personnes au total : les
        // catégories se disputent réellement les mêmes visages.
        sourceId: `person-${(ci * 5 + i) % 40}`,
        tier: (["S", "S", "A", "A", "A", "B", "B", "B", "B", "B", "C", "C", "C", "C", "C"] as DraftTier[])[i],
        cost: 20 - i,
        statValue: 25 - i,
      })),
    );

    for (let s = 0; s < 200; s++) {
      const d = pickDraw(seededRng(s), roster);
      const persons = DRAFT_CATEGORIES.flatMap((c) => d[c.id].map(personOf));
      expect(new Set(persons).size, `@${s}`).toBe(persons.length);
    }
  });
});
