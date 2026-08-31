import { describe, expect, it } from "vitest";
import type { Character } from "@/data/roster/characters";
import { JJK_ATTRIBUTES } from "@/lib/universes/jjk-attributes";
import { JJK_TOWER_CONFIG } from "./config";
import {
  RECRUIT_CAPS,
  buildTowerRoster,
  canRecruit,
  isBossFloor,
  isTowerPlayable,
  planTower,
  strateOfArc,
  strateOfFloor,
  strateOf,
  strateOfValue,
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


});

describe("croisement arc x puissance", () => {
  // Régression : trouvée en jouant, Sukuna sortait à l'étage 1 parce qu'il
  // entre en scène dès le prologue. La chronologie d'un récit n'est PAS une
  // échelle de puissance.
  it("retient la strate LA PLUS TARDIVE entre l'arc et la puissance", () => {
    // Arc du prologue (strate 0) mais valeur de fin de série.
    expect(strateOf(1, 12, 98)).toBe(3);
    // Arc tardif mais personnage faible : c'est l'arc qui le retient.
    expect(strateOf(10, 12, 5)).toBe(3);
    // Les deux d'accord : rien ne bouge.
    expect(strateOf(1, 12, 20)).toBe(0);
  });

  it("classe la puissance sur la même échelle que le plafond de recrutement", () => {
    expect(strateOfValue(20)).toBe(0);
    expect(strateOfValue(50)).toBe(1);
    expect(strateOfValue(75)).toBe(2);
    expect(strateOfValue(98)).toBe(3);
  });

  it("ne laisse AUCUN personnage dépasser le plafond de sa strate", () => {
    const roster = [
      // Prologue, mais surpuissant : le piège exact du bug d'origine.
      character("sukuna", JJK_ARCS[1], 98),
      character("gojo", JJK_ARCS[1], 96),
      character("momo", JJK_ARCS[1], 2),
    ];
    const tower = buildTowerRoster(roster, JJK_ARCS, JJK_TOWER_CONFIG);

    tower.byStrate.forEach((pool, strate) => {
      for (const id of pool) {
        expect(tower.entries[id].value).toBeLessThanOrEqual(RECRUIT_CAPS[strate]);
      }
    });
    expect(tower.byStrate[0]).toEqual(["momo"]);
    expect(tower.byStrate[3]).toContain("sukuna");
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
  const all = (seed: number) => planTower(seed, tower).flatMap((f) => f.options);

  it("est entièrement déterminée par la graine", () => {
    expect(planTower(1234, tower)).toEqual(planTower(1234, tower));
    expect(planTower(1234, tower)).not.toEqual(planTower(5678, tower));
  });

  it("produit exactement 20 étages, bossés aux bons paliers", () => {
    const floors = planTower(42, tower);

    expect(floors).toHaveLength(TOWER_FLOORS);
    expect(floors.map((f) => f.floor)).toEqual(
      Array.from({ length: TOWER_FLOORS }, (_, i) => i + 1),
    );
    for (const f of floors) {
      const isBoss = f.options.every((o) => o.kind === "boss");
      expect(isBoss).toBe(isBossFloor(f.floor));
    }
  });

  it("CHAQUE branche de CHAQUE étage comporte un combat — on ne monte qu'en gagnant", () => {
    for (const seed of [1, 42, 777, 99999, 2024]) {
      for (const option of all(seed)) {
        expect(["combat", "elite", "boss"]).toContain(option.kind);
        expect(option.enemyIds.length).toBeGreaterThan(0);
      }
    }
  });

  it("offre DEUX branches partout, sauf sur un boss qui n'en a qu'une", () => {
    for (const f of planTower(42, tower)) {
      expect(f.options).toHaveLength(isBossFloor(f.floor) ? 1 : 2);
    }
  });

  it("oppose toujours une voie DIRECTE à une voie à prélude", () => {
    for (const seed of [1, 42, 777, 99999]) {
      for (const f of planTower(seed, tower)) {
        if (f.options.length < 2) continue;
        const preludes = f.options.map((o) => o.prelude);
        expect(preludes.filter((x) => x === null)).toHaveLength(1);
        expect(preludes.filter((x) => x !== null)).toHaveLength(1);
      }
    }
  });

  it("un boss ne porte jamais de prélude : pas de détour au palier", () => {
    for (const option of all(2024).filter((o) => o.kind === "boss")) {
      expect(option.prelude).toBeNull();
    }
  });

  it("garantit une occasion de recruter aux deux premiers étages", () => {
    for (const seed of [1, 42, 777]) {
      const floors = planTower(seed, tower);
      for (const floor of [0, 1]) {
        expect(floors[floor].options.map((o) => o.prelude)).toContain("recruit");
      }
    }
  });

  it("ne met jamais deux fois le même ennemi dans un combat", () => {
    for (const option of all(7)) {
      expect(new Set(option.enemyIds).size).toBe(option.enemyIds.length);
    }
  });

  it("le boss d'une strate est le plus fort de son vivier, et ne resservira pas", () => {
    const bosses = all(3).filter((o) => o.kind === "boss");

    expect(new Set(bosses.map((b) => b.enemyIds[0])).size).toBe(bosses.length);

    const first = bosses[0];
    const pool = tower.byStrate[first.strate];
    expect(first.enemyIds[0]).toBe(pool[pool.length - 1]);
  });

  it("ne propose au recrutement que des personnages sous le plafond de la strate", () => {
    for (const option of all(11)) {
      for (const id of option.recruitIds) {
        expect(tower.entries[id].value).toBeLessThanOrEqual(
          RECRUIT_CAPS[option.strate],
        );
      }
    }
  });

  it("n'attache des recrues qu'aux préludes de recrutement", () => {
    for (const option of all(11)) {
      expect(option.recruitIds.length > 0).toBe(option.prelude === "recruit");
    }
  });

  it("produit tous les préludes sur l'ensemble d'une tour", () => {
    const preludes = new Set(all(2024).map((o) => o.prelude));
    for (const kind of ["recruit", "merchant", "rest", "event"]) {
      expect(preludes).toContain(kind);
    }
  });

  it("sème des élites sur la voie directe, sans en faire la norme", () => {
    const direct = all(2024).filter((o) => o.prelude === null && o.kind !== "boss");
    const elites = direct.filter((o) => o.kind === "elite");
    expect(elites.length).toBeGreaterThan(0);
    expect(elites.length).toBeLessThan(direct.length / 2);
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
