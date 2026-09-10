import { describe, it, expect } from "vitest";
import { pickDraw, DRAW_PER_CATEGORY } from "./draw";
import { seededRng } from "@/lib/draw/draw";
import { JJK_CATEGORIES } from "./categories.fixture";
import { personOf, type DraftTier } from "./types";

/** Composition d'un pool complet, façon import : 2 S, 3 A, 5 B, 5 C. */
const TIERS: DraftTier[] = [
  "S", "S",
  "A", "A", "A",
  "B", "B", "B", "B", "B",
  "C", "C", "C", "C", "C",
];

function tierCounts(line: { tier: DraftTier }[]) {
  const t: Record<DraftTier, number> = { S: 0, A: 0, B: 0, C: 0 };
  for (const c of line) t[c.tier]++;
  return t;
}

describe("quotas de tier du tirage", () => {
  it("chaque ligne contient exactement DRAW_PER_CATEGORY cartes", () => {
    for (let s = 0; s < 500; s++) {
      const d = pickDraw(JJK_CATEGORIES, seededRng(s));
      for (const cat of JJK_CATEGORIES) {
        expect(d[cat.id].length, cat.id).toBe(DRAW_PER_CATEGORY);
      }
    }
  });

  it("respecte le quota par défaut (1 S, 1 A, 1 B, 2 C) sur toutes les lignes", () => {
    for (let s = 0; s < 500; s++) {
      const d = pickDraw(JJK_CATEGORIES, seededRng(s));
      for (const cat of JJK_CATEGORIES) {
        const t = tierCounts(d[cat.id]);
        expect(t.S, `${cat.id} S @${s}`).toBeGreaterThanOrEqual(1);
        expect(t.A, `${cat.id} A @${s}`).toBeGreaterThanOrEqual(1);
        expect(t.B, `${cat.id} B @${s}`).toBeGreaterThanOrEqual(1);
        expect(t.C, `${cat.id} C @${s}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("remplit toutes les lignes même quand les visages se recoupent", () => {
    // 8 lignes de 15 cartes pour seulement 12 personnes : le dédoublonnage ne
    // peut pas tenir, les lignes doivent quand même être pleines.
    const roster = JJK_CATEGORIES.flatMap((cat, ci) =>
      Array.from({ length: 15 }, (_, i) => ({
        id: `${cat.id}-p${i}`,
        name: `P${i}`,
        excellenceCategory: cat.id,
        sourceId: `person-${(ci * 3 + i) % 12}`,
        tier: TIERS[i],
        cost: 20 - i,
        statValue: 25 - i,
      })),
    );

    for (let s = 0; s < 200; s++) {
      const d = pickDraw(JJK_CATEGORIES, seededRng(s), roster);
      for (const cat of JJK_CATEGORIES) {
        expect(d[cat.id].length, `${cat.id} @${s}`).toBe(DRAW_PER_CATEGORY);
        // Un doublon reste interdit DANS une ligne tant qu'elle a de quoi.
        const persons = d[cat.id].map(personOf);
        expect(new Set(persons).size, `${cat.id} @${s}`).toBe(persons.length);
      }
    }
  });

  it("ne propose jamais deux fois la même PERSONNE sur le plateau", () => {
    // Roster de test façon import : chaque personne alimente 3 catégories sous
    // des `id` différents mais un même `sourceId`.
    const roster = JJK_CATEGORIES.flatMap((cat, ci) =>
      Array.from({ length: 15 }, (_, i) => ({
        id: `${cat.id}-p${i}`,
        name: `P${i}`,
        excellenceCategory: cat.id,
        // 80 personnes distinctes pour 40 places : assez de marge pour que le
        // plateau reste entièrement dédoublonné.
        sourceId: `person-${(ci * 9 + i) % 80}`,
        tier: TIERS[i],
        cost: 20 - i,
        statValue: 25 - i,
      })),
    );

    for (let s = 0; s < 200; s++) {
      const d = pickDraw(JJK_CATEGORIES, seededRng(s), roster);
      const persons = JJK_CATEGORIES.flatMap((c) => d[c.id].map(personOf));
      expect(new Set(persons).size, `@${s}`).toBe(persons.length);
    }
  });
});
