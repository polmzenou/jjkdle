import { describe, it, expect } from "vitest";
import {
  agentIdsOf,
  autoBalance,
  balanceViolations,
  buildColorKey,
  canJoinTeam,
  checkWin,
  countTeams,
  isTeamBalanced,
  resolveReveal,
} from "./logic";
import {
  CODENAMES_ASSASSINS,
  CODENAMES_NEUTRAL,
  CODENAMES_PURPLE,
  CODENAMES_RED,
  type TeamAssignment,
} from "./types";
import { codenamesLossExp, codenamesWinExp } from "@/lib/progress/exp-rewards";

/** RNG déterministe (séquence cyclique) pour les tirages testables. */
function seededRng(seq: number[]): () => number {
  let i = 0;
  return () => seq[i++ % seq.length];
}

describe("resolveReveal", () => {
  it("carte de la couleur de l'équipe active : +1 pour elle, le tour continue", () => {
    const out = resolveReveal("RED", "RED");
    expect(out).toEqual({ pointTo: "RED", endsTurn: false, assassin: false });
  });

  it("carte de la couleur adverse : +1 pour l'adversaire, fin de tour", () => {
    const out = resolveReveal("PURPLE", "RED");
    expect(out).toEqual({ pointTo: "PURPLE", endsTurn: true, assassin: false });
  });

  it("carte neutre : aucun point, fin de tour", () => {
    const out = resolveReveal("NEUTRAL", "RED");
    expect(out).toEqual({ pointTo: null, endsTurn: true, assassin: false });
  });

  it("assassin : défaite immédiate de l'équipe active", () => {
    const out = resolveReveal("ASSASSIN", "PURPLE");
    expect(out).toEqual({ pointTo: null, endsTurn: true, assassin: true });
  });
});

describe("buildColorKey", () => {
  it("répartit exactement 8 rouges / 8 violettes / 1 assassin / 19 neutres sur 36", () => {
    const grid = Array.from({ length: 36 }, (_, i) => `c${i}`);
    const key = buildColorKey(grid, seededRng([0.1, 0.5, 0.9, 0.3, 0.7]));
    const values = Object.values(key);
    expect(values).toHaveLength(36);
    const count = (color: string) => values.filter((v) => v === color).length;
    expect(count("RED")).toBe(CODENAMES_RED);
    expect(count("PURPLE")).toBe(CODENAMES_PURPLE);
    expect(count("ASSASSIN")).toBe(CODENAMES_ASSASSINS);
    expect(count("NEUTRAL")).toBe(CODENAMES_NEUTRAL);
  });

  it("assigne une couleur à chaque id de la grille", () => {
    const grid = Array.from({ length: 36 }, (_, i) => `x${i}`);
    const key = buildColorKey(grid);
    for (const id of grid) expect(key[id]).toBeDefined();
  });
});

describe("checkWin", () => {
  it("rouge gagne à 8", () => {
    expect(checkWin(8, 3)).toBe("RED");
  });
  it("violet gagne à 8", () => {
    expect(checkWin(2, 8)).toBe("PURPLE");
  });
  it("aucun gagnant sous 8", () => {
    expect(checkWin(7, 7)).toBeNull();
  });
});

describe("countTeams", () => {
  it("compte effectifs, non-assignés et maîtres-espions", () => {
    const players = ["a", "b", "c", "d"];
    const assignments: Record<string, TeamAssignment> = {
      a: { team: "RED", spymaster: true },
      b: { team: "RED", spymaster: false },
      c: { team: "PURPLE", spymaster: true },
      // d non assigné
    };
    const c = countTeams(assignments, players);
    expect(c.red).toBe(2);
    expect(c.purple).toBe(1);
    expect(c.unassigned).toBe(1);
    expect(c.redSpymaster).toBe(true);
    expect(c.purpleSpymaster).toBe(true);
  });
});

