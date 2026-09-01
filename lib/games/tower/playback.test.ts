import { describe, expect, it } from "vitest";
import { simulateCombat, type CombatSetup } from "./combat";
import { NO_MODIFIERS as NEUTRAL } from "./effects";
import { snapshotAt } from "./playback";
import type { Archetype, FighterSpec } from "./types";

/**
 * Relecture du journal de combat.
 *
 * Ce module est la seule source de vérité de ce que l'interface AFFICHE. Les
 * animations en dépendent entièrement : sans `struck`, l'écran de combat
 * devrait relire le journal lui-même pour savoir qui vient de frapper — soit
 * ré-implémenter la relecture, et fatalement diverger d'elle.
 *
 * Ce sont des drapeaux d'UN SEUL TICK : un drapeau qui traînerait ferait
 * trembler une carte en continu, ou barrerait un portrait sans raison.
 */

function fighter(
  overrides: Partial<FighterSpec> & { id: string; archetype: Archetype },
): FighterSpec {
  return {
    name: overrides.id,
    side: "squad",
    hasDomain: false,
    stats: { maxHp: 5_000, strike: 20, speed: 90, flux: 1.6 },
    ...overrides,
  };
}

const SETUP: CombatSetup = {
  squad: [fighter({ id: "a", archetype: "brute" })],
  enemies: [
    fighter({
      id: "x",
      archetype: "brute",
      side: "enemy",
      stats: { maxHp: 5_000, strike: 15, speed: 70, flux: 0 },
    }),
  ],
};

/** Le premier tick où un `strike` part de `from`. */
function tickOfStrikeFrom(result: ReturnType<typeof simulateCombat>, from: string) {
  const hit = result.events.find((e) => e.kind === "strike" && e.from === from);
  if (!hit) throw new Error(`aucune frappe de ${from}`);
  return hit.t;
}

describe("qui vient de frapper", () => {
  it("marque l'ATTAQUANT au tick de son coup, pas sa victime", () => {
    const result = simulateCombat(SETUP);
    const t = tickOfStrikeFrom(result, "s0");
    const snap = snapshotAt(result, SETUP, t);

    expect(snap.squad[0].struck).toBe(true);
    // La cible encaisse : c'est `damageTaken` qui la décrit, pas `struck`.
    expect(snap.enemies[0].struck && snap.enemies[0].damageTaken > 0).toBe(false);
  });

  it("le drapeau ne dure QU'UN tick", () => {
    // Sans quoi la carte tremblerait sans fin une fois le premier coup porté.
    const result = simulateCombat(SETUP);
    const t = tickOfStrikeFrom(result, "s0");

    const before = snapshotAt(result, SETUP, t - 1);
    expect(before.squad[0].struck).toBe(false);
  });

  it("les deux camps sont marqués séparément", () => {
    const result = simulateCombat(SETUP);
    const enemyTick = tickOfStrikeFrom(result, "e0");
    const snap = snapshotAt(result, SETUP, enemyTick);

    expect(snap.enemies[0].struck).toBe(true);
  });
});

describe("coup déclenché par le joueur", () => {
  const setup: CombatSetup = {
    squad: [
      fighter({
        id: "a",
        archetype: "technique",
        stats: { maxHp: 5_000, strike: 20, speed: 1, flux: 1.6 },
      }),
    ],
    enemies: [
      fighter({
        id: "x",
        archetype: "brute",
        side: "enemy",
        stats: { maxHp: 5_000, strike: 1, speed: 1, flux: 0 },
      }),
    ],
  };

  it("barre la cible d'une technique", () => {
    const result = simulateCombat({
      ...setup,
      modifiers: { ...NEUTRAL, ENERGIE_DEPART: 100 },
      interventions: [{ tick: 4, slot: 0 }],
    });

    expect(snapshotAt(result, setup, 4).enemies[0].slashed).toBe(true);
  });

  it("ne barre RIEN sur une frappe automatique", () => {
    // C'est toute la raison d'être du drapeau : distinguer « mon escouade tape
    // toute seule » de « le bouton sur lequel je viens d'appuyer a fait ça ».
    const auto = simulateCombat(SETUP);
    const t = tickOfStrikeFrom(auto, "s0");

    expect(snapshotAt(auto, SETUP, t).enemies[0].slashed).toBe(false);
  });

  it("s'efface au tick suivant", () => {
    const result = simulateCombat({
      ...setup,
      modifiers: { ...NEUTRAL, ENERGIE_DEPART: 100 },
      interventions: [{ tick: 4, slot: 0 }],
    });

    expect(snapshotAt(result, setup, 5).enemies[0].slashed).toBe(false);
  });
});

describe("changement de cible", () => {
  it("le journal porte le focus, que l'interface relit pour son repère", () => {
    const setup: CombatSetup = {
      squad: [fighter({ id: "a", archetype: "brute", stats: { maxHp: 5_000, strike: 20, speed: 90, flux: 1 } })],
      enemies: [
        fighter({ id: "x", archetype: "brute", side: "enemy", stats: { maxHp: 5_000, strike: 1, speed: 1, flux: 0 } }),
        fighter({ id: "y", archetype: "brute", side: "enemy", stats: { maxHp: 5_000, strike: 1, speed: 1, flux: 0 } }),
      ],
      interventions: [{ tick: 3, slot: 1, kind: "focus" }],
    };

    const result = simulateCombat(setup);
    const snap = snapshotAt(result, setup, 3);

    expect(snap.events.some((e) => e.kind === "focus" && e.to === "e1")).toBe(true);
  });
});
