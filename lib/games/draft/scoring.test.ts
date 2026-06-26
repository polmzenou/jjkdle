import { describe, it, expect } from "vitest";
import {
  BOSSES,
  contribution,
  resolveCombat,
} from "./scoring";
import { DRAFT_ROSTER_BY_ID } from "./roster";

/**
 * Les seuils des boss sont calibrés sur le ROSTER DE PROD (base, cf.
 * `scripts/calibrate.mjs`), pas sur le roster maître de repli. On ne peut donc
 * pas les vérifier via des équipes statiques : ces tests verrouillent plutôt la
 * FORME de la courbe (ordre, gap, monotonie) — indépendamment du roster.
 */

describe("contribution", () => {
  it("le bonus de catégorie récompense le bon placement", () => {
    const dagon = DRAFT_ROSTER_BY_ID["dagon"]; // excellence: innate-technique
    const placedRight = contribution(dagon, "innate-technique");
    const misplaced = contribution(dagon, "speed");
    expect(placedRight).toBeGreaterThan(misplaced);
  });

  it("un perso cher rapporte plus (bonus de coût)", () => {
    const expensive = DRAFT_ROSTER_BY_ID["mahoraga"]; // coût élevé
    const cheap = DRAFT_ROSTER_BY_ID["yorozu"];
    expect(contribution(expensive, "speed")).toBeGreaterThan(
      contribution(cheap, "speed"),
    );
  });
});

describe("seuils des boss", () => {
  it("6 boss aux seuils strictement croissants", () => {
    expect(BOSSES).toHaveLength(6);
    for (let i = 1; i < BOSSES.length; i++) {
      expect(BOSSES[i].threshold, BOSSES[i].id).toBeGreaterThan(
        BOSSES[i - 1].threshold,
      );
    }
  });

  it("vrai gap entre Geto et Sukuna", () => {
    const geto = BOSSES.find((b) => b.id === "geto")!;
    const sukuna = BOSSES.find((b) => b.id === "sukuna")!;
    expect(sukuna.threshold - geto.threshold).toBeGreaterThanOrEqual(12);
  });
});

describe("resolveCombat", () => {
  it("un score sous le 1er seuil ne tue personne (DEFEAT)", () => {
    const res = resolveCombat(BOSSES[0].threshold - 1);
    expect(res.enemiesKilled).toBe(0);
    expect(res.outcome).toBe("DEFEAT");
  });

  it("un score pile au seuil du boss k tue exactement k+1 boss", () => {
    for (let k = 0; k < BOSSES.length; k++) {
      const res = resolveCombat(BOSSES[k].threshold);
      expect(res.enemiesKilled, BOSSES[k].id).toBe(k + 1);
    }
  });

  it("atteindre le dernier seuil donne la VICTORY", () => {
    const res = resolveCombat(BOSSES[BOSSES.length - 1].threshold);
    expect(res.enemiesKilled).toBe(BOSSES.length);
    expect(res.outcome).toBe("VICTORY");
  });

  it("plus le score est haut, plus on tue de boss (monotone)", () => {
    let prev = -1;
    for (let s = 0; s <= 260; s += 5) {
      const killed = resolveCombat(s).enemiesKilled;
      expect(killed).toBeGreaterThanOrEqual(prev);
      prev = killed;
    }
  });
});
