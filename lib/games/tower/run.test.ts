import { describe, expect, it } from "vitest";
import type { Character } from "@/data/roster/characters";
import { JJK_ATTRIBUTES } from "@/lib/universes/jjk-attributes";
import { JJK_TOWER_CONFIG } from "./config";
import { buildTowerRoster } from "./floors";
import {
  buildCombatSetup,
  chooseStarter,
  recruit,
  recruitChoices,
  resolveFloor,
  runScore,
  skipRecruit,
  startRun,
  type TowerRunState,
} from "./run";
import { SQUAD_SIZE, TOWER_FLOORS, type CombatResult, type FloorPlan } from "./types";

/**
 * Tests de la machine d'état.
 *
 * L'invariant le plus important est celui du SACRIFICE : un personnage cédé
 * doit être perdu définitivement. S'il pouvait revenir au vivier, le choix
 * n'en serait plus un et toute la tension du recrutement tomberait.
 */

const ARCS = (
  JJK_ATTRIBUTES.find((a) => a.key === "appearanceArc")?.options ?? []
).map((o) => o.value);

const config = JJK_TOWER_CONFIG;

function character(id: string, value: number, arc = ARCS[0]): Character {
  return {
    id,
    name: id,
    title: "",
    tier: "3",
    battleValue: value,
    ratings: {},
    attributes: { appearanceArc: arc },
  };
}

const CAST = [
  character("start", 20),
  character("a", 22),
  character("b", 24),
  character("c", 26),
  character("d", 28),
  character("gros", 90),
];

const ROSTER: Record<string, Character> = Object.fromEntries(
  CAST.map((c) => [c.id, c]),
);

const TOWER = buildTowerRoster(CAST, ARCS, config);

function plan(overrides: Partial<FloorPlan> = {}): FloorPlan {
  return {
    floor: 3,
    strate: 0,
    kind: "combat",
    enemyIds: ["a"],
    recruitIds: ["a", "b", "c", "d"],
    ...overrides,
  };
}

/** Issue de combat minimale : victoire, escouade intacte. */
function won(state: TowerRunState, kills = 1): CombatResult {
  return {
    victory: true,
    ticks: 100,
    timeout: false,
    squad: state.squad.map((m, i) => ({
      uid: `s${i}`,
      id: m.characterId,
      hp: m.hp,
      maxHp: m.maxHp,
      alive: true,
    })),
    enemies: [],
    enemiesKilled: kills,
    events: [],
  };
}

/** Issue de combat : défaite, toute l'escouade à terre. */
function wiped(state: TowerRunState): CombatResult {
  return {
    ...won(state, 0),
    victory: false,
    squad: state.squad.map((m, i) => ({
      uid: `s${i}`,
      id: m.characterId,
      hp: 0,
      maxHp: m.maxHp,
      alive: false,
    })),
  };
}

function started(): TowerRunState {
  const out = chooseStarter(startRun(1), ROSTER.start, config);
  if (!out.ok) throw new Error("starter refusé");
  return out.state;
}

/**
 * Place la run à un étage donné, en état de recrutement.
 * L'étage courant est porté par l'ÉTAT (le plan ne décrit qu'un contenu), donc
 * les tests le posent explicitement plutôt que de le déduire du plan.
 */
function atRecruitFloor(state: TowerRunState, floor = 3): TowerRunState {
  return { ...state, floor, status: "recruit" };
}

/** Amène l'escouade à SQUAD_SIZE membres. */
function fullSquad(): TowerRunState {
  let state = started();
  for (const id of ["a", "b"]) {
    const out = recruit(atRecruitFloor(state), plan(), ROSTER[id], TOWER, config);
    if (!out.ok) throw new Error(`recrutement refusé : ${out.error}`);
    state = out.state;
  }
  return state;
}

describe("démarrage", () => {
  it("attend un starter avant toute chose", () => {
    const state = startRun(7);
    expect(state.status).toBe("starter");
    expect(state.squad).toHaveLength(0);
    expect(state.floor).toBe(1);
  });

  it("l'escouade démarre à UN personnage sur trois slots", () => {
    const state = started();
    expect(state.squad).toHaveLength(1);
    expect(state.status).toBe("combat");
    expect(state.squad[0].hp).toBe(state.squad[0].maxHp);
  });

  it("refuse un second starter", () => {
    const out = chooseStarter(started(), ROSTER.a, config);
    expect(out.ok).toBe(false);
    expect(out.ok === false && out.error).toBe("wrong-status");
  });
});

