import { describe, expect, it } from "vitest";
import {
  GUARD_COOLDOWN,
  GUARD_DURATION,
  GUARD_SLOT,
  MAX_TICKS,
  TELEGRAPH_DURATION,
  TELEGRAPH_PERIOD,
  simulateCombat,
  type CombatSetup,
} from "./combat";
import { NO_MODIFIERS, type RunModifiers } from "./effects";
import type { Archetype, CombatEvent, FighterSpec } from "./types";

/**
 * Tests du moteur de combat.
 *
 * Deux propriétés sont non négociables et testées en premier, parce que TOUT
 * le reste du jeu repose dessus :
 *   - le DÉTERMINISME (sans lui, la re-simulation serveur est impossible) ;
 *   - la règle du CONTRE (sans elle, le jeu n'a pas d'input intéressant).
 */

function fighter(
  overrides: Partial<FighterSpec> & { id: string; archetype: Archetype },
): FighterSpec {
  return {
    name: overrides.id,
    side: "squad",
    hasDomain: false,
    stats: { maxHp: 200, strike: 20, speed: 60, flux: 1.6 },
    ...overrides,
  };
}

/**
 * Modificateurs neutres, avec de l'énergie d'avance : évite d'attendre que la
 * jauge se remplisse. La valeur s'AJOUTE à `START_ENERGY` (30), que tout combat
 * accorde d'office.
 */
function withEnergy(energy: number): RunModifiers {
  return { ...NO_MODIFIERS, ENERGIE_DEPART: energy };
}

function run(setup: CombatSetup) {
  return simulateCombat(setup);
}

/** Premier évènement d'un type donné, au tick donné. */
function eventAt<K extends CombatEvent["kind"]>(
  events: CombatEvent[],
  kind: K,
  t: number,
): Extract<CombatEvent, { kind: K }> | undefined {
  return events.find((e) => e.kind === kind && e.t === t) as
    | Extract<CombatEvent, { kind: K }>
    | undefined;
}

describe("déterminisme", () => {
  it("rend exactement le même résultat pour les mêmes entrées", () => {
    const setup: CombatSetup = {
      squad: [
        fighter({ id: "a", archetype: "technique" }),
        fighter({ id: "b", archetype: "swift" }),
        fighter({ id: "c", archetype: "stalwart" }),
      ],
      enemies: [
        fighter({ id: "x", archetype: "brute", side: "enemy" }),
        fighter({ id: "y", archetype: "beast", side: "enemy" }),
      ],
      modifiers: withEnergy(100),
      interventions: [
        { tick: 10, slot: 0 },
        { tick: 50, slot: 1 },
        { tick: 120, slot: 2 },
      ],
    };

    expect(run(setup)).toEqual(run(setup));
  });

  it("ne dépend d'aucune source de hasard entre deux exécutions espacées", () => {
    const setup: CombatSetup = {
      squad: [fighter({ id: "a", archetype: "brute" })],
      enemies: [fighter({ id: "x", archetype: "brute", side: "enemy" })],
    };

    const first = run(setup);
    for (let i = 0; i < 20; i += 1) run(setup);
    expect(run(setup)).toEqual(first);
  });
});

