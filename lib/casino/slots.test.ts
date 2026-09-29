import { describe, expect, it } from "vitest";
import {
  PAYLINES,
  REEL_STRIPS,
  SLOTS_RTP,
  gridFromStops,
  lineMultiplier,
  resolveSpin,
  type SlotSymbol,
} from "./slots";

/** Cherche un arrêt dont la case centrale est `symbol`. */
function stopOf(reel: number, symbol: SlotSymbol): number {
  const index = REEL_STRIPS[reel]!.indexOf(symbol);
  if (index < 0) throw new Error(`${symbol} absent du rouleau ${reel}`);
  return index;
}

describe("machine à sous — taux de retour", () => {
  it("le RTP exact reste dans la fourchette annoncée (maison gagnante)", () => {
    expect(SLOTS_RTP).toBeGreaterThan(0.94);
    expect(SLOTS_RTP).toBeLessThan(0.97);
  });

  it("les bandes font 32 cases et contiennent chaque symbole", () => {
    for (const strip of REEL_STRIPS) {
      expect(strip).toHaveLength(32);
      for (const s of ["CHERRY", "SEVEN", "DIAMOND", "WILD"] as const) {
        expect(strip).toContain(s);
      }
    }
  });
});

describe("lineMultiplier", () => {
  it("trois identiques", () => {
    expect(lineMultiplier(["SEVEN", "SEVEN", "SEVEN"]).multiplier).toBe(100);
    expect(lineMultiplier(["DIAMOND", "DIAMOND", "DIAMOND"]).multiplier).toBe(500);
  });

  it("le Wild remplace tout sauf le Diamant", () => {
    expect(lineMultiplier(["BAR", "WILD", "BAR"]).symbol).toBe("BAR");
    expect(lineMultiplier(["WILD", "WILD", "BELL"]).symbol).toBe("BELL");
    expect(lineMultiplier(["DIAMOND", "WILD", "DIAMOND"]).multiplier).toBe(0);
    expect(lineMultiplier(["WILD", "WILD", "WILD"]).symbol).toBe("WILD");
  });

  it("cerises depuis la gauche", () => {
    expect(lineMultiplier(["CHERRY", "LEMON", "LEMON"]).count).toBe(1);
    expect(lineMultiplier(["CHERRY", "CHERRY", "LEMON"]).count).toBe(2);
    expect(lineMultiplier(["LEMON", "CHERRY", "CHERRY"]).multiplier).toBe(0);
  });
});

describe("resolveSpin", () => {
  it("la grille suit la bande (case précédente en haut, suivante en bas)", () => {
    const grid = gridFromStops([0, 0, 0]);
    expect(grid[0]).toEqual([REEL_STRIPS[0]!.at(-1), REEL_STRIPS[0]![0], REEL_STRIPS[0]![1]]);
  });

  it("paie la ligne centrale, mise incluse, au prorata des 5 lignes", () => {
    const stops = [0, 1, 2].map((reel) => stopOf(reel, "SEVEN"));
    const spin = resolveSpin(100, stops);
    const center = spin.lineWins.find((w) => w.line === 0);
    expect(center?.symbol).toBe("SEVEN");
    expect(center?.payout).toBe(Math.round((100 * 100) / PAYLINES.length));
    expect(spin.payout).toBe(spin.lineWins.reduce((s, w) => s + w.payout, 0));
    expect(spin.net).toBe(spin.payout - 100);
  });

  it("le payout est entier et jamais négatif, quels que soient les arrêts", () => {
    for (let a = 0; a < 32; a += 3) for (let b = 0; b < 32; b += 5) for (let c = 0; c < 32; c += 7) {
      const spin = resolveSpin(7, [a, b, c]);
      expect(Number.isInteger(spin.payout)).toBe(true);
      expect(spin.payout).toBeGreaterThanOrEqual(0);
    }
  });
});