describe("progression", () => {
  it("monte d'un étage après une victoire sur un étage sans recrutement", () => {
    const state = { ...started(), floor: 4 };
    const next = resolveFloor(state, plan({ recruitIds: [] }), won(state));

    expect(next.status).toBe("combat");
    expect(next.floor).toBe(5);
  });

  it("s'arrête sur un nœud de recrutement au lieu de monter", () => {
    const state = { ...started(), floor: 3 };
    const next = resolveFloor(state, plan(), won(state));

    expect(next.status).toBe("recruit");
    expect(next.floor).toBe(3);
  });

  it("une défaite met fin à la run", () => {
    const state = started();
    const next = resolveFloor(state, plan(), wiped(state));

    expect(next.status).toBe("lost");
    expect(next.squad).toHaveLength(0);
  });

  it("franchir le dernier étage gagne la run", () => {
    const state = { ...started(), floor: TOWER_FLOORS };
    const next = resolveFloor(
      state,
      plan({ kind: "boss", recruitIds: [] }),
      won(state),
    );

    expect(next.status).toBe("won");
    expect(next.bossesKilled).toBe(1);
  });

  it("un personnage tombé quitte l'escouade et n'est jamais reproposé", () => {
    const state = { ...fullSquad(), floor: 4 };
    const result: CombatResult = {
      ...won(state),
      squad: state.squad.map((m, i) => ({
        uid: `s${i}`,
        id: m.characterId,
        hp: i === 0 ? 0 : m.hp,
        maxHp: m.maxHp,
        alive: i !== 0,
      })),
    };

    const next = resolveFloor(state, plan({ recruitIds: [] }), result);

    expect(next.squad).toHaveLength(SQUAD_SIZE - 1);
    expect(next.squad.some((m) => m.characterId === "start")).toBe(false);
    expect(next.seen).toContain("start");
  });

  it("les PV ne sont pas restaurés d'un étage à l'autre", () => {
    const state = { ...started(), floor: 4 };
    const result: CombatResult = {
      ...won(state),
      squad: [{ uid: "s0", id: "start", hp: 12, maxHp: 90, alive: true }],
    };

    const next = resolveFloor(state, plan({ recruitIds: [] }), result);
    expect(next.squad[0].hp).toBe(12);
  });
});

describe("recrutement", () => {
  it("remplit un slot libre sans rien coûter", () => {
    const state = atRecruitFloor(started());
    const out = recruit(state, plan(), ROSTER.a, TOWER, config);

    expect(out.ok).toBe(true);
    expect(out.ok && out.state.squad).toHaveLength(2);
    expect(out.ok && out.state.status).toBe("combat");
    expect(out.ok && out.state.floor).toBe(4);
  });

  it("le nouveau venu arrive à PV pleins", () => {
    const state = atRecruitFloor(started());
    const out = recruit(state, plan(), ROSTER.a, TOWER, config);

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const arrival = out.state.squad[1];
    expect(arrival.hp).toBe(arrival.maxHp);
  });

  it("passer son tour est toujours permis", () => {
    const state = atRecruitFloor(started());
    const out = skipRecruit(state);

    expect(out.ok).toBe(true);
    expect(out.ok && out.state.squad).toHaveLength(1);
    expect(out.ok && out.state.floor).toBe(4);
  });

  it("refuse un personnage au-dessus du plafond de la strate", () => {
    const state = atRecruitFloor(started());
    const out = recruit(
      state,
      plan({ recruitIds: ["gros"] }),
      ROSTER.gros,
      TOWER,
      config,
    );

    expect(out.ok).toBe(false);
    expect(out.ok === false && out.error).toBe("recruit-capped");
  });

  it("refuse un personnage qui n'était pas proposé", () => {
    const state = atRecruitFloor(started());
    const out = recruit(state, plan({ recruitIds: ["b"] }), ROSTER.a, TOWER, config);

    expect(out.ok).toBe(false);
    expect(out.ok === false && out.error).toBe("unknown-character");
  });
});

