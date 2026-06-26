import { describe, it, expect } from "vitest";
import {
  BOSSES,
  BUDGET,
  contribution,
  computeGlobalScore,
  evaluateDraft,
  totalCost,
} from "./scoring";
import { DRAFT_ROSTER_BY_ID } from "./roster";
import type { DraftSelection } from "./types";

/**
 * Simulation d'équilibrage (tirage CLOISONNÉ : chaque perso est dans sa
 * catégorie). Les équipes ci-dessous ont été mesurées par brute-force comme
 * atteignant pile chaque palier de boss (1 → 6). Elles verrouillent la
 * calibration : si un seuil/coût bouge, le test signale la régression.
 *
 * Scores mesurés : tier1=92, tier2=140, tier3=165, tier4=188, tier5=205, tier6=223.
 */
const ARCHETYPES: Record<string, DraftSelection> = {
  // 1 boss — équipe la moins chère possible (score plancher 92).
  tier1: {
    "occult-energy": "miwa",
    "physical-strength": "mai",
    speed: "utahime",
    "battle-iq": "shoko",
    "innate-technique": "charles",
    "domain-expansion": "manami",
    "black-flash": "nitta",
    teammate: "yorozu",
  },
  // 2 boss (140).
  tier2: {
    "occult-energy": "yuta",
    "physical-strength": "mai",
    speed: "divine-dog",
    "battle-iq": "shoko",
    "innate-technique": "kurourushi",
    "domain-expansion": "manami",
    "black-flash": "toad",
    teammate: "yorozu",
  },
  // 3 boss (165).
  tier3: {
    "occult-energy": "yuta",
    "physical-strength": "todo",
    speed: "utahime",
    "battle-iq": "shoko",
    "innate-technique": "kurourushi",
    "domain-expansion": "manami",
    "black-flash": "nitta",
    teammate: "yorozu",
  },
  // 4 boss (188).
  tier4: {
    "occult-energy": "yuta",
    "physical-strength": "todo",
    speed: "nanami",
    "battle-iq": "shoko",
    "innate-technique": "kurourushi",
    "domain-expansion": "fumihiko",
    "black-flash": "nitta",
    teammate: "yorozu",
  },
  // 5 boss (205).
  tier5: {
    "occult-energy": "yuta",
    "physical-strength": "todo",
    speed: "naoya",
    "battle-iq": "shoko",
    "innate-technique": "dagon",
    "domain-expansion": "manami",
    "black-flash": "nitta",
    teammate: "yorozu",
  },
  // 6 boss — VICTORY (223, optimum brute-force sous budget).
  tier6: {
    "occult-energy": "choso",
    "physical-strength": "maki",
    speed: "divine-dog",
    "battle-iq": "mechamaru",
    "innate-technique": "dagon",
    "domain-expansion": "angel",
    "black-flash": "inumaki",
    teammate: "rika",
  },
};

describe("budget", () => {
  it("tous les archetypes respectent le budget", () => {
    for (const [name, sel] of Object.entries(ARCHETYPES)) {
      expect(totalCost(sel), name).toBeLessThanOrEqual(BUDGET);
    }
  });
});

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

describe("courbe d'équilibrage Panda → Yuji", () => {
  const killed = (name: keyof typeof ARCHETYPES) =>
    evaluateDraft(ARCHETYPES[name]).enemiesKilled;

  it("l'équipe la moins chère tombe pile sur Panda (1 boss)", () => {
    expect(killed("tier1")).toBe(1);
  });

  it("chaque palier d'équipe vainc un boss de plus", () => {
    expect(killed("tier2")).toBe(2);
    expect(killed("tier3")).toBe(3);
    expect(killed("tier4")).toBe(4);
    expect(killed("tier5")).toBe(5);
  });

  it("l'équipe quasi-optimale bat Yuji (6 boss → VICTORY)", () => {
    const res = evaluateDraft(ARCHETYPES.tier6);
    expect(res.enemiesKilled).toBe(BOSSES.length);
    expect(res.outcome).toBe("VICTORY");
  });

  it("la difficulté est strictement croissante selon la qualité du draft", () => {
    const scores = ["tier1", "tier2", "tier3", "tier4", "tier5", "tier6"].map(
      (n) => computeGlobalScore(ARCHETYPES[n as keyof typeof ARCHETYPES]),
    );
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThan(scores[i - 1]);
    }
  });
});
