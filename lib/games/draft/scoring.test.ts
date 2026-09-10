import { describe, it, expect } from "vitest";
import {
  BOSSES,
  contribution,
  resolveCombat,
  validateSelection,
} from "./scoring";
import { DRAFT_ROSTER_BY_ID } from "./roster";
import { JJK_CATEGORIES } from "./categories.fixture";
import { defaultBossesFor } from "./bosses";
import type { DraftCharacter } from "./types";

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

describe("validateSelection", () => {
  /** Roster de test : un perso par catégorie, tous bon marché. */
  const roster: Record<string, DraftCharacter> = Object.fromEntries(
    JJK_CATEGORIES.map((cat, i) => [
      `c${i}`,
      {
        id: `c${i}`,
        name: `C${i}`,
        excellenceCategory: cat.id,
        tier: "C" as const,
        cost: 5,
        statValue: 8,
      },
    ]),
  );
  const full = Object.fromEntries(
    JJK_CATEGORIES.map((cat, i) => [cat.id, `c${i}`]),
  );

  it("accepte une sélection complète sous budget", () => {
    const res = validateSelection(full, JJK_CATEGORIES, roster);
    expect(res.ok).toBe(true);
  });

  it("refuse deux cartes portant la même PERSONNE", () => {
    // Cas du roster importé : deux cartes distinctes (une par catégorie) qui
    // désignent le même personnage. Sans le contrôle sur `sourceId`, l'équipe
    // passerait — c'est exactement ce que le tirage interdit côté client.
    const withClone: Record<string, DraftCharacter> = {
      ...roster,
      c0: { ...roster.c0, sourceId: "gojo" },
      c1: { ...roster.c1, sourceId: "gojo" },
    };
    const res = validateSelection(full, JJK_CATEGORIES, withClone);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/double/i);
  });

  it("refuse deux fois la même carte", () => {
    const duped = { ...full, [JJK_CATEGORIES[1].id]: "c0" };
    expect(validateSelection(duped, JJK_CATEGORIES, roster).ok).toBe(false);
  });
});

describe("boss par univers", () => {
  it("chaque univers a 6 boss aux PV strictement croissants", () => {
    for (const slug of ["jjk", "csm", "aot", "kny", "tg", "bleach"]) {
      const bosses = defaultBossesFor(slug);
      expect(bosses, slug).toHaveLength(6);
      for (let i = 1; i < bosses.length; i++) {
        expect(bosses[i].threshold, `${slug} ${bosses[i].id}`).toBeGreaterThan(
          bosses[i - 1].threshold,
        );
      }
    }
  });

  it("résout le combat contre les boss de l'univers, pas ceux de JJK", () => {
    const bosses = defaultBossesFor("bleach");
    const res = resolveCombat(bosses[1].threshold, bosses);
    expect(res.enemiesKilled).toBe(2);
    expect(res.duels[0].boss.id).toBe("ulquiorra-cifer");
    // Dernier boss de Bleach : Ichibe, choisi comme mur final.
    expect(bosses.at(-1)?.id).toBe("ichibe-hyosube");
  });
});
