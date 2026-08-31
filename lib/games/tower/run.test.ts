import { describe, expect, it } from "vitest";
import type { Character } from "@/data/roster/characters";
import { JJK_ATTRIBUTES } from "@/lib/universes/jjk-attributes";
import { JJK_TOWER_CONFIG } from "./config";
import { buildTowerRoster } from "./floors";
import {
  buildCombatSetup,
  buyHeal,
  buyItem,
  chooseNode,
  chooseStarter,
  eventChoiceOf,
  leaveMerchant,
  recruit,
  recruitChoices,
  resolveFloor,
  runScore,
  skipRecruit,
  normalizeRunState,
  resolveEvent,
  startRun,
  takeRest,
  takeReward,
  REST_HEAL_PCT,
  type TowerRunState,
} from "./run";
import type { TowerEvent } from "./events";
import type { TowerItem } from "./items";
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
    eventIndex: 0,
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
    energyByTick: [],
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

  it("l'escouade démarre à UN personnage sur trois slots, face à la carte", () => {
    const state = started();
    expect(state.squad).toHaveLength(1);
    expect(state.status).toBe("map");
    expect(state.squad[0].hp).toBe(state.squad[0].maxHp);
  });

  it("refuse un second starter", () => {
    const out = chooseStarter(started(), ROSTER.a, config);
    expect(out.ok).toBe(false);
    expect(out.ok === false && out.error).toBe("wrong-status");
  });
});

