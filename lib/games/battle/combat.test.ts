import { describe, it, expect } from "vitest";
import type { Character } from "@/data/roster/characters";
import type { RosterMap } from "@/lib/multiplayer/state";
import { buildDuelScript, gauntletBreakdown, gauntletSurvivors } from "./combat";
import { computeBattleResult } from "./scoring";

/** Construit un roster minimal id → battleValue (le reste n'importe pas ici). */
function roster(values: Record<string, number>): RosterMap {
  return Object.fromEntries(
    Object.entries(values).map(([id, battleValue]) => [
      id,
      { id, name: id, battleValue } as unknown as Character,
    ]),
  );
}

describe("runGauntlet (HP persistants) — via gauntletSurvivors", () => {
  it("soustrait exactement les HP du perdant au vainqueur", () => {
    const r = roster({ a: 100, b: 30 });
    const { aRemaining, bRemaining, aFinalHp } = gauntletSurvivors(["a"], ["b"], r);
    expect(aRemaining).toBe(1);
    expect(bRemaining).toBe(0);
    expect(aFinalHp).toBe(70); // 100 - 30
  });

  it("un champion usé tombe face à un perso frais (effet recherché)", () => {
    // a(100) bat b1(98) → reste à 2 PV, puis perd contre b2(40) frais.
    const r = roster({ a: 100, b1: 98, b2: 40 });
    const { aRemaining, bRemaining, bFinalHp } = gauntletSurvivors(
      ["a"],
      ["b1", "b2"],
      r,
    );
    expect(aRemaining).toBe(0); // le champion à 2 PV est éliminé
    expect(bRemaining).toBe(1); // b2 survit
    expect(bFinalHp).toBe(38); // 40 - 2
  });

  it("HP courants égaux → double K.O. (les deux éliminés)", () => {
    const r = roster({ a: 50, b: 50 });
    const { aRemaining, bRemaining } = gauntletSurvivors(["a"], ["b"], r);
    expect(aRemaining).toBe(0);
    expect(bRemaining).toBe(0);
  });

  it("résout une chaîne complète et désigne l'équipe survivante", () => {
    // a1(100) vs b1(60) → a1=40 ; a1(40) vs b2(60) → b2=20 ; a2(100) vs b2(20) → a2=80.
    const r = roster({ a1: 100, a2: 100, b1: 60, b2: 60 });
    const { aRemaining, bRemaining, aFinalHp } = gauntletSurvivors(
      ["a1", "a2"],
      ["b1", "b2"],
      r,
    );
    expect(aRemaining).toBe(1);
    expect(bRemaining).toBe(0);
    expect(aFinalHp).toBe(80);
  });
});

describe("buildDuelScript — hardcore (HP data-driven)", () => {
  it("reporte les HP avant/après de chaque duel du point de vue de moi", () => {
    const r = roster({ a: 100, b1: 98, b2: 40 });
    const duels = buildDuelScript(["a"], ["b1", "b2"], r, "hardcore");
    expect(duels).toHaveLength(2);

    expect(duels[0]).toMatchObject({
      outcome: "win",
      mineHpStart: 100,
      theirsHpStart: 98,
      mineHpEnd: 2,
      theirsHpEnd: 0,
      mineMaxHp: 100,
      theirsMaxHp: 98,
    });
    // Le champion garde ses PV réduits en entrant dans le duel suivant.
    expect(duels[1]).toMatchObject({
      outcome: "lose",
      mineHpStart: 2,
      theirsHpStart: 40,
      mineHpEnd: 0,
      theirsHpEnd: 38,
    });
  });
});

describe("buildDuelScript — normal (issue inchangée, HP cosmétiques)", () => {
  it("compare slot par slot sans persistance des HP", () => {
    const r = roster({ a: 10, b: 90, c: 50, d: 50 });
    const duels = buildDuelScript(["a", "c"], ["b", "d"], r, "normal");
    expect(duels[0].outcome).toBe("lose"); // 10 < 90
    expect(duels[0].mineHpEnd).toBe(0);
    expect(duels[0].theirsHpEnd).toBe(90); // vainqueur reste plein
    expect(duels[1].outcome).toBe("draw"); // 50 == 50
    expect(duels[1].mineHpEnd).toBe(0);
    expect(duels[1].theirsHpEnd).toBe(0);
  });
});

describe("gauntletBreakdown", () => {
  it("liste les victimes et les PV restants du survivant", () => {
    const r = roster({ a1: 100, a2: 100, b1: 60, b2: 60 });
    const log = gauntletBreakdown(["a1", "a2"], ["b1", "b2"], r);
    expect(log[0].defeatedIds).toEqual(["b1"]);
    expect(log[0].eliminated).toBe(true);
    expect(log[1].defeatedIds).toEqual(["b2"]);
    expect(log[1].eliminated).toBe(false);
    expect(log[1].remainingHp).toBe(80);
    expect(log[1].maxHp).toBe(100);
  });
});

describe("computeBattleResult — hardcore", () => {
  it("désigne le vainqueur et expose les PV des survivants", () => {
    const r = roster({ a: 100, b1: 98, b2: 40 });
    const res = computeBattleResult(
      { me: ["a"], opp: ["b1", "b2"] },
      r,
      "hardcore",
    );
    expect(res.winnerUserId).toBe("opp");
    expect(res.tie).toBe(false);
    expect(res.survivors).toEqual({ me: 0, opp: 1 });
    expect(res.survivorHp).toEqual({ me: 0, opp: 38 });
  });

  it("double K.O. final → égalité", () => {
    const r = roster({ a: 50, b: 50 });
    const res = computeBattleResult({ me: ["a"], opp: ["b"] }, r, "hardcore");
    expect(res.tie).toBe(true);
    expect(res.winnerUserId).toBeNull();
  });
});
