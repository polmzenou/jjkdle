import { describe, expect, it } from "vitest";
import { normalizeBets } from "./roulette";
import { readSeatBets, readWheelState, sumBets } from "./roulette-table";

describe("table de roulette — lecture des colonnes Json", () => {
  it("une colonne vide ou corrompue donne un tapis vide", () => {
    expect(readSeatBets([])).toEqual({ bets: {}, ready: false });
    expect(readSeatBets(null)).toEqual({ bets: {}, ready: false });
    expect(readSeatBets({ bets: { red: -5, black: 10 }, ready: "oui" })).toEqual({
      bets: { black: 10 },
      ready: false,
    });
  });

  it("l'état de la roue retombe sur « jamais tiré »", () => {
    expect(readWheelState([])).toEqual({ round: -1, pocket: null, history: [] });
    expect(readWheelState({ round: 3, pocket: 17, history: [17, "x", 4] })).toEqual({
      round: 3,
      pocket: 17,
      history: [17, 4],
    });
  });

  it("additionne les jetons", () => {
    expect(sumBets({ red: 10, "straight:17": 5 })).toBe(15);
    expect(sumBets({})).toBe(0);
  });
});

describe("normalizeBets à une table", () => {
  it("refuse une liste vide en solo, l'accepte à une table (= tout retirer)", () => {
    expect(normalizeBets([])).toBeNull();
    expect(normalizeBets([], { allowEmpty: true })).toEqual([]);
  });

  it("refuse toujours une clé inconnue", () => {
    expect(normalizeBets([{ key: "split:1-36", amount: 10 }], { allowEmpty: true })).toBeNull();
  });
});
