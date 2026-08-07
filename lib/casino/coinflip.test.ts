import { describe, expect, it } from "vitest";
import {
  COINFLIP_HOUSE_EDGE_PCT,
  COINFLIP_MULTIPLIER,
  COIN_SIDES,
  isCoinSide,
  otherSide,
  resolveFlip,
} from "./coinflip";

describe("resolveFlip — convention de payout", () => {
  it("LA règle : le payout INCLUT la mise (elle est déjà débitée)", () => {
    // Même garde-fou qu'au blackjack (cf. payout.test.ts) : compter le payout en
    // gain net alors que la mise est partie du solde vole le joueur à chaque
    // lancer gagné.
    const win = resolveFlip(100, "PILE", "PILE");
    expect(win.won).toBe(true);
    expect(win.payout).toBe(195); // 100 de mise rendue + 95 de gain
    expect(win.net).toBe(95);
  });

  it("un lancer perdu ne rend rien et coûte la mise", () => {
    const lose = resolveFlip(100, "PILE", "FACE");
    expect(lose.won).toBe(false);
    expect(lose.payout).toBe(0);
    expect(lose.net).toBe(-100);
  });

  it("la maison garde sa marge : un gain rapporte moins que le double", () => {
    // C'est la SEULE source de revenu du jeu — la pièce, elle, est équilibrée.
    const win = resolveFlip(1_000, "FACE", "FACE");
    expect(win.payout).toBeLessThan(2_000);
    expect(win.net).toBeLessThan(win.bet);
    expect(COINFLIP_HOUSE_EDGE_PCT).toBeCloseTo(2.5);
  });

  it("un gain sur une mise minuscule rapporte quand même quelque chose", () => {
    // La mise minimale peut descendre à 1 coin en admin : tronquer l'arrondi
    // rendrait exactement la mise, donc un « gain » à zéro.
    expect(resolveFlip(1, "PILE", "PILE").net).toBeGreaterThan(0);
    expect(resolveFlip(3, "PILE", "PILE").net).toBeGreaterThan(0);
  });

  it("le payout est toujours entier (il finit en solde)", () => {
    for (const bet of [1, 3, 7, 10, 33, 99, 1_234]) {
      expect(Number.isInteger(resolveFlip(bet, "PILE", "PILE").payout)).toBe(true);
    }
  });

  it("conserve le camp choisi et le camp sorti, pour l'affichage", () => {
    const flip = resolveFlip(50, "PILE", "FACE");
    expect(flip.side).toBe("PILE");
    expect(flip.landed).toBe("FACE");
  });
});

describe("camps", () => {
  it("n'accepte que les deux camps connus", () => {
    expect(isCoinSide("PILE")).toBe(true);
    expect(isCoinSide("FACE")).toBe(true);
    expect(isCoinSide("pile")).toBe(false);
    expect(isCoinSide(null)).toBe(false);
    expect(isCoinSide(0)).toBe(false);
  });

  it("otherSide fait l'aller-retour", () => {
    expect(otherSide("PILE")).toBe("FACE");
    expect(otherSide(otherSide("PILE"))).toBe("PILE");
  });

  it("le tirage n'a que deux issues (le serveur tire dans COIN_SIDES)", () => {
    expect(COIN_SIDES).toHaveLength(2);
    expect(COINFLIP_MULTIPLIER).toBeGreaterThan(1);
    expect(COINFLIP_MULTIPLIER).toBeLessThan(2);
  });
});
