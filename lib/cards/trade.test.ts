import { describe, it, expect } from "vitest";
import {
  MAX_TRADE_CARDS,
  TRADE_MESSAGE_MAX,
  normalizeTradeMessage,
  validateTradeLines,
} from "./trade";

const universe = new Set(["a", "b", "c"]);
const counts = new Map([["a", 3], ["b", 2], ["c", 1]]);

describe("validateTradeLines", () => {
  it("accepte des doublons et fusionne les lignes d'un même perso", () => {
    const res = validateTradeLines(
      [{ characterId: "a", quantity: 1 }, { characterId: "a", quantity: 1 }, { characterId: "b", quantity: 1 }],
      counts,
      universe,
      "Tu",
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.lines.get("a")).toBe(2);
  });

  it("refuse le dernier exemplaire", () => {
    expect(validateTradeLines([{ characterId: "c", quantity: 1 }], counts, universe, "Tu").ok).toBe(false);
    expect(validateTradeLines([{ characterId: "a", quantity: 3 }], counts, universe, "Tu").ok).toBe(false);
  });

  it("refuse un côté vide", () => {
    expect(validateTradeLines([], counts, universe, "Tu").ok).toBe(false);
  });

  it("refuse plus de MAX_TRADE_CARDS", () => {
    const many = new Map([["a", 20]]);
    expect(
      validateTradeLines([{ characterId: "a", quantity: MAX_TRADE_CARDS + 1 }], many, universe, "Tu").ok,
    ).toBe(false);
  });

  it("refuse une carte d'un autre univers", () => {
    const res = validateTradeLines([{ characterId: "z", quantity: 1 }], new Map([["z", 5]]), universe, "Tu");
    expect(res.ok).toBe(false);
  });

  it("refuse des quantités invalides", () => {
    expect(validateTradeLines([{ characterId: "a", quantity: 0 }], counts, universe, "Tu").ok).toBe(false);
    expect(validateTradeLines([{ characterId: "a", quantity: 1.5 }], counts, universe, "Tu").ok).toBe(false);
  });
});

describe("normalizeTradeMessage", () => {
  it("trim, coupe, vide → null", () => {
    expect(normalizeTradeMessage("  salut ")).toBe("salut");
    expect(normalizeTradeMessage("   ")).toBeNull();
    expect(normalizeTradeMessage(42)).toBeNull();
    expect(normalizeTradeMessage("x".repeat(500))).toHaveLength(TRADE_MESSAGE_MAX);
  });
});
