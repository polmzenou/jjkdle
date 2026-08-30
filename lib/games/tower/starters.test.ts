import { describe, expect, it } from "vitest";
import { ROSTER } from "@/data/roster/characters";
import { battleValueOf } from "@/lib/games/battle/battleValues";
import { dailyStarters, isDailyStarter, starterPool } from "./starters";
import { STARTER_CHOICES, STARTER_MAX_VALUE, STARTER_MIN_VALUE } from "./types";

/**
 * Les starters portent une promesse explicite du cahier des charges : « jamais
 * des personnages ultra puissants ». Ces tests la vérifient sur le ROSTER RÉEL,
 * pas sur des données de laboratoire — c'est la seule façon d'attraper une
 * dérive après un rééquilibrage de `battleValue` en admin.
 */

const DAYS = [
  "2026-08-30",
  "2026-08-31",
  "2026-09-01",
  "2026-12-25",
  "2027-01-01",
];

describe("vivier", () => {
  it("ne retient que des personnages faibles à moyens", () => {
    for (const c of starterPool(ROSTER)) {
      const value = battleValueOf(c);
      expect(value).toBeGreaterThanOrEqual(STARTER_MIN_VALUE);
      expect(value).toBeLessThanOrEqual(STARTER_MAX_VALUE);
    }
  });

  it("laisse les têtes d'affiche hors de portée au départ", () => {
    const ids = starterPool(ROSTER).map((c) => c.id);
    for (const star of ["gojo", "sukuna", "yuji-modulo", "mahoraga", "kenjaku"]) {
      expect(ids).not.toContain(star);
    }
  });

  it("est ordonné de façon STABLE (dailyIndexes indexe une position)", () => {
    const first = starterPool(ROSTER).map((c) => c.id);
    const shuffled = [...ROSTER].reverse();
    expect(starterPool(shuffled).map((c) => c.id)).toEqual(first);
  });

  it("le vivier réel est assez fourni pour servir un choix", () => {
    expect(starterPool(ROSTER).length).toBeGreaterThanOrEqual(STARTER_CHOICES);
  });
});

describe("rotation quotidienne", () => {
  it("propose trois personnages distincts", () => {
    for (const day of DAYS) {
      const starters = dailyStarters(day, ROSTER);
      expect(starters).toHaveLength(STARTER_CHOICES);
      expect(new Set(starters.map((c) => c.id)).size).toBe(STARTER_CHOICES);
    }
  });

  it("sert exactement la même chose à tout le monde le même jour", () => {
    for (const day of DAYS) {
      expect(dailyStarters(day, ROSTER)).toEqual(dailyStarters(day, ROSTER));
    }
  });

  it("change d'un jour à l'autre", () => {
    const signatures = DAYS.map((d) =>
      dailyStarters(d, ROSTER)
        .map((c) => c.id)
        .join(","),
    );
    expect(new Set(signatures).size).toBe(DAYS.length);
  });

  it("ne sort jamais un personnage hors bornes, quel que soit le jour", () => {
    for (let i = 0; i < 400; i += 1) {
      const day = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
      for (const c of dailyStarters(day, ROSTER)) {
        expect(battleValueOf(c)).toBeLessThanOrEqual(STARTER_MAX_VALUE);
      }
    }
  });

  it("rend une liste vide plutôt que de compléter avec un personnage trop fort", () => {
    expect(dailyStarters("2026-08-30", [])).toEqual([]);
  });
});

describe("garde serveur", () => {
  it("accepte un starter du jour et refuse tout le reste", () => {
    const day = "2026-08-30";
    const chosen = dailyStarters(day, ROSTER)[0];

    expect(isDailyStarter(day, ROSTER, chosen.id)).toBe(true);
    expect(isDailyStarter(day, ROSTER, "gojo")).toBe(false);
    expect(isDailyStarter(day, ROSTER, "inconnu")).toBe(false);
  });

  it("refuse le starter de la veille", () => {
    const chosen = dailyStarters("2026-08-30", ROSTER).map((c) => c.id);
    const next = dailyStarters("2026-08-31", ROSTER).map((c) => c.id);
    const gone = chosen.find((id) => !next.includes(id));

    expect(gone).toBeDefined();
    expect(isDailyStarter("2026-08-31", ROSTER, gone!)).toBe(false);
  });
});
