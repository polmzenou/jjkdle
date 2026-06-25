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
 * Simulation d'équilibrage : on construit des drafts types et on vérifie la
 * courbe de difficulté Panda → Yuji. Ces tests verrouillent la calibration des
 * seuils ; si un seuil ou un coût bouge, ils signalent la régression.
 */

// Archetypes (sélection = { categorieId: persoId }).
const ARCHETYPES: Record<string, DraftSelection> = {
  // Le pire draft jouable : 8 Tier C bon marché, tous MAL placés.
  worst: {
    "occult-energy": "mai",
    "physical-strength": "manami",
    speed: "shoko",
    "battle-iq": "nitta",
    "innate-technique": "miwa",
    "domain-expansion": "charles",
    "black-flash": "yorozu",
    "cursed-tools": "utahime",
  },
  // Cheap mais BIEN placé (chaque Tier C dans sa catégorie).
  cheapMatched: {
    "occult-energy": "miwa",
    "physical-strength": "mai",
    speed: "utahime",
    "battle-iq": "shoko",
    "innate-technique": "charles",
    "domain-expansion": "manami",
    "black-flash": "nitta",
    "cursed-tools": "yorozu",
  },
  // Équilibré : 2 A + 3 B + 3 C bien placés.
  balanced: {
    "occult-energy": "choso",
    "physical-strength": "maki",
    speed: "divine-dog",
    "battle-iq": "kenjaku",
    "innate-technique": "dagon",
    "domain-expansion": "manami",
    "black-flash": "nitta",
    "cursed-tools": "yorozu",
  },
  // Équilibré renforcé (atteint le palier Sukuna).
  strong: {
    "occult-energy": "choso",
    "physical-strength": "maki",
    speed: "divine-dog",
    "battle-iq": "kenjaku",
    "innate-technique": "dagon",
    "domain-expansion": "angel",
    "black-flash": "nitta",
    "cursed-tools": "yorozu",
  },
  // Optimisé : persos chers bien placés (bat Gojo, meurt sur Yuji).
  optimized: {
    "occult-energy": "mei-mei",
    "physical-strength": "maki",
    speed: "utahime",
    "battle-iq": "mechamaru",
    "innate-technique": "dagon",
    "domain-expansion": "angel",
    "black-flash": "toji",
    "cursed-tools": "gakuganji",
  },
  // Parfait : optimum sous budget 100 (seul à battre Yuji).
  perfect: {
    "occult-energy": "mei-mei",
    "physical-strength": "maki",
    speed: "utahime",
    "battle-iq": "mechamaru",
    "innate-technique": "dagon",
    "domain-expansion": "angel",
    "black-flash": "toji",
    "cursed-tools": "rika",
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

  it("Panda tombe avec n'importe quel draft (même le pire)", () => {
    expect(killed("worst")).toBe(1);
  });

  it("un draft cheap bien placé bat Mahito (2 boss)", () => {
    expect(killed("cheapMatched")).toBe(2);
  });

  it("un draft équilibré atteint Geto (3 boss)", () => {
    expect(killed("balanced")).toBe(3);
  });

  it("un draft équilibré renforcé atteint Sukuna (4 boss)", () => {
    expect(killed("strong")).toBe(4);
  });

  it("un draft optimisé bat Gojo mais meurt sur Yuji (5 boss)", () => {
    expect(killed("optimized")).toBe(5);
  });

  it("seul un draft parfait bat Yuji (6 boss → VICTORY)", () => {
    const res = evaluateDraft(ARCHETYPES.perfect);
    expect(res.enemiesKilled).toBe(BOSSES.length);
    expect(res.outcome).toBe("VICTORY");
  });

  it("la difficulté est strictement croissante selon la qualité du draft", () => {
    const scores = [
      "worst",
      "cheapMatched",
      "balanced",
      "strong",
      "optimized",
      "perfect",
    ].map((n) => computeGlobalScore(ARCHETYPES[n as keyof typeof ARCHETYPES]));
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThan(scores[i - 1]);
    }
  });
});