describe("issue du combat", () => {
  it("l'escouade nettement plus forte l'emporte", () => {
    const result = run({
      squad: [
        fighter({ id: "a", archetype: "brute", stats: { maxHp: 500, strike: 60, speed: 90, flux: 1.6 } }),
      ],
      enemies: [
        fighter({ id: "x", archetype: "brute", side: "enemy", stats: { maxHp: 60, strike: 4, speed: 40, flux: 0 } }),
      ],
    });

    expect(result.victory).toBe(true);
    expect(result.enemiesKilled).toBe(1);
    expect(result.squad[0].alive).toBe(true);
  });

  it("l'escouade décimée perd, et les ennemis restent debout", () => {
    const result = run({
      squad: [
        fighter({ id: "a", archetype: "brute", stats: { maxHp: 20, strike: 2, speed: 40, flux: 1.6 } }),
      ],
      enemies: [
        fighter({ id: "x", archetype: "brute", side: "enemy", stats: { maxHp: 900, strike: 40, speed: 90, flux: 0 } }),
      ],
    });

    expect(result.victory).toBe(false);
    expect(result.squad[0].alive).toBe(false);
    expect(result.enemies[0].alive).toBe(true);
  });

  it("un combat qui traîne s'arrête au plafond et compte comme une défaite", () => {
    const tank = { maxHp: 100_000, strike: 1, speed: 5, flux: 0.8 };
    const result = run({
      squad: [fighter({ id: "a", archetype: "brute", stats: tank })],
      enemies: [fighter({ id: "x", archetype: "brute", side: "enemy", stats: tank })],
    });

    expect(result.ticks).toBe(MAX_TICKS);
    expect(result.timeout).toBe(true);
    expect(result.victory).toBe(false);
  });

  it("reprend les PV d'entrée fournis par la run (pas de soin entre les étages)", () => {
    const result = run({
      squad: [fighter({ id: "a", archetype: "brute" })],
      enemies: [
        fighter({ id: "x", archetype: "brute", side: "enemy", stats: { maxHp: 1, strike: 1, speed: 1, flux: 0 } }),
      ],
      squadHp: [50],
    });

    expect(result.squad[0].maxHp).toBe(200);
    expect(result.squad[0].hp).toBeLessThanOrEqual(50);
  });
});

describe("fenêtres et contre", () => {
  // La première charge démarre au tick TELEGRAPH_PERIOD - 1 et se résout
  // TELEGRAPH_DURATION ticks plus tard : la fenêtre est ouverte entre les deux.
  const chargeStart = TELEGRAPH_PERIOD - 1;
  const inWindow = chargeStart + 5;
  const outOfWindow = 10;

  const base: CombatSetup = {
    squad: [fighter({ id: "a", archetype: "technique" })],
    enemies: [
      fighter({
        id: "x",
        archetype: "brute",
        side: "enemy",
        stats: { maxHp: 100_000, strike: 5, speed: 1, flux: 0 },
      }),
    ],
    modifiers: withEnergy(100),
  };

  it("ouvre une fenêtre au bout de TELEGRAPH_PERIOD ticks", () => {
    const result = run(base);
    const start = eventAt(result.events, "telegraph-start", chargeStart);

    expect(start).toBeDefined();
    expect(start?.endsAt).toBe(chargeStart + TELEGRAPH_DURATION);
  });

  it("double les dégâts d'une technique jouée DANS la fenêtre", () => {
    const outside = run({ ...base, interventions: [{ tick: outOfWindow, slot: 0 }] });
    const inside = run({ ...base, interventions: [{ tick: inWindow, slot: 0 }] });

    const plain = eventAt(outside.events, "strike", outOfWindow);
    const countered = eventAt(inside.events, "strike", inWindow);

    expect(plain?.damage).toBe(50); // strike 20 × 2.5
    expect(countered?.damage).toBe(100); // × 2 de contre
  });

  it("marque l'intervention comme opportune seulement dans la fenêtre", () => {
    const outside = run({ ...base, interventions: [{ tick: outOfWindow, slot: 0 }] });
    const inside = run({ ...base, interventions: [{ tick: inWindow, slot: 0 }] });

    expect(eventAt(outside.events, "technique", outOfWindow)?.timed).toBe(false);
    expect(eventAt(inside.events, "technique", inWindow)?.timed).toBe(true);
  });

  it("annule la charge : le coup chargé ne part jamais", () => {
    const landsAt = chargeStart + TELEGRAPH_DURATION;

    const ignored = run(base);
    const countered = run({ ...base, interventions: [{ tick: inWindow, slot: 0 }] });

    expect(eventAt(ignored.events, "telegraph-hit", landsAt)).toBeDefined();
    expect(eventAt(countered.events, "telegraph-cancel", inWindow)).toBeDefined();
    expect(eventAt(countered.events, "telegraph-hit", landsAt)).toBeUndefined();
  });

  it("un coup chargé ignoré frappe bien trois fois plus fort", () => {
    const result = run(base);
    const hit = result.events.find((e) => e.kind === "telegraph-hit");

    expect(hit).toBeDefined();
    expect(hit?.kind === "telegraph-hit" && hit.damage).toBe(15); // strike 5 × 3
  });

  it("le passif Lecture allonge la fenêtre sans la laisser filer au-delà du plafond", () => {
    const withReader = run({
      ...base,
      squad: [
        fighter({ id: "a", archetype: "technique" }),
        fighter({ id: "b", archetype: "tactician" }),
      ],
    });

    const start = eventAt(withReader.events, "telegraph-start", chargeStart);
    // +40 % de « Lecture » sur 15 ticks de base.
    expect(start?.endsAt).toBe(chargeStart + 21);
  });
});