describe("progression", () => {
  it("ouvre un choix de récompense après toute victoire", () => {
    const state = { ...started(), floor: 4 };
    const next = resolveFloor(state, plan({ recruitIds: [] }), won(state));

    expect(next.status).toBe("reward");
    expect(next.floor).toBe(4);
  });

  it("remonte à la carte une fois la récompense prise", () => {
    const state = { ...started(), floor: 4, status: "reward" as const };
    const out = takeReward(state, plan({ recruitIds: [] }), {
      kind: "fragments",
      amount: 10,
    });

    expect(out.ok).toBe(true);
    expect(out.ok && out.state.floor).toBe(5);
    expect(out.ok && out.state.status).toBe("map");
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
    expect(out.ok && out.state.floor).toBe(4);
    expect(out.ok && out.state.status).toBe("map");
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


// ---------------------------------------------------------------------------
// Objets, recompense et marchand (phase 2)
// ---------------------------------------------------------------------------

function item(
  id: string,
  overrides: Partial<TowerItem> = {},
): TowerItem {
  return {
    id,
    slug: id,
    name: id,
    description: "",
    rarity: "COMMON",
    effects: [{ kind: "FRAPPE_PCT", value: 10 }],
    enabled: true,
    position: 0,
    ...overrides,
  };
}

describe("récompense", () => {
  const rewarding = (): TowerRunState => ({
    ...started(),
    floor: 4,
    status: "reward",
  });

  it("ajoute l'objet choisi à l'inventaire", () => {
    const out = takeReward(rewarding(), plan({ recruitIds: [] }), {
      kind: "item",
      item: item("relique"),
    });

    expect(out.ok && out.state.items).toEqual(["relique"]);
  });

  it("refuse un objet déjà possédé", () => {
    const state = { ...rewarding(), items: ["relique"] };
    const out = takeReward(state, plan({ recruitIds: [] }), {
      kind: "item",
      item: item("relique"),
    });

    expect(out.ok).toBe(false);
    expect(out.ok === false && out.error).toBe("already-owned");
  });

  it("crédite les fragments", () => {
    const out = takeReward(rewarding(), plan({ recruitIds: [] }), {
      kind: "fragments",
      amount: 30,
    });
    expect(out.ok && out.state.fragments).toBe(30);
  });

  it("soigne l'escouade sans dépasser les PV max", () => {
    const hurt: TowerRunState = {
      ...rewarding(),
      squad: [{ characterId: "start", hp: 10, maxHp: 100 }],
    };

    const out = takeReward(hurt, plan({ recruitIds: [] }), { kind: "heal", pct: 35 });
    expect(out.ok && out.state.squad[0].hp).toBe(45);

    const full: TowerRunState = {
      ...rewarding(),
      squad: [{ characterId: "start", hp: 95, maxHp: 100 }],
    };
    const capped = takeReward(full, plan({ recruitIds: [] }), { kind: "heal", pct: 35 });
    expect(capped.ok && capped.state.squad[0].hp).toBe(100);
  });

  it("refuse une récompense hors de l'état prévu", () => {
    const out = takeReward(started(), plan(), { kind: "fragments", amount: 10 });
    expect(out.ok === false && out.error).toBe("wrong-status");
  });
});

describe("marchand", () => {
  const shopping = (fragments: number): TowerRunState => ({
    ...started(),
    floor: 4,
    status: "merchant",
    fragments,
  });

  it("achète un objet et débite les fragments", () => {
    const out = buyItem(shopping(100), "relique", 40);

    expect(out.ok).toBe(true);
    expect(out.ok && out.state.fragments).toBe(60);
    expect(out.ok && out.state.items).toEqual(["relique"]);
    // On reste à l'étal : rien n'oblige à n'acheter qu'une chose.
    expect(out.ok && out.state.status).toBe("merchant");
  });

  it("refuse un achat trop cher, sans rien débiter", () => {
    const out = buyItem(shopping(20), "relique", 40);
    expect(out.ok === false && out.error).toBe("too-expensive");
  });

  it("refuse d'acheter deux fois le même objet", () => {
    const state = { ...shopping(200), items: ["relique"] };
    const out = buyItem(state, "relique", 40);
    expect(out.ok === false && out.error).toBe("already-owned");
  });

  it("vend un soin d'escouade", () => {
    const state: TowerRunState = {
      ...shopping(100),
      squad: [{ characterId: "start", hp: 10, maxHp: 100 }],
    };
    const out = buyHeal(state, 50, 40);

    expect(out.ok && out.state.fragments).toBe(50);
    expect(out.ok && out.state.squad[0].hp).toBe(50);
  });

  it("quitter l'étal fait monter d'un étage", () => {
    const out = leaveMerchant(shopping(0));
    expect(out.ok && out.state.floor).toBe(5);
    expect(out.ok && out.state.status).toBe("map");
  });
});

describe("effets d'objets en combat", () => {
  const catalog: Record<string, TowerItem> = {
    frappe: item("frappe", { effects: [{ kind: "FRAPPE_PCT", value: 50 }] }),
    horde: item("horde", { effects: [{ kind: "ENNEMI_SUPP", value: 1 }] }),
    rika: item("rika", { effects: [{ kind: "REVIVE_UNE_FOIS", value: 30 }] }),
    bourse: item("bourse", { effects: [{ kind: "FRAGMENTS_PCT", value: 100 }] }),
  };

  it("transmet les modificateurs de l'inventaire au moteur", () => {
    const bare = buildCombatSetup(started(), plan(), ROSTER, config, catalog);
    const armed = buildCombatSetup(
      { ...started(), items: ["frappe"] },
      plan(),
      ROSTER,
      config,
      catalog,
    );

    expect(bare.modifiers?.FRAPPE_PCT).toBe(0);
    expect(armed.modifiers?.FRAPPE_PCT).toBe(50);
  });

  it("ENNEMI_SUPP ajoute un adversaire sans toucher à la graine de l'étage", () => {
    const setup = buildCombatSetup(
      { ...started(), items: ["horde"] },
      plan({ enemyIds: ["a"] }),
      ROSTER,
      config,
      catalog,
    );
    expect(setup.enemies).toHaveLength(2);
  });

  it("le Cœur de Rika relève le premier tombé, une seule fois", () => {
    const squad = [
      { characterId: "start", hp: 50, maxHp: 200 },
      { characterId: "a", hp: 50, maxHp: 200 },
    ];
    const state: TowerRunState = { ...started(), floor: 4, squad, items: ["rika"] };

    const oneDown: CombatResult = {
      ...won(state),
      squad: [
        { uid: "s0", id: "start", hp: 0, maxHp: 200, alive: false },
        { uid: "s1", id: "a", hp: 40, maxHp: 200, alive: true },
      ],
    };

    const next = resolveFloor(state, plan({ recruitIds: [] }), oneDown, catalog);
    expect(next.squad).toHaveLength(2);
    expect(next.revived).toBe(true);
    expect(next.squad[0].hp).toBe(60); // 30 % de 200

    // La seconde fois, plus de sursis.
    const again = resolveFloor(
      { ...next, floor: 4 },
      plan({ recruitIds: [] }),
      oneDown,
      catalog,
    );
    expect(again.squad).toHaveLength(1);
  });

  it("FRAGMENTS_PCT augmente le butin de l'étage", () => {
    const state = { ...started(), floor: 4 };
    const bare = resolveFloor(state, plan({ recruitIds: [] }), won(state, 4), catalog);
    const rich = resolveFloor(
      { ...state, items: ["bourse"] },
      plan({ recruitIds: [] }),
      won(state, 4),
      catalog,
    );

    expect(rich.fragments).toBeGreaterThan(bare.fragments);
  });
});


// ---------------------------------------------------------------------------
// Carte, repos et evenements (phase 3)
// ---------------------------------------------------------------------------

describe("carte à embranchements", () => {
  const onMap = (floor = 4): TowerRunState => ({
    ...started(),
    floor,
    status: "map",
  });

  const branches = [
    plan({ kind: "combat" }),
    plan({ kind: "rest", enemyIds: [], recruitIds: [] }),
  ];

  it("mémorise l'index emprunté dans le chemin", () => {
    const out = chooseNode(onMap(), branches, 1);

    expect(out.ok).toBe(true);
    expect(out.ok && out.state.path[3]).toBe(1);
  });

  it("ouvre l'écran correspondant au type du nœud choisi", () => {
    const cases: Array<[Parameters<typeof plan>[0], string]> = [
      [{ kind: "combat" }, "combat"],
      [{ kind: "elite" }, "combat"],
      [{ kind: "boss" }, "combat"],
      [{ kind: "recruit" }, "recruit"],
      [{ kind: "merchant" }, "merchant"],
      [{ kind: "rest" }, "rest"],
      [{ kind: "event" }, "event"],
    ];

    for (const [overrides, status] of cases) {
      const out = chooseNode(onMap(), [plan(overrides)], 0);
      expect(out.ok && out.state.status).toBe(status);
    }
  });

  it("refuse une branche qui n'existe pas", () => {
    expect(chooseNode(onMap(), branches, 5).ok).toBe(false);
    expect(chooseNode(onMap(), branches, -1).ok).toBe(false);
  });

  it("refuse de choisir hors de l'écran de carte", () => {
    // `started()` est DÉJÀ sur la carte : il faut un autre état pour tester le refus.
    const out = chooseNode({ ...started(), status: "combat" }, branches, 0);
    expect(out.ok === false && out.error).toBe("wrong-status");
  });

  it("garde un chemin DENSE, sans trou — Prisma refuse les undefined en JSON", () => {
    // Cas réel : une run reprise à un étage avancé avec un chemin encore vide.
    const out = chooseNode({ ...onMap(5), path: [] }, branches, 1);

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.state.path).toEqual([0, 0, 0, 0, 1]);
    expect(out.state.path.some((v) => v === undefined)).toBe(false);
    // Sérialisable tel quel, ce que la base exige.
    expect(JSON.parse(JSON.stringify(out.state.path))).toEqual([0, 0, 0, 0, 1]);
  });

  it("garde une trace de chaque étage franchi, dans l'ordre", () => {
    let state = onMap(1);
    for (let floor = 1; floor <= 3; floor += 1) {
      const out = chooseNode({ ...state, floor, status: "map" }, branches, floor % 2);
      if (!out.ok) throw new Error("branche refusée");
      state = out.state;
    }
    expect(state.path.slice(0, 3)).toEqual([1, 0, 1]);
  });
});

describe("repos", () => {
  it("soigne l'escouade et remonte à la carte", () => {
    const state: TowerRunState = {
      ...started(),
      floor: 4,
      status: "rest",
      squad: [{ characterId: "start", hp: 10, maxHp: 100 }],
    };

    const out = takeRest(state);
    expect(out.ok && out.state.squad[0].hp).toBe(10 + REST_HEAL_PCT);
    expect(out.ok && out.state.floor).toBe(5);
    expect(out.ok && out.state.status).toBe("map");
  });

  it("ne dépasse pas les PV max", () => {
    const state: TowerRunState = {
      ...started(),
      floor: 4,
      status: "rest",
      squad: [{ characterId: "start", hp: 95, maxHp: 100 }],
    };
    expect(takeRest(state).ok && takeRest(state).ok).toBe(true);
    const out = takeRest(state);
    expect(out.ok && out.state.squad[0].hp).toBe(100);
  });
});

describe("évènements", () => {
  const atEvent = (overrides: Partial<TowerRunState> = {}): TowerRunState => ({
    ...started(),
    floor: 4,
    status: "event",
    squad: [{ characterId: "start", hp: 50, maxHp: 100 }],
    ...overrides,
  });

  const event: TowerEvent = {
    slug: "test",
    title: "Test",
    text: "…",
    choices: [
      { label: "A", outcome: { text: "a", fragments: 30 } },
      { label: "B", outcome: { text: "b", healPct: -20 } },
    ],
  };

  it("crédite les fragments d'une issue", () => {
    const out = resolveEvent(atEvent(), event.choices[0].outcome, null);
    expect(out.ok && out.state.fragments).toBe(30);
    expect(out.ok && out.state.status).toBe("map");
  });

  it("BLESSE l'escouade sur un soin négatif", () => {
    const out = resolveEvent(atEvent(), event.choices[1].outcome, null);
    expect(out.ok && out.state.squad[0].hp).toBe(30);
  });

  it("ne met jamais les fragments en dette", () => {
    const out = resolveEvent(
      atEvent({ fragments: 10 }),
      { text: "", fragments: -100 },
      null,
    );
    expect(out.ok && out.state.fragments).toBe(0);
  });

  it("ajoute l'objet accordé", () => {
    const out = resolveEvent(atEvent(), { text: "", item: "any" }, "relique");
    expect(out.ok && out.state.items).toEqual(["relique"]);
  });

  it("compense en fragments quand il n'y a plus rien à donner", () => {
    const out = resolveEvent(atEvent(), { text: "", item: "any" }, null);
    expect(out.ok && out.state.fragments).toBeGreaterThan(0);
    expect(out.ok && out.state.items).toEqual([]);
  });

  it("une issue qui fauche toute l'escouade met fin à la run", () => {
    const out = resolveEvent(
      atEvent({ squad: [{ characterId: "start", hp: 5, maxHp: 100 }] }),
      { text: "", healPct: -50 },
      null,
    );
    expect(out.ok && out.state.status).toBe("lost");
  });

  it("résout l'index d'un choix, et refuse un index inconnu", () => {
    expect(eventChoiceOf(event, 1)?.healPct).toBe(-20);
    expect(eventChoiceOf(event, 7)).toBeNull();
  });

  it("refuse une issue hors de l'écran d'évènement", () => {
    const out = resolveEvent(started(), { text: "" }, null);
    expect(out.ok === false && out.error).toBe("wrong-status");
  });
});


describe("relecture d'un état persisté", () => {
  it("complète les champs qu'une version antérieure n'écrivait pas", () => {
    // Exactement la forme d'une run écrite avant les phases 2 et 3 : ni
    // `items`, ni `path`, ni `revived`.
    const legacy = {
      seed: 42,
      floor: 4,
      status: "combat",
      squad: [{ characterId: "start", hp: 50, maxHp: 100 }],
      fragments: 15,
      enemiesKilled: 3,
      bossesKilled: 0,
      seen: ["start"],
    };

    const state = normalizeRunState(legacy);

    expect(state.items).toEqual([]);
    expect(state.path).toEqual([]);
    expect(state.revived).toBe(false);
    // Et rien de ce qui existait n'est perdu.
    expect(state.floor).toBe(4);
    expect(state.fragments).toBe(15);
    expect(state.squad).toHaveLength(1);
  });

  it("survit à un blob vide ou corrompu plutôt que de jeter", () => {
    for (const raw of [null, undefined, {}, { squad: "pas un tableau" }]) {
      const state = normalizeRunState(raw);
      expect(Array.isArray(state.squad)).toBe(true);
      expect(Array.isArray(state.path)).toBe(true);
      expect(Array.isArray(state.items)).toBe(true);
    }
  });

  it("laisse un état complet intact", () => {
    const full = { ...started(), floor: 7, items: ["a"], path: [0, 1] };
    expect(normalizeRunState(full)).toEqual(full);
  });
});
