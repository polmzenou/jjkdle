import { describe, expect, it } from "vitest";
import {
  TOWER_BEST_ORDER_SQL,
  compareTowerRuns,
  parseTowerScope,
  type TowerRankable,
} from "./ranking";

/**
 * Ces tests existent à cause d'un bug constaté en production : un joueur monté
 * à l'étage 12 à son deuxième essai voyait « 7 » au classement — l'étage de son
 * premier essai. Le tri comparait le nombre d'essais AVANT la hauteur atteinte,
 * si bien qu'un essai précoce et raté battait un essai tardif et abouti.
 */

let clock = 0;
function run(partial: Partial<TowerRankable> = {}): TowerRankable {
  clock += 1000;
  return {
    cleared: false,
    attempt: 1,
    floor: 1,
    score: 0,
    createdAt: new Date(clock),
    ...partial,
  };
}

/** Le premier du classement une fois trié. */
function best(...runs: TowerRankable[]): TowerRankable {
  return [...runs].sort(compareTowerRuns)[0];
}

describe("runs inachevées", () => {
  it("RÉGRESSION : l'étage 12 du 2e essai bat l'étage 7 du 1er", () => {
    const early = run({ attempt: 1, floor: 7, score: 700 });
    const far = run({ attempt: 2, floor: 12, score: 1200 });

    expect(best(early, far)).toBe(far);
    expect(best(far, early)).toBe(far);
  });

  it("classe sur l'étage atteint, jamais sur le nombre d'essais", () => {
    const persistent = run({ attempt: 9, floor: 19 });
    const lucky = run({ attempt: 1, floor: 3 });

    expect(best(lucky, persistent)).toBe(persistent);
  });

  it("départage deux étages égaux par le score", () => {
    const rich = run({ floor: 10, score: 1500 });
    const poor = run({ floor: 10, score: 900 });

    expect(best(poor, rich)).toBe(rich);
  });
});

describe("runs bouclées", () => {
  it("le moins d'essais l'emporte — c'est là que la métrique a un sens", () => {
    const first = run({ cleared: true, attempt: 1, floor: 20, score: 3000 });
    const tenth = run({ cleared: true, attempt: 10, floor: 20, score: 5000 });

    expect(best(tenth, first)).toBe(first);
  });

  it("à nombre d'essais égal, le meilleur score", () => {
    const rich = run({ cleared: true, attempt: 3, floor: 20, score: 5000 });
    const poor = run({ cleared: true, attempt: 3, floor: 20, score: 4000 });

    expect(best(poor, rich)).toBe(rich);
  });
});

describe("entre bouclée et inachevée", () => {
  it("boucler la tour l'emporte toujours, même au vingtième essai", () => {
    const cleared = run({ cleared: true, attempt: 20, floor: 20, score: 100 });
    const almost = run({ cleared: false, attempt: 1, floor: 19, score: 9999 });

    expect(best(almost, cleared)).toBe(cleared);
  });
});

describe("stabilité", () => {
  it("à égalité parfaite, le plus ancien passe devant", () => {
    const older = run({ floor: 5, score: 500 });
    const newer = run({ floor: 5, score: 500 });

    expect(best(newer, older)).toBe(older);
  });

  it("le tri est total : aucun couple ne se déclare mutuellement meilleur", () => {
    const runs = [
      run({ cleared: true, attempt: 1, floor: 20, score: 3000 }),
      run({ cleared: true, attempt: 4, floor: 20, score: 3200 }),
      run({ floor: 19, score: 2000 }),
      run({ floor: 19, score: 2500 }),
      run({ attempt: 8, floor: 3, score: 300 }),
    ];

    for (const a of runs) {
      for (const b of runs) {
        if (a === b) continue;
        expect(Math.sign(compareTowerRuns(a, b))).toBe(
          -Math.sign(compareTowerRuns(b, a)),
        );
      }
    }
  });
});

describe("miroir SQL", () => {
  /**
   * On ne peut pas exécuter le SQL ici, mais on peut vérifier qu'il porte bien
   * la clause qui CORRIGE le bug : sans le `CASE`, le nombre d'essais
   * départagerait aussi les runs inachevées.
   */
  it("neutralise le nombre d'essais pour les runs inachevées", () => {
    const sql = TOWER_BEST_ORDER_SQL.replace(/\s+/g, " ");
    expect(sql).toContain('CASE WHEN "cleared" THEN "attempt" ELSE 0 END ASC');
  });

  it("ordonne les critères comme le comparateur", () => {
    const sql = TOWER_BEST_ORDER_SQL.replace(/\s+/g, " ");
    const order = ["cleared", "attempt", "floor", "score", "createdAt"];
    const positions = order.map((key) => sql.indexOf(`"${key}"`));

    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });
});


describe("portée du classement", () => {
  it("affiche la tour DU JOUR par défaut", () => {
    // La portée par défaut n'est pas un détail : le nombre d'essais ne se
    // compare qu'entre joueurs ayant affronté la même tour.
    expect(parseTowerScope(undefined)).toBe("today");
    expect(parseTowerScope("")).toBe("today");
  });

  it("accepte le panthéon quand il est demandé explicitement", () => {
    expect(parseTowerScope("all-time")).toBe("all-time");
  });

  it("ignore une portée inconnue plutôt que de la propager", () => {
    for (const value of ["weekly", "monthly", 42, null, {}]) {
      expect(parseTowerScope(value)).toBe("today");
    }
  });
});