describe("interventions", () => {
  const enemy = fighter({
    id: "x",
    archetype: "brute",
    side: "enemy",
    stats: { maxHp: 100_000, strike: 1, speed: 1, flux: 0 },
  });

  it("refuse une technique quand l'énergie manque", () => {
    const result = run({
      squad: [fighter({ id: "a", archetype: "technique" })],
      enemies: [enemy],
      interventions: [{ tick: 0, slot: 0 }],
    });

    const rejected = result.events.find((e) => e.kind === "reject");
    expect(rejected?.kind === "reject" && rejected.reason).toBe("energy");
  });

  it("refuse un slot vide et un slot mort", () => {
    const empty = run({
      squad: [fighter({ id: "a", archetype: "technique" })],
      enemies: [enemy],
      modifiers: withEnergy(100),
      interventions: [{ tick: 5, slot: 2 }],
    });

    const rejected = empty.events.find((e) => e.kind === "reject");
    expect(rejected?.kind === "reject" && rejected.reason).toBe("empty");
  });

  it("refuse des ticks qui ne progressent pas strictement (anti-rejeu)", () => {
    const result = run({
      squad: [fighter({ id: "a", archetype: "technique" })],
      enemies: [enemy],
      modifiers: withEnergy(100),
      interventions: [
        { tick: 30, slot: 0 },
        { tick: 30, slot: 0 },
        { tick: 20, slot: 0 },
      ],
    });

    const rejects = result.events.filter(
      (e) => e.kind === "reject" && e.reason === "out-of-range",
    );
    expect(rejects).toHaveLength(2);
  });

  it("dépense l'énergie : deux techniques coûtent plus qu'une", () => {
    const setup: CombatSetup = {
      squad: [fighter({ id: "a", archetype: "technique" })],
      enemies: [enemy],
      // Coût 50 − 10 (passif « Sort inné ») = 40. Total 30 + 30 = 60 :
      // de quoi en payer une seule, la seconde tombe à court.
      modifiers: withEnergy(30),
    };

    const result = run({
      ...setup,
      interventions: [
        { tick: 5, slot: 0 },
        { tick: 6, slot: 0 },
      ],
    });

    expect(result.events.filter((e) => e.kind === "technique")).toHaveLength(1);
    const rejected = result.events.find((e) => e.kind === "reject");
    expect(rejected?.kind === "reject" && rejected.reason).toBe("energy");
  });
});