describe("sacrifice", () => {
  it("exige de désigner un slot quand l'escouade est pleine", () => {
    const state = atRecruitFloor(fullSquad());
    const out = recruit(state, plan(), ROSTER.c, TOWER, config);

    expect(out.ok).toBe(false);
    expect(out.ok === false && out.error).toBe("bad-slot");
  });

  it("refuse un slot hors bornes", () => {
    const state = atRecruitFloor(fullSquad());
    for (const slot of [-1, SQUAD_SIZE, 99, 1.5]) {
      const out = recruit(state, plan(), ROSTER.c, TOWER, config, slot);
      expect(out.ok === false && out.error).toBe("bad-slot");
    }
  });

  it("remplace le slot désigné, en gardant l'ordre de l'escouade", () => {
    const state = atRecruitFloor(fullSquad());
    const before = state.squad.map((m) => m.characterId);

    const out = recruit(state, plan(), ROSTER.c, TOWER, config, 1);
    expect(out.ok).toBe(true);
    if (!out.ok) return;

    expect(out.state.squad.map((m) => m.characterId)).toEqual([
      before[0],
      "c",
      before[2],
    ]);
  });

  it("le sacrifié est perdu DÉFINITIVEMENT et ne peut plus être reproposé", () => {
    const state = atRecruitFloor(fullSquad());
    const victim = state.squad[1].characterId;

    const out = recruit(state, plan(), ROSTER.c, TOWER, config, 1);
    expect(out.ok).toBe(true);
    if (!out.ok) return;

    expect(out.state.seen).toContain(victim);
    expect(out.state.squad.some((m) => m.characterId === victim)).toBe(false);

    const laterChoices = recruitChoices(
      { ...out.state, status: "recruit" },
      plan({ recruitIds: [victim, "d"] }),
    );
    expect(laterChoices).not.toContain(victim);
  });
});

describe("choix présentés", () => {
  it("en propose au plus trois, jamais un membre de l'escouade", () => {
    const state = atRecruitFloor(fullSquad());
    const choices = recruitChoices(
      state,
      plan({ recruitIds: ["start", "a", "b", "c", "d"] }),
    );

    expect(choices.length).toBeLessThanOrEqual(3);
    for (const id of state.squad.map((m) => m.characterId)) {
      expect(choices).not.toContain(id);
    }
  });

  it("rend une liste vide plutôt que de reproposer des visages connus", () => {
    const state = { ...atRecruitFloor(started()), seen: ["start", "a", "b"] };
    expect(recruitChoices(state, plan({ recruitIds: ["a", "b"] }))).toEqual([]);
  });
});

describe("montage du combat", () => {
  it("transmet les PV courants et l'ordre de l'escouade", () => {
    const state = fullSquad();
    const damaged = {
      ...state,
      squad: state.squad.map((m, i) => ({ ...m, hp: i === 0 ? 5 : m.hp })),
    };

    const setup = buildCombatSetup(damaged, plan({ enemyIds: ["a", "b"] }), ROSTER, config);

    expect(setup.squad).toHaveLength(SQUAD_SIZE);
    expect(setup.squadHp?.[0]).toBe(5);
    expect(setup.enemies).toHaveLength(2);
    expect(setup.squad[0].side).toBe("squad");
    expect(setup.enemies[0].side).toBe("enemy");
  });

  it("ignore un id inconnu du roster plutôt que de casser le combat", () => {
    const state = started();
    const setup = buildCombatSetup(
      state,
      plan({ enemyIds: ["fantome", "a"] }),
      ROSTER,
      config,
    );
    expect(setup.enemies).toHaveLength(1);
  });
});

describe("score", () => {
  it("monte avec l'étage, les victimes et les boss", () => {
    const base: TowerRunState = { ...started(), floor: 10, enemiesKilled: 12, bossesKilled: 2 };
    const worse: TowerRunState = { ...base, floor: 6, enemiesKilled: 5, bossesKilled: 1 };

    expect(runScore(base)).toBeGreaterThan(runScore(worse));
  });

  it("une tour bouclée compte pour le sommet, pas pour l'étage courant", () => {
    const won: TowerRunState = { ...started(), floor: 20, status: "won" };
    const stuck: TowerRunState = { ...started(), floor: 20, status: "lost" };

    expect(runScore(won)).toBeGreaterThanOrEqual(runScore(stuck));
  });

  it("les PV restants départagent deux runs identiques", () => {
    const healthy = started();
    const hurt: TowerRunState = {
      ...healthy,
      squad: healthy.squad.map((m) => ({ ...m, hp: 1 })),
    };

    expect(runScore(healthy)).toBeGreaterThan(runScore(hurt));
  });
});
