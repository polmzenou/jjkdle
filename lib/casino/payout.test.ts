import { describe, expect, it } from "vitest";
import { resolveHand } from "./payout";
import type { BjHand } from "./types";

/** Fabrique une main jouée, tous champs par défaut sauf ce qui est passé. */
function hand(cards: string[], bet = 100, doubled = false): BjHand {
  return { cards, bet, doubled, status: "STAND" };
}

describe("resolveHand — convention de payout", () => {
  it("LA règle : le payout INCLUT la mise (elle a déjà été débitée)", () => {
    // Garde-fou contre le bug classique : compter le payout en gain net alors
    // que la mise est déjà partie du solde revient à voler le joueur.
    const win = resolveHand(hand(["TS", "9H"]), ["TD", "8C"]);
    expect(win.payout).toBe(200); // 100 de mise rendue + 100 de gain
    expect(win.net).toBe(100);
  });

  it("un push rend exactement la mise, pas zéro", () => {
    const push = resolveHand(hand(["TS", "9H"]), ["TD", "9C"]);
    expect(push.outcome).toBe("PUSH");
    expect(push.payout).toBe(100);
    expect(push.net).toBe(0);
  });

  it("une main perdue ne rend rien", () => {
    const lose = resolveHand(hand(["TS", "7H"]), ["TD", "9C"]);
    expect(lose.outcome).toBe("LOSE");
    expect(lose.payout).toBe(0);
    expect(lose.net).toBe(-100);
  });
});

describe("resolveHand — blackjack", () => {
  it("un naturel paie 3:2, soit 2,5 × la mise au total", () => {
    const bj = resolveHand(hand(["AS", "KH"]), ["TD", "8C"]);
    expect(bj.outcome).toBe("BLACKJACK");
    expect(bj.payout).toBe(250);
    expect(bj.net).toBe(150);
  });

  it("arrondit le 3:2 à l'entier inférieur sur une mise impaire", () => {
    const bj = resolveHand(hand(["AS", "KH"], 25), ["TD", "8C"]);
    expect(bj.payout).toBe(62); // floor(25 × 2,5) = 62
  });

  it("deux naturels se poussent", () => {
    const push = resolveHand(hand(["AS", "KH"]), ["AD", "QC"]);
    expect(push.outcome).toBe("PUSH");
    expect(push.payout).toBe(100);
  });

  it("le naturel du croupier bat un 21 en trois cartes", () => {
    const lose = resolveHand(hand(["7S", "7H", "7C"]), ["AD", "QC"]);
    expect(lose.outcome).toBe("LOSE");
  });

  it("un 21 en trois cartes ne paie que 1:1 face à un croupier à 20", () => {
    const win = resolveHand(hand(["7S", "7H", "7C"]), ["TD", "QC"]);
    expect(win.outcome).toBe("WIN");
    expect(win.payout).toBe(200);
  });
});

describe("resolveHand — bust", () => {
  it("le bust du joueur perd MÊME SI le croupier saute ensuite", () => {
    // C'est l'avantage de la maison, la seule raison pour laquelle elle gagne.
    const lose = resolveHand(hand(["TS", "9H", "5C"]), ["TD", "8C", "9S"]);
    expect(lose.outcome).toBe("LOSE");
    expect(lose.payout).toBe(0);
  });

  it("le bust du croupier fait gagner toutes les mains debout", () => {
    const win = resolveHand(hand(["5S", "6H"]), ["TD", "8C", "9S"]);
    expect(win.outcome).toBe("WIN");
    expect(win.payout).toBe(200);
  });
});

describe("resolveHand — main doublée", () => {
  it("une main doublée gagne sur la mise doublée", () => {
    const win = resolveHand(hand(["5S", "6H", "9C"], 200, true), ["TD", "8C"]);
    expect(win.payout).toBe(400);
    expect(win.net).toBe(200);
  });

  it("une main doublée perdue coûte la mise doublée", () => {
    const lose = resolveHand(hand(["5S", "5H", "TC"], 200, true), ["TD", "AC"]);
    expect(lose.payout).toBe(0);
    expect(lose.net).toBe(-200);
  });
});