describe("passifs", () => {
  it("Ténacité fait survivre à un coup fatal, une seule fois", () => {
    const result = run({
      squad: [
        fighter({
          id: "a",
          archetype: "stalwart",
          stats: { maxHp: 10, strike: 1, speed: 1, flux: 0.8 },
        }),
      ],
      enemies: [
        fighter({
          id: "x",
          archetype: "brute",
          side: "enemy",
          stats: { maxHp: 100_000, strike: 500, speed: 90, flux: 0 },
        }),
      ],
    });

    expect(result.events.filter((e) => e.kind === "survive")).toHaveLength(1);
    expect(result.squad[0].alive).toBe(false);
  });

  it("Devance fait frapper le rapide avant le lent", () => {
    const enemy = fighter({
      id: "x",
      archetype: "brute",
      side: "enemy",
      stats: { maxHp: 100_000, strike: 1, speed: 1, flux: 0 },
    });
    const stats = { maxHp: 200, strike: 20, speed: 50, flux: 1.6 };

    const swift = run({
      squad: [fighter({ id: "a", archetype: "swift", stats })],
      enemies: [enemy],
    });
    const plain = run({
      squad: [fighter({ id: "a", archetype: "brute", stats })],
      enemies: [enemy],
    });

    const firstOf = (r: typeof swift) =>
      r.events.find((e) => e.kind === "strike")?.t ?? Infinity;

    expect(firstOf(swift)).toBeLessThan(firstOf(plain));
  });

  it("Fléau soigne son porteur à chaque ennemi abattu", () => {
    const result = run({
      squad: [
        fighter({
          id: "a",
          archetype: "beast",
          stats: { maxHp: 400, strike: 100, speed: 90, flux: 1.6 },
        }),
      ],
      enemies: [
        fighter({ id: "x", archetype: "brute", side: "enemy", stats: { maxHp: 50, strike: 30, speed: 60, flux: 0 } }),
        fighter({ id: "y", archetype: "brute", side: "enemy", stats: { maxHp: 50, strike: 30, speed: 60, flux: 0 } }),
      ],
      squadHp: [200],
    });

    expect(result.events.filter((e) => e.kind === "heal")).toHaveLength(2);
  });
});

describe("ultime", () => {
  it("remplace la technique quand la jauge est pleine et frappe tous les ennemis", () => {
    const result = run({
      squad: [
        fighter({
          id: "a",
          archetype: "technique",
          hasDomain: true,
          stats: { maxHp: 300, strike: 30, speed: 40, flux: 1.6 },
        }),
      ],
      enemies: [
        fighter({ id: "x", archetype: "brute", side: "enemy", stats: { maxHp: 100_000, strike: 60, speed: 20, flux: 0 } }),
        fighter({ id: "y", archetype: "brute", side: "enemy", stats: { maxHp: 100_000, strike: 1, speed: 1, flux: 0 } }),
      ],
      modifiers: withEnergy(100),
      // Deux coups encaissés (ticks ~50 et ~100) suffisent à remplir la jauge
      // sans tuer le porteur : c'est précisément la fenêtre que le coefficient
      // DOMAIN_GAUGE_RATE rend possible.
      interventions: [{ tick: 110, slot: 0 }],
    });

    const ultimate = result.events.find((e) => e.kind === "ultimate");
    expect(ultimate).toBeDefined();

    const blast = result.events.filter(
      (e) => e.kind === "strike" && e.t === ultimate?.t,
    );
    expect(blast).toHaveLength(2); // les deux ennemis touchés
  });

  it("sans jauge pleine, c'est la technique qui part", () => {
    const result = run({
      squad: [
        fighter({ id: "a", archetype: "technique", hasDomain: true }),
      ],
      enemies: [
        fighter({ id: "x", archetype: "brute", side: "enemy", stats: { maxHp: 100_000, strike: 1, speed: 1, flux: 0 } }),
      ],
      modifiers: withEnergy(100),
      interventions: [{ tick: 5, slot: 0 }],
    });

    expect(result.events.some((e) => e.kind === "ultimate")).toBe(false);
    expect(result.events.some((e) => e.kind === "technique")).toBe(true);
  });
});

