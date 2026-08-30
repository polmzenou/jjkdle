import { describe, expect, it } from "vitest";
import type { Character } from "@/data/roster/characters";
import { JJK_ATTRIBUTES } from "@/lib/universes/jjk-attributes";
import { JJK_TOWER_CONFIG } from "./config";
import {
  RECRUIT_CAPS,
  buildTowerRoster,
  canRecruit,
  isBossFloor,
  isRecruitFloor,
  isTowerPlayable,
  planTower,
  strateOfArc,
  strateOfFloor,
} from "./floors";
import { STRATE_COUNT, TOWER_FLOORS } from "./types";

/** L'ordre réel des arcs JJK, tel qu'il est amorcé en base. */
const JJK_ARCS = (
  JJK_ATTRIBUTES.find((a) => a.key === "appearanceArc")?.options ?? []
).map((o) => o.value);

function character(
  id: string,
  arc: string | null,
  value: number,
  ratings: Character["ratings"] = {},
): Character {
  return {
    id,
    name: id,
    title: "",
    tier: "3",
    battleValue: value,
    ratings,
    ...(arc ? { attributes: { appearanceArc: arc } } : {}),
  };
}

/** Un roster synthétique : 4 personnages par arc, de force croissante. */
function syntheticRoster(): Character[] {
  const out: Character[] = [];
  JJK_ARCS.forEach((arc, arcIndex) => {
    for (let i = 0; i < 4; i += 1) {
      out.push(character(`${arc}-${i}`, arc, arcIndex * 8 + i * 2 + 1));
    }
  });
  return out;
}

describe("découpage en strates", () => {
  it("les 12 arcs JJK retombent sur le découpage du doc (3 arcs par strate)", () => {
    expect(JJK_ARCS).toHaveLength(12);

    const strates = JJK_ARCS.map((_, i) => strateOfArc(i, JJK_ARCS.length));
    expect(strates).toEqual([0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3]);
  });

  it("reste à 4 strates quel que soit le nombre d'arcs de l'univers", () => {
    for (const arcCount of [1, 3, 8, 12, 20, 37]) {
      const seen = new Set(
        Array.from({ length: arcCount }, (_, i) => strateOfArc(i, arcCount)),
      );
      for (const strate of seen) {
        expect(strate).toBeGreaterThanOrEqual(0);
        expect(strate).toBeLessThan(STRATE_COUNT);
      }
    }
  });

  it("ne sort pas des bornes sur un index d'arc aberrant", () => {
    expect(strateOfArc(-5, 12)).toBe(0);
    expect(strateOfArc(999, 12)).toBe(STRATE_COUNT - 1);
    expect(strateOfArc(0, 0)).toBe(0);
  });

  it("range les étages dans la bonne strate", () => {
    expect(strateOfFloor(1)).toBe(0);
    expect(strateOfFloor(5)).toBe(0);
    expect(strateOfFloor(6)).toBe(1);
    expect(strateOfFloor(20)).toBe(3);
  });

  it("place un boss tous les 5 étages", () => {
    const bosses = Array.from({ length: TOWER_FLOORS }, (_, i) => i + 1).filter(
      isBossFloor,
    );
    expect(bosses).toEqual([5, 10, 15, 20]);
  });

  it("propose assez de recrutements pour remplir l'escouade et forcer des sacrifices", () => {
    const floors = Array.from({ length: TOWER_FLOORS }, (_, i) => i + 1).filter(
      isRecruitFloor,
    );
    expect(floors.length).toBeGreaterThanOrEqual(6);
    expect(floors).not.toContain(TOWER_FLOORS); // pas au sommet
  });
});

describe("vivier", () => {
  it("EXCLUT les personnages sans arc renseigné (sinon Sukuna sort à l'étage 2)", () => {
    const roster = [
      ...syntheticRoster(),
      character("sukuna-sans-arc", null, 98),
    ];
    const tower = buildTowerRoster(roster, JJK_ARCS, JJK_TOWER_CONFIG);

    expect(tower.entries["sukuna-sans-arc"]).toBeUndefined();
    for (const pool of tower.byStrate) {
      expect(pool).not.toContain("sukuna-sans-arc");
    }
  });

  it("trie chaque strate par force croissante, de façon stable", () => {
    const tower = buildTowerRoster(syntheticRoster(), JJK_ARCS, JJK_TOWER_CONFIG);

    for (const pool of tower.byStrate) {
      const values = pool.map((id) => tower.entries[id].value);
      expect(values).toEqual([...values].sort((a, b) => a - b));
    }
  });

  it("détecte un vivier trop maigre pour faire tenir une tour", () => {
    const tower = buildTowerRoster(
      [character("a", JJK_ARCS[0], 10)],
      JJK_ARCS,
      JJK_TOWER_CONFIG,
    );
    expect(isTowerPlayable(tower)).toBe(false);
    expect(isTowerPlayable(buildTowerRoster(syntheticRoster(), JJK_ARCS, JJK_TOWER_CONFIG))).toBe(true);
  });
});