describe("balanceViolations / isTeamBalanced", () => {
  const balanced4: Record<string, TeamAssignment> = {
    a: { team: "RED", spymaster: true },
    b: { team: "RED", spymaster: false },
    c: { team: "PURPLE", spymaster: true },
    d: { team: "PURPLE", spymaster: false },
  };

  it("accepte un 2v2 complet et équilibré", () => {
    expect(balanceViolations(balanced4, ["a", "b", "c", "d"])).toEqual([]);
    expect(isTeamBalanced(balanced4, ["a", "b", "c", "d"])).toBe(true);
  });

  it("accepte un 3v3", () => {
    const players = ["a", "b", "c", "d", "e", "f"];
    const a: Record<string, TeamAssignment> = {
      a: { team: "RED", spymaster: true },
      b: { team: "RED", spymaster: false },
      c: { team: "RED", spymaster: false },
      d: { team: "PURPLE", spymaster: true },
      e: { team: "PURPLE", spymaster: false },
      f: { team: "PURPLE", spymaster: false },
    };
    expect(isTeamBalanced(a, players)).toBe(true);
  });

  it("accepte un 3v2 (5 joueurs, écart 1)", () => {
    const players = ["a", "b", "c", "d", "e"];
    const a: Record<string, TeamAssignment> = {
      a: { team: "RED", spymaster: true },
      b: { team: "RED", spymaster: false },
      c: { team: "RED", spymaster: false },
      d: { team: "PURPLE", spymaster: true },
      e: { team: "PURPLE", spymaster: false },
    };
    expect(isTeamBalanced(a, players)).toBe(true);
  });

  it("refuse un 4v2 (écart > 1)", () => {
    const players = ["a", "b", "c", "d", "e", "f"];
    const a: Record<string, TeamAssignment> = {
      a: { team: "RED", spymaster: true },
      b: { team: "RED", spymaster: false },
      c: { team: "RED", spymaster: false },
      d: { team: "RED", spymaster: false },
      e: { team: "PURPLE", spymaster: true },
      f: { team: "PURPLE", spymaster: false },
    };
    expect(isTeamBalanced(a, players)).toBe(false);
  });

  it("refuse un maître-espion manquant", () => {
    const players = ["a", "b", "c", "d"];
    const a: Record<string, TeamAssignment> = {
      a: { team: "RED", spymaster: false },
      b: { team: "RED", spymaster: false },
      c: { team: "PURPLE", spymaster: true },
      d: { team: "PURPLE", spymaster: false },
    };
    expect(isTeamBalanced(a, players)).toBe(false);
  });

  it("refuse une équipe sans agent (1 seul joueur maître-espion)", () => {
    const players = ["a", "b", "c"];
    const a: Record<string, TeamAssignment> = {
      a: { team: "RED", spymaster: true },
      b: { team: "PURPLE", spymaster: true },
      c: { team: "PURPLE", spymaster: false },
    };
    // rouge n'a que le maître-espion, pas d'agent
    expect(isTeamBalanced(a, players)).toBe(false);
  });

  it("refuse des joueurs non assignés", () => {
    const players = ["a", "b", "c", "d", "e"];
    expect(isTeamBalanced(balanced4, players)).toBe(false); // e non assigné
  });
});

describe("canJoinTeam", () => {
  it("interdit de créer un 3v1 quand un 2v2 est possible", () => {
    const players = ["a", "b", "c", "d"];
    const assignments: Record<string, TeamAssignment> = {
      a: { team: "RED", spymaster: false },
      b: { team: "RED", spymaster: false },
      c: { team: "PURPLE", spymaster: false },
      // d libre veut rejoindre RED → 3v1, interdit
    };
    expect(canJoinTeam(assignments, players, "d", "RED")).toBe(false);
    expect(canJoinTeam(assignments, players, "d", "PURPLE")).toBe(true);
  });
});

describe("autoBalance", () => {
  it("répartit en équipes équilibrées avec 1 maître-espion par équipe", () => {
    const players = ["a", "b", "c", "d", "e", "f"];
    const a = autoBalance(players, seededRng([0.1, 0.4, 0.2, 0.8, 0.5]));
    const c = countTeams(a, players);
    expect(c.unassigned).toBe(0);
    expect(Math.abs(c.red - c.purple)).toBeLessThanOrEqual(1);
    expect(c.redSpymaster).toBe(true);
    expect(c.purpleSpymaster).toBe(true);
    expect(isTeamBalanced(a, players)).toBe(true);
  });

  it("gère un nombre impair (5 → 3v2)", () => {
    const players = ["a", "b", "c", "d", "e"];
    const a = autoBalance(players);
    const c = countTeams(a, players);
    expect(c.red + c.purple).toBe(5);
    expect(Math.abs(c.red - c.purple)).toBe(1);
    expect(isTeamBalanced(a, players)).toBe(true);
  });
});

describe("agentIdsOf", () => {
  it("exclut le maître-espion de la liste des agents", () => {
    const teams = { a: "RED", b: "RED", c: "PURPLE", d: "PURPLE" } as const;
    expect(agentIdsOf(teams as never, "RED", "a", "c").sort()).toEqual(["b"]);
    expect(agentIdsOf(teams as never, "PURPLE", "a", "c").sort()).toEqual(["d"]);
  });
});

describe("barème XP Codenames", () => {
  it("victoire vaut 150", () => {
    expect(codenamesWinExp()).toBe(150);
  });
  it("défaite vaut 50", () => {
    expect(codenamesLossExp()).toBe(50);
  });
});