describe("techniques", () => {
  const enemy = (id: string) =>
    fighter({
      id,
      archetype: "brute",
      side: "enemy",
      stats: { maxHp: 100_000, strike: 1, speed: 1, flux: 0 },
    });

  it("Décharge touche tous les ennemis d'un coup", () => {
    const result = run({
      squad: [fighter({ id: "a", archetype: "channeler" })],
      enemies: [enemy("x"), enemy("y"), enemy("z")],
      modifiers: withEnergy(100),
      interventions: [{ tick: 5, slot: 0 }],
    });

    expect(result.events.filter((e) => e.kind === "strike" && e.t === 5)).toHaveLength(3);
  });

  it("Fauchage frappe trois fois", () => {
    const result = run({
      squad: [fighter({ id: "a", archetype: "swift" })],
      enemies: [enemy("x")],
      modifiers: withEnergy(100),
      interventions: [{ tick: 5, slot: 0 }],
    });

    expect(result.events.filter((e) => e.kind === "strike" && e.t === 5)).toHaveLength(3);
  });

  it("Invocation fait entrer un shikigami qui combat seul", () => {
    const result = run({
      squad: [fighter({ id: "a", archetype: "beast" })],
      enemies: [enemy("x")],
      modifiers: withEnergy(100),
      interventions: [{ tick: 5, slot: 0 }],
    });

    const summon = result.events.find((e) => e.kind === "summon");
    expect(summon).toBeDefined();

    // Il frappe après son entrée, sans intervention du joueur.
    const summonId = summon?.kind === "summon" ? summon.summonId : "";
    expect(
      result.events.some((e) => e.kind === "strike" && e.from === summonId),
    ).toBe(true);
  });

  it("Adaptation rejoue la dernière technique de l'escouade", () => {
    const result = run({
      squad: [
        fighter({ id: "a", archetype: "channeler" }),
        fighter({ id: "b", archetype: "adaptive" }),
      ],
      enemies: [enemy("x"), enemy("y")],
      modifiers: withEnergy(100),
      interventions: [
        { tick: 5, slot: 0 }, // Décharge : touche les 2
        { tick: 6, slot: 1 }, // Adaptation : rejoue Décharge
      ],
    });

    expect(result.events.filter((e) => e.kind === "strike" && e.t === 6)).toHaveLength(2);
  });

  it("Adaptation sans technique précédente ne gâche pas le clic", () => {
    const result = run({
      squad: [fighter({ id: "a", archetype: "adaptive" })],
      enemies: [enemy("x")],
      modifiers: withEnergy(100),
      interventions: [{ tick: 5, slot: 0 }],
    });

    expect(result.events.filter((e) => e.kind === "strike" && e.t === 5)).toHaveLength(1);
  });

  it("Encaisse absorbe entièrement la prochaine attaque reçue", () => {
    const setup: CombatSetup = {
      squad: [
        fighter({
          id: "a",
          archetype: "stalwart",
          stats: { maxHp: 5_000, strike: 1, speed: 1, flux: 1.6 },
        }),
      ],
      enemies: [
        fighter({
          id: "x",
          archetype: "brute",
          side: "enemy",
          stats: { maxHp: 100_000, strike: 40, speed: 90, flux: 0 },
        }),
      ],
      modifiers: withEnergy(100),
    };

    const guarded = run({ ...setup, interventions: [{ tick: 1, slot: 0 }] });
    const plain = run(setup);

    expect(guarded.events.some((e) => e.kind === "parry")).toBe(true);
    expect(guarded.squad[0].hp).toBeGreaterThan(plain.squad[0].hp);
  });
});