describe("génération de la tour", () => {
  const tower = buildTowerRoster(syntheticRoster(), JJK_ARCS, JJK_TOWER_CONFIG);

  it("est entièrement déterminée par la graine", () => {
    expect(planTower(1234, tower)).toEqual(planTower(1234, tower));
    expect(planTower(1234, tower)).not.toEqual(planTower(5678, tower));
  });

  it("produit exactement 20 étages, bossés aux bons paliers", () => {
    const plans = planTower(42, tower);

    expect(plans).toHaveLength(TOWER_FLOORS);
    expect(plans.map((p) => p.floor)).toEqual(
      Array.from({ length: TOWER_FLOORS }, (_, i) => i + 1),
    );
    for (const plan of plans) {
      expect(plan.kind === "boss").toBe(isBossFloor(plan.floor));
    }
  });

  it("chaque étage combattant a au moins un ennemi, jamais deux fois le même", () => {
    const plans = planTower(7, tower);

    for (const plan of plans) {
      expect(plan.enemyIds.length).toBeGreaterThan(0);
      expect(new Set(plan.enemyIds).size).toBe(plan.enemyIds.length);
    }
  });

  it("le boss d'une strate est le plus fort de son vivier, et ne resservira pas", () => {
    const plans = planTower(3, tower);
    const bosses = plans.filter((p) => p.kind === "boss");

    expect(new Set(bosses.map((b) => b.enemyIds[0])).size).toBe(bosses.length);

    const first = bosses[0];
    const pool = tower.byStrate[first.strate];
    expect(first.enemyIds[0]).toBe(pool[pool.length - 1]);
  });

  it("les combats montent en nombre d'ennemis avec les strates", () => {
    const plans = planTower(99, tower);
    const maxIn = (strate: number) =>
      Math.max(
        ...plans
          .filter((p) => p.strate === strate && p.kind === "combat")
          .map((p) => p.enemyIds.length),
      );

    expect(maxIn(0)).toBe(1);
    expect(maxIn(3)).toBeGreaterThan(1);
  });

  it("ne propose au recrutement que des personnages sous le plafond de la strate", () => {
    const plans = planTower(11, tower);

    for (const plan of plans) {
      for (const id of plan.recruitIds) {
        expect(tower.entries[id].value).toBeLessThanOrEqual(
          RECRUIT_CAPS[plan.strate],
        );
      }
    }
  });

  it("n'offre de recrutement que sur les étages prévus", () => {
    for (const plan of planTower(11, tower)) {
      expect(plan.recruitIds.length > 0).toBe(isRecruitFloor(plan.floor));
    }
  });
});

describe("plafond de recrutement", () => {
  const roster = [
    character("faible", JJK_ARCS[0], 20),
    character("costaud", JJK_ARCS[0], 90),
    // Note maximale en « versatility » ⇒ archétype `adaptive` ⇒ Polyvalence.
    character("polyvalent", JJK_ARCS[0], 90, { versatility: 100 }),
  ];
  const tower = buildTowerRoster(roster, JJK_ARCS, JJK_TOWER_CONFIG);

  it("refuse un personnage au-dessus du plafond de la strate", () => {
    expect(canRecruit(tower, "faible", 0)).toBe(true);
    expect(canRecruit(tower, "costaud", 0)).toBe(false);
    expect(canRecruit(tower, "costaud", 3)).toBe(true);
  });

  it("le passif Polyvalence passe outre le plafond", () => {
    expect(canRecruit(tower, "polyvalent", 0)).toBe(true);
  });

  it("refuse un id inconnu (garde serveur)", () => {
    expect(canRecruit(tower, "inexistant", 3)).toBe(false);
  });
});
