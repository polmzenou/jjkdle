import { describe, expect, it } from "vitest";
import {
  MAX_BET_SPOTS,
  ROULETTE_BETS,
  WHEEL_ORDER,
  normalizeBets,
  pocketColor,
  resolveRoulette,
} from "./roulette";

const countKind = (kind: string) =>
  [...ROULETTE_BETS.values()].filter((bet) => bet.kind === kind).length;

describe("cylindre", () => {
  it("contient 0 à 36, une seule fois chacun", () => {
    expect([...WHEEL_ORDER].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 37 }, (_, i) => i),
    );
  });

  it("18 rouges, 18 noirs, un vert — et les couleurs alternent sur la roue", () => {
    const colors = WHEEL_ORDER.map(pocketColor);
    expect(colors.filter((c) => c === "red")).toHaveLength(18);
    expect(colors.filter((c) => c === "black")).toHaveLength(18);
    for (let i = 2; i < colors.length; i++) {
      expect(colors[i]).not.toBe(colors[i - 1]);
    }
  });
});

describe("catalogue des mises", () => {
  it("compte le bon nombre de mises de chaque type", () => {
    expect(countKind("straight")).toBe(37);
    expect(countKind("split")).toBe(60);
    expect(countKind("street")).toBe(12);
    expect(countKind("trio")).toBe(2);
    expect(countKind("corner")).toBe(22);
    expect(countKind("basket")).toBe(1);
    expect(countKind("line")).toBe(11);
    expect(countKind("dozen")).toBe(3);
    expect(countKind("column")).toBe(3);
  });

  it("chaque mise a exactement l'espérance européenne (36/37 par coin)", () => {
    for (const bet of ROULETTE_BETS.values()) {
      const ev = (bet.numbers.length * (bet.payout + 1)) / 37;
      expect(ev).toBeCloseTo(36 / 37, 10);
      expect(Number.isInteger(bet.payout)).toBe(true);
    }
  });

  it("paiements officiels", () => {
    expect(ROULETTE_BETS.get("straight:17")!.payout).toBe(35);
    expect(ROULETTE_BETS.get("split:17-20")!.payout).toBe(17);
    expect(ROULETTE_BETS.get("street:16-17-18")!.payout).toBe(11);
    expect(ROULETTE_BETS.get("corner:16-17-19-20")!.payout).toBe(8);
    expect(ROULETTE_BETS.get("line:13-14-15-16-17-18")!.payout).toBe(5);
    expect(ROULETTE_BETS.get("dozen:2")!.payout).toBe(2);
    expect(ROULETTE_BETS.get("red")!.payout).toBe(1);
  });

  it("les combinaisons impossibles n'existent pas", () => {
    expect(ROULETTE_BETS.has("split:3-4")).toBe(false);
    expect(ROULETTE_BETS.has("split:1-36")).toBe(false);
    expect(ROULETTE_BETS.has("corner:3-4-6-7")).toBe(false);
  });
});

describe("normalizeBets", () => {
  it("fusionne les doublons", () => {
    expect(
      normalizeBets([
        { key: "red", amount: 10 },
        { key: "red", amount: 5 },
      ]),
    ).toEqual([{ key: "red", amount: 15 }]);
  });

  it("refuse clés inconnues, montants invalides et tapis vide", () => {
    expect(normalizeBets([{ key: "split:1-36", amount: 10 }])).toBeNull();
    expect(normalizeBets([{ key: "red", amount: 0 }])).toBeNull();
    expect(normalizeBets([{ key: "red", amount: -5 }])).toBeNull();
    expect(normalizeBets([{ key: "red", amount: 1.5 }])).toBeNull();
    expect(normalizeBets([{ key: "red", amount: "10" }])).toBeNull();
    expect(normalizeBets([])).toBeNull();
    expect(normalizeBets("red")).toBeNull();
    expect(
      normalizeBets(Array.from({ length: MAX_BET_SPOTS + 1 }, () => ({ key: "red", amount: 1 }))),
    ).toBeNull();
  });
});

describe("resolveRoulette", () => {
  it("paie mise incluse et perd le reste", () => {
    const spin = resolveRoulette(
      [
        { key: "straight:17", amount: 10 },
        { key: "black", amount: 20 },
        { key: "red", amount: 5 },
      ],
      17,
    );
    expect(spin.color).toBe("black");
    expect(spin.totalBet).toBe(35);
    expect(spin.payout).toBe(10 * 36 + 20 * 2);
    expect(spin.net).toBe(spin.payout - 35);
  });

  it("le zéro fait perdre les chances simples", () => {
    const spin = resolveRoulette(
      [
        { key: "red", amount: 10 },
        { key: "black", amount: 10 },
      ],
      0,
    );
    expect(spin.payout).toBe(0);
  });
});