describe("garde", () => {
  const punchingBag: CombatSetup = {
    squad: [
      fighter({
        id: "a",
        archetype: "brute",
        stats: { maxHp: 5_000, strike: 1, speed: 1, flux: 1.6 },
      }),
    ],
    enemies: [
      fighter({
        id: "x",
        archetype: "brute",
        side: "enemy",
        stats: { maxHp: 100_000, strike: 40, speed: 90, flux: 0 },
      }),
    ],
  };

  const guard = (tick: number) => ({ tick, slot: GUARD_SLOT, kind: "guard" as const });

  it("réduit les dégâts des coups ordinaires pendant sa durée", () => {
    const plain = run(punchingBag);
    const guarded = run({ ...punchingBag, interventions: [guard(1)] });

    const damageIn = (r: typeof plain, from: number, to: number) =>
      r.events
        .filter((e) => e.kind === "strike" && e.to === "s0" && e.t >= from && e.t < to)
        .reduce((sum, e) => sum + (e.kind === "strike" ? e.damage : 0), 0);

    const window: [number, number] = [1, 1 + GUARD_DURATION];
    expect(damageIn(guarded, ...window)).toBeLessThan(damageIn(plain, ...window));
  });

  it("ne coûte AUCUNE énergie : c'est la défense du joueur qui n'en a pas", () => {
    const withGuard = run({ ...punchingBag, interventions: [guard(1)] });
    const without = run(punchingBag);

    // L'énergie ne dépend que de la régénération, identique dans les deux cas.
    expect(withGuard.energyByTick[20]).toBe(without.energyByTick[20]);
  });

  it("expire au bout de GUARD_DURATION", () => {
    const guarded = run({ ...punchingBag, interventions: [guard(1)] });
    const plain = run(punchingBag);

    const after = (r: typeof plain) =>
      r.events
        .filter(
          (e) =>
            e.kind === "strike" &&
            e.to === "s0" &&
            e.t > 1 + GUARD_DURATION + 2 &&
            e.t < 1 + GUARD_DURATION + 40,
        )
        .reduce((sum, e) => sum + (e.kind === "strike" ? e.damage : 0), 0);

    expect(after(guarded)).toBe(after(plain));
  });

  it("refuse une garde encore en recharge, sans la consommer en silence", () => {
    const result = run({
      ...punchingBag,
      interventions: [guard(1), guard(5)],
    });

    expect(result.events.filter((e) => e.kind === "guard")).toHaveLength(1);
    const rejected = result.events.find((e) => e.kind === "reject");
    expect(rejected?.kind === "reject" && rejected.reason).toBe("cooldown");
  });

  it("se relève une fois la recharge écoulée", () => {
    const result = run({
      ...punchingBag,
      interventions: [guard(1), guard(1 + GUARD_COOLDOWN)],
    });

    expect(result.events.filter((e) => e.kind === "guard")).toHaveLength(2);
  });

  it("amortit aussi le coup chargé : c'est la parade du joueur sans énergie", () => {
    const landsAt = TELEGRAPH_PERIOD - 1 + TELEGRAPH_DURATION;
    const base: CombatSetup = {
      squad: [
        fighter({
          id: "a",
          archetype: "brute",
          stats: { maxHp: 5_000, strike: 1, speed: 1, flux: 1.6 },
        }),
      ],
      enemies: [
        fighter({
          id: "x",
          archetype: "brute",
          side: "enemy",
          stats: { maxHp: 100_000, strike: 30, speed: 1, flux: 0 },
        }),
      ],
    };

    const ignored = run(base);
    const guarded = run({ ...base, interventions: [guard(landsAt - 3)] });

    const hit = (r: typeof ignored) => {
      const e = r.events.find((x) => x.kind === "telegraph-hit" && x.t === landsAt);
      return e?.kind === "telegraph-hit" ? e.damage : 0;
    };

    expect(hit(ignored)).toBe(90); // 30 × 3
    expect(hit(guarded)).toBeLessThan(hit(ignored));
  });

  it("reste déterministe avec des gardes dans le log", () => {
    const setup = { ...punchingBag, interventions: [guard(1), guard(60), guard(120)] };
    expect(run(setup)).toEqual(run(setup));
  });
});
