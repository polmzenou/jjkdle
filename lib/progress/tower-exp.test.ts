import { describe, expect, it } from "vitest";
import { TOWER_FLOORS } from "@/lib/games/tower/types";
import {
  TOWER_RANDOM_RATIO,
  towerExp,
  towerExpNote,
  towerRunExp,
} from "./exp-rewards";

/**
 * L'EXP de la Tour est payée au PLUS-HAUT-ATTEINT du jour : les essais étant
 * illimités, la payer par essai en ferait une ferme à XP.
 *
 * La contrepartie est qu'une run peut légitimement ne rien rapporter, et c'est
 * précisément ce qui a été signalé comme un bug. Ces tests fixent les deux
 * garde-fous qui rendent la règle acceptable : chaque étage doit valoir plus
 * que le précédent, et le joueur doit toujours savoir pourquoi.
 */

describe("barème par étage", () => {
  it("est STRICTEMENT croissant — sinon monter ne paie pas", () => {
    // Le vrai défaut de la première version : cinq paliers grossiers, donc
    // passer de l'étage 10 à l'étage 14 rapportait exactement zéro.
    for (let floor = 1; floor <= TOWER_FLOORS; floor += 1) {
      expect(towerExp(floor)).toBeGreaterThan(towerExp(floor - 1));
    }
  });

  it("paie un palier de plus d'autant mieux qu'on est haut", () => {
    const low = towerExp(3) - towerExp(2);
    const high = towerExp(19) - towerExp(18);
    expect(high).toBeGreaterThan(low * 5);
  });

  it("tolère un étage aberrant sans produire de NaN", () => {
    for (const floor of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const exp = towerExp(floor as number);
      expect(Number.isFinite(exp)).toBe(true);
      expect(exp).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("paiement au plus-haut-atteint", () => {
  it("paie la progression, pas la répétition", () => {
    // Rejouer et atteindre le MÊME étage ne rapporte rien : c'est le garde-fou.
    expect(
      towerRunExp({ floorReached: 12, bestFloorBefore: 12, daily: true }),
    ).toBe(0);
    // Mais aller ne serait-ce qu'un étage plus haut, si.
    expect(
      towerRunExp({ floorReached: 13, bestFloorBefore: 12, daily: true }),
    ).toBeGreaterThan(0);
  });

  it("RÉGRESSION : passer de l'étage 10 à l'étage 14 rapporte quelque chose", () => {
    expect(
      towerRunExp({ floorReached: 14, bestFloorBefore: 10, daily: true }),
    ).toBeGreaterThan(0);
  });

  it("ne paie jamais deux fois la même hauteur, même en redescendant", () => {
    expect(
      towerRunExp({ floorReached: 8, bestFloorBefore: 12, daily: true }),
    ).toBe(0);
  });

  it("cumule exactement la valeur du sommet sur toute une journée", () => {
    // Trois essais successifs : 7, puis 12, puis 20. Le total doit valoir
    // l'étage 20, ni plus (farm) ni moins (progression perdue).
    const total =
      towerRunExp({ floorReached: 7, bestFloorBefore: 0, daily: true }) +
      towerRunExp({ floorReached: 12, bestFloorBefore: 7, daily: true }) +
      towerRunExp({ floorReached: 20, bestFloorBefore: 12, daily: true });

    expect(total).toBe(towerExp(20));
  });

  it("une tour libre n'a pas de mémoire, mais un barème réduit", () => {
    const daily = towerRunExp({ floorReached: 12, bestFloorBefore: 0, daily: true });
    const free = towerRunExp({ floorReached: 12, bestFloorBefore: 12, daily: false });

    expect(free).toBe(Math.round(daily * TOWER_RANDOM_RATIO));
    expect(free).toBeGreaterThan(0);
  });
});

describe("explication donnée au joueur", () => {
  it("dit POURQUOI une run n'a rien rapporté, en nommant l'étage à dépasser", () => {
    const note = towerExpNote({
      gained: 0,
      floorReached: 12,
      bestFloorBefore: 12,
      daily: true,
    });

    expect(note).toContain("12");
    expect(note.length).toBeGreaterThan(20);
  });

  it("annonce un record quand il y en a un", () => {
    const note = towerExpNote({
      gained: 150,
      floorReached: 12,
      bestFloorBefore: 7,
      daily: true,
    });

    expect(note).toContain("12");
    expect(note).toContain("7");
  });

  it("signale qu'une tour libre est hors classement", () => {
    for (const gained of [0, 200]) {
      expect(
        towerExpNote({ gained, floorReached: 9, bestFloorBefore: 0, daily: false }),
      ).toMatch(/libre/i);
    }
  });

  it("ne renvoie jamais de phrase vide", () => {
    for (const daily of [true, false]) {
      for (const gained of [0, 500]) {
        const note = towerExpNote({
          gained,
          floorReached: 5,
          bestFloorBefore: 0,
          daily,
        });
        expect(note.trim()).not.toBe("");
      }
    }
  });
});
